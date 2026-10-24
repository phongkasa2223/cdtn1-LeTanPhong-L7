const { AppError } = require('../errors/AppError');
const { storeScope } = require('./access-scope');
const { parsePaging } = require('./paging');
const { viewPhone } = require('./customer.contract');
const { toIsoOffset } = require('./import.contract');
const {
  FIELDS, sideOf, differentFields, toPairListItemView, toPairDetailView,
} = require('./pair.contract');

const STATUSES = ['PENDING', 'MERGED', 'KEEP_SEPARATE'];
const ACTIONS = ['MERGE', 'KEEP_SEPARATE'];

// SĐT tạm trong lúc hoán đổi, không bao giờ trùng SĐT thật (SĐT thật chỉ gồm chữ số).
const tempPhone = (customerId) => `~${customerId}`;

const notFound = (code) => new AppError('PAIR_NOT_FOUND', `Không tìm thấy cặp nghi trùng ${code}.`);

/** Dòng bảng customer -> hồ sơ cùng dạng với sideOf (để so sánh các trường). */
const customerOf = (row) => ({
  id: row.customer_id,
  code: row.customer_code,
  fullName: row.full_name,
  phone: row.phone,
  email: row.email ?? null,
  address: row.address ?? null,
  birthDate: row.birth_date ?? null,
  mergedInto: row.merged_into_id ?? null,
});

/** Duyệt cặp hồ sơ nghi trùng (UC5): xem danh sách, xem chi tiết, quyết định Gộp / Giữ riêng. */
class DuplicateService {
  constructor({ uow, read }) {
    this.uow = uow;
    this.read = read;
  }

  /** Mặc định lấy các cặp chờ duyệt, điểm tương đồng cao trước; nhân viên chỉ thấy đơn vị mình (QT-14). */
  async list(query, user) {
    const status = query?.status === undefined || query.status === '' ? 'PENDING' : query.status;
    if (!STATUSES.includes(status)) {
      throw new AppError('INVALID_STATUS', `status phải thuộc: ${STATUSES.join(', ')}.`);
    }
    const { page, size } = parsePaging(query, 20);
    const { rows, total } = await this.read.pairs.list({ status, page, size, scope: storeScope(user) });
    return { page, size, total, items: rows.map((row) => toPairListItemView(row, user)) };
  }

  async get(pairCode, user) {
    const row = await this.read.pairs.findByCode(pairCode, storeScope(user));
    if (!row) throw notFound(pairCode);
    return toPairDetailView(row, user);
  }

  /**
   * @param {string} pairCode mã cặp (P0007)
   * @param {{action: string, keepCustomerId?: string, fieldChoices?: object}} body
   * @throws {AppError} INVALID_ACTION, KEEP_ID_REQUIRED, KEEP_ID_NOT_IN_PAIR, FIELD_CHOICE_REQUIRED,
   *   PAIR_NOT_FOUND, PAIR_ALREADY_DECIDED (BR4), CUSTOMER_MERGED
   */
  async decide(pairCode, body, user) {
    const action = body?.action;
    if (!ACTIONS.includes(action)) throw new AppError('INVALID_ACTION', 'action phải là MERGE hoặc KEEP_SEPARATE.');

    // Toàn bộ quyết định (cập nhật cặp và hồ sơ) trong một giao dịch: lỗi ở bước nào cũng không lưu gì.
    return this.uow.run(async (repos) => {
      const scope = storeScope(user);
      const pair = await repos.pairs.findByCode(pairCode, scope);
      if (!pair) throw notFound(pairCode);
      if (pair.status !== 'PENDING') throw this.alreadyDecided(pair);

      if (action === 'KEEP_SEPARATE') {
        await this.claim(repos, pair, 'KEEP_SEPARATE', user);
        const done = await repos.pairs.findByCode(pairCode, scope);
        return {
          pairId: done.pair_code,
          status: done.status,
          decidedBy: done.decided_by_name,
          decidedAt: toIsoOffset(done.decided_at),
        };
      }
      return this.merge(repos, pair, body, user);
    });
  }

  alreadyDecided(pair) {
    return new AppError('PAIR_ALREADY_DECIDED', `Cặp ${pair.pair_code} đã được xử lý.`);
  }

  /**
   * BR4: mỗi cặp chỉ được quyết định một lần. Cập nhật có điều kiện status = PENDING:
   * 0 dòng bị đổi nghĩa là một nhân viên khác đã quyết định trước (kể cả khi hai người bấm cùng lúc).
   */
  async claim(repos, pair, status, user) {
    const won = await repos.pairs.decide(pair.pair_id, { status, userId: user.userId });
    if (!won) throw this.alreadyDecided(pair);
  }

  async merge(repos, pair, body, user) {
    const a = sideOf(pair, 'a');
    const b = sideOf(pair, 'b');
    const keepCode = body.keepCustomerId;
    if (!keepCode) throw new AppError('KEEP_ID_REQUIRED', 'Chọn hồ sơ giữ lại (keepCustomerId).');
    if (![a.code, b.code].includes(keepCode)) {
      throw new AppError('KEEP_ID_NOT_IN_PAIR', `${keepCode} không thuộc cặp ${pair.pair_code}.`);
    }

    // Đọc lại hai hồ sơ có khóa dòng để quyết định trên dữ liệu mới nhất.
    const locked = await repos.customers.lockByIds([a.id, b.id]);
    const keepId = keepCode === a.code ? a.id : b.id;
    const keeper = customerOf(locked.find((row) => row.customer_id === keepId));
    const other = customerOf(locked.find((row) => row.customer_id !== keepId));
    if (keeper.mergedInto || other.mergedInto) {
      throw new AppError('CUSTOMER_MERGED', 'Một trong hai hồ sơ đã gộp ở cặp khác, cặp này không còn hiệu lực.');
    }

    // UC5-5a: trường hai bên cùng có giá trị mà khác nhau thì bắt buộc chọn giá trị giữ lại.
    const different = differentFields(keeper, other);
    const choices = body.fieldChoices || {};
    const missing = different.filter((field) => ![keeper.code, other.code].includes(choices[field]));
    if (missing.length) {
      throw new AppError('FIELD_CHOICE_REQUIRED',
        `Chọn giá trị giữ lại cho các trường khác nhau: ${missing.join(', ')}.`, missing);
    }

    await this.claim(repos, pair, 'MERGED', user);

    const result = {};
    for (const field of FIELDS) {
      if (different.includes(field)) {
        result[field] = (choices[field] === keeper.code ? keeper : other)[field];
      } else {
        // US5-AC1: trường còn trống của hồ sơ giữ lại được bổ sung từ hồ sơ kia.
        result[field] = keeper[field] ?? other[field] ?? null;
      }
    }

    // BR5/QT-13: hồ sơ bị gộp không xóa, chỉ trỏ tới hồ sơ giữ lại. Nếu người dùng chọn SĐT của hồ sơ bị gộp
    // thì hai hồ sơ hoán đổi SĐT (qua một SĐT tạm), vì SĐT là duy nhất (QT-01). Tra bằng SĐT nào cũng ra hồ sơ giữ lại.
    const swapsPhone = result.phone === other.phone;
    if (swapsPhone) await repos.customers.setPhone(other.id, tempPhone(other.id));
    await repos.customers.update(keeper.id, result);
    await repos.customers.markMerged(other.id, keeper.id, swapsPhone ? keeper.phone : undefined);

    const done = await repos.pairs.findByCode(pair.pair_code, storeScope(user));
    return {
      pairId: done.pair_code,
      status: 'MERGED',
      survivingCustomerId: keeper.code,
      mergedCustomerId: other.code,
      result: {
        fullName: result.fullName,
        phone: viewPhone(result.phone, user),
        email: result.email,
        address: result.address,
      },
      decidedBy: done.decided_by_name,
      decidedAt: toIsoOffset(done.decided_at),
    };
  }
}

module.exports = { DuplicateService };
