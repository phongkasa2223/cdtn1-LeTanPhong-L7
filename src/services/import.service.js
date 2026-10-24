const { parse } = require('csv-parse/sync');
const { AppError } = require('../errors/AppError');
const { storeScope } = require('./access-scope');
const { parsePaging } = require('./paging');
const { nameSimilarity } = require('./similarity');
const {
  RULE_CODES, emptyErrorsByCode, toImportSummaryView, toImportListItemView, toErrorRecordView,
} = require('./import.contract');

const MAX_FILE_BYTES = 5 * 1024 * 1024; // BR8
const SOURCES = ['RETAIL', 'WARRANTY'];
const REQUIRED_COLUMNS = ['ho_ten', 'so_dien_thoai', 'email', 'dia_chi', 'ngay_sinh', 'ngay_tao']; // BR8
// Độ rộng các cột raw_* của stg_customer: giá trị gốc dài hơn thì cắt, không để lỗi CSDL làm hỏng cả lần nhập.
const RAW_WIDTH = {
  fullName: 255, phone: 50, email: 255, address: 255, birthDate: 30, createdDate: 30,
};

const clip = (value, width) => (value === undefined || value === null || value === '' ? null : String(value).slice(0, width));

/** Đọc CSV (UTF-8, có hoặc không BOM; phân cách dấu phẩy hoặc chấm phẩy như file xuất từ Excel). */
function parseCsv(buffer) {
  const text = buffer.toString('utf8');
  const firstLine = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0];
  const delimiter = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  let header = [];
  try {
    const rows = parse(text, {
      bom: true,
      delimiter,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      columns: (h) => {
        header = h.map((name) => String(name).trim().toLowerCase());
        return header;
      },
    });
    return { header, rows };
  } catch (err) {
    throw new AppError('INVALID_FILE_TYPE', 'Không đọc được file dưới dạng CSV.', undefined, { cause: err });
  }
}

/** Gộp các cặp tìm được: mỗi cặp hai hồ sơ chỉ một dòng, ưu tiên khớp theo email, kèm điểm tương đồng họ tên. */
function scorePairs(candidates) {
  const byKey = new Map();
  for (const c of candidates) {
    const [lo, hi] = c.aId < c.bId ? [c.aId, c.bId] : [c.bId, c.aId];
    const key = `${lo}-${hi}`;
    const known = byKey.get(key);
    if (known && (known.matchedBy === 'EMAIL' || c.matchedBy !== 'EMAIL')) continue;
    byKey.set(key, {
      aId: lo,
      bId: hi,
      matchedBy: c.matchedBy,
      similarity: Math.round(nameSimilarity(c.aName, c.bName) * 100) / 100,
    });
  }
  return [...byKey.values()];
}

/**
 * Nhập file CSV khách hàng (UC1) và tra cứu lần nhập, bản ghi lỗi (UC2, UC3).
 * `uow` chạy phần lưu trong MỘT giao dịch (NFR3); `read` là các repository đọc ngoài giao dịch.
 */
class ImportService {
  constructor({ uow, read, validator, now = () => new Date() }) {
    this.uow = uow;
    this.read = read;
    this.validator = validator;
    this.now = now;
  }

  /**
   * @param {{buffer: Buffer, fileName: string, source: string, user: object}} input
   * @returns tóm tắt lần nhập (hợp đồng E2)
   * @throws {AppError} INVALID_SOURCE, INVALID_FILE_TYPE, FILE_TOO_LARGE, MISSING_COLUMNS, EMPTY_FILE,
   *   IMPORT_FAILED (lỗi khi lưu: đã hủy toàn bộ, 0 bản ghi được lưu)
   */
  async importFile({ buffer, fileName, source, user }) {
    if (!SOURCES.includes(source)) throw new AppError('INVALID_SOURCE', 'Nguồn phải là RETAIL hoặc WARRANTY.');
    if (!buffer || !/\.csv$/i.test(fileName || '')) throw new AppError('INVALID_FILE_TYPE', 'Chỉ nhận file có đuôi .csv.');
    if (buffer.length > MAX_FILE_BYTES) throw new AppError('FILE_TOO_LARGE', 'File lớn hơn 5 MB.');

    const { header, rows } = parseCsv(buffer);
    const missing = REQUIRED_COLUMNS.filter((name) => !header.includes(name));
    if (missing.length) {
      throw new AppError('MISSING_COLUMNS', `File thiếu cột bắt buộc: ${missing.join(', ')}.`, missing);
    }
    if (!rows.length) throw new AppError('EMPTY_FILE', 'File không có dòng dữ liệu.');

    const today = this.now();
    const records = rows.map((row, index) => ({
      rowNo: index + 1, row, check: this.validator.checkRecord(row, today),
    }));
    try {
      return await this.uow.run((repos) => this.save(repos, { records, fileName, source, user }));
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('IMPORT_FAILED', 'Lỗi khi lưu, đã hủy toàn bộ lần nhập. Vui lòng thử lại.',
        undefined, { cause: err });
    }
  }

  /** Toàn bộ thao tác ghi của một lần nhập. Chạy trong giao dịch: lỗi ở bất kỳ bước nào thì không lưu gì. */
  async save(repos, { records, fileName, source, user }) {
    const batch = await repos.batches.create({ source, fileName, userId: user.userId });

    // QT-01: SĐT đã có thì gắn vào hồ sơ có sẵn; chưa có thì tạo mới (dòng đầu của file tạo, các dòng sau gắn vào).
    const valid = records.filter((r) => r.check.customer);
    const customerIds = await repos.customers.findIdsByPhones([...new Set(valid.map((r) => r.check.customer.phone))]);
    const creating = new Set();
    const newCustomers = [];
    for (const r of valid) {
      const { phone } = r.check.customer;
      if (customerIds.has(phone) || creating.has(phone)) continue;
      creating.add(phone);
      newCustomers.push(r.check.customer);
    }
    await repos.customers.insertMany(newCustomers);
    const created = await repos.customers.findIdsByPhones([...creating]);
    created.forEach((id, phone) => customerIds.set(phone, id));

    const stgIds = await repos.stg.insertMany(batch.id, records.map((r) => ({
      rowNo: r.rowNo,
      raw: {
        fullName: clip(r.row.ho_ten, RAW_WIDTH.fullName),
        phone: clip(r.row.so_dien_thoai, RAW_WIDTH.phone),
        email: clip(r.row.email, RAW_WIDTH.email),
        address: clip(r.row.dia_chi, RAW_WIDTH.address),
        birthDate: clip(r.row.ngay_sinh, RAW_WIDTH.birthDate),
        createdDate: clip(r.row.ngay_tao, RAW_WIDTH.createdDate),
      },
      normalized: r.check.normalized,
      customerId: r.check.customer ? customerIds.get(r.check.customer.phone) : null, // BR3: dòng lỗi chưa vào danh sách khách hàng
    })));

    const byCode = emptyErrorsByCode();
    const errorRows = [];
    for (const r of records) {
      for (const e of r.check.errors) {
        errorRows.push({ stgCustomerId: stgIds.get(r.rowNo), ruleCode: e.code, fieldName: e.field, message: e.message });
        byCode[e.code] += 1;
      }
    }
    await repos.dq.insertMany(errorRows);

    const candidates = await repos.customers.findDuplicateCandidates([...created.values()]);
    await repos.pairs.insertMany(batch.id, scorePairs(candidates));

    return toImportSummaryView({
      batch,
      username: user.username,
      source,
      fileName,
      counts: {
        total: records.length,
        valid: valid.length,
        byCode,
        newCustomers: newCustomers.length,
        attached: valid.length - newCustomers.length,
        newPairs: await repos.pairs.countByBatch(batch.id),
      },
    });
  }

  /** Danh sách lần nhập, mới nhất trước; nhân viên chỉ thấy của đơn vị mình (FR3, QT-14). */
  async list(query, user) {
    const { page, size } = parsePaging(query, 20);
    const { rows, total } = await this.read.batches.list({ page, size, scope: storeScope(user) });
    return { page, size, total, items: rows.map(toImportListItemView) };
  }

  /** Bản ghi còn lỗi của một lần nhập, lọc theo mã quy tắc, phân trang (FR4, QT-14). */
  async errors(importCode, query, user) {
    const code = query?.code === undefined || query.code === '' ? null : query.code;
    if (code !== null && !RULE_CODES.includes(code)) {
      throw new AppError('INVALID_ERROR_CODE', `Mã lỗi phải thuộc: ${RULE_CODES.join(', ')}.`);
    }
    const { page, size } = parsePaging(query, 50);
    const batch = await this.read.batches.findByCode(importCode, storeScope(user));
    if (!batch) throw new AppError('IMPORT_NOT_FOUND', `Không tìm thấy lần nhập ${importCode}.`);

    const { rows, total } = await this.read.stg.listErrorRecords({ batchId: batch.import_batch_id, code, page, size });
    const errors = await this.read.dq.listUnresolvedByStgIds(rows.map((r) => r.stg_customer_id));
    const items = rows.map((row) => toErrorRecordView(row, errors.filter((e) => e.stg_customer_id === row.stg_customer_id)));
    return { importId: batch.import_code, code, page, size, total, items };
  }
}

module.exports = { ImportService, MAX_FILE_BYTES, scorePairs };
