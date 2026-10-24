const test = require('node:test');
const assert = require('node:assert/strict');
const { ImportService, MAX_FILE_BYTES } = require('../src/services/import.service');
const { RecordValidator } = require('../src/services/record-validator');
const {
  USERS, createStore, addCustomer, makeUow, makeReadRepos,
} = require('./helpers/import-fakes');

const HEADER = 'ho_ten,so_dien_thoai,email,dia_chi,ngay_sinh,ngay_tao';
const csv = (...rows) => Buffer.from([HEADER, ...rows].join('\r\n'), 'utf8');
const LAN = { userId: 1, username: USERS[1].username, role: 'DATA_STAFF', storeCode: 'CH01' };
const MINH = { userId: 2, username: USERS[2].username, role: 'DATA_STAFF', storeCode: 'CH02' };
const MANAGER = { userId: 3, username: 'ql.hung', role: 'DATA_MANAGER', storeCode: null };

function setup(hooks = {}) {
  const store = createStore();
  const service = new ImportService({
    uow: makeUow(store, hooks),
    read: makeReadRepos(store),
    validator: RecordValidator.fromConfig(),
    now: () => new Date('2026-10-24T03:00:00Z'),
  });
  const importFile = (buffer, options = {}) => service.importFile({
    buffer, fileName: 'khach_hang.csv', source: 'RETAIL', user: LAN, ...options,
  });
  return { store, service, importFile };
}

// --- Luồng đúng ---

test('TC-I1 nhập file hợp lệ: chuẩn hóa họ tên, SĐT, email và tạo hồ sơ mới', async () => {
  const { store, importFile } = setup();
  const summary = await importFile(csv(
    '"  nguyễn   VĂN an ",+84 901 234 567,An@Gmail.com,,12/05/1990,2024-03-10',
    'Trần Thị Bích,0912345678,,"12 Lê Lợi, Q.1",,15/06/2024',
  ));
  assert.equal(summary.importId, 'I001');
  assert.equal(summary.totalRecords, 2);
  assert.equal(summary.validRecords, 2);
  assert.equal(summary.errorRecords, 0);
  assert.equal(summary.newCustomers, 2);
  assert.equal(summary.importedAt, '2026-10-24T10:00:00+07:00');
  const first = store.customers[0];
  assert.equal(first.full_name, 'Nguyễn Văn An');
  assert.equal(first.phone, '0901234567');
  assert.equal(first.email, 'an@gmail.com');
  assert.equal(first.birth_date, '1990-05-12');
});

test('TC-I2 BR3: dòng lỗi được ghi mã lỗi theo từng quy tắc và chưa vào danh sách khách hàng', async () => {
  const { store, importFile } = setup();
  const summary = await importFile(csv(
    'An Một,09012345,,,,2024-03-10',          // SĐT thiếu số
    ',0912345678,,,,2024-03-10',              // thiếu họ tên
    'Cả Ba,0112345678,sai-email,,31/02/2024,2024-03-10', // đầu số lạ, email sai, ngày sai
    'Hợp Lệ,0987654321,,,,2024-03-10',
  ));
  assert.equal(summary.totalRecords, 4);
  assert.equal(summary.validRecords, 1);
  assert.equal(summary.errorRecords, 3);
  assert.deepEqual(summary.errorsByCode, {
    MISSING_FIELD: 1, PHONE_LENGTH: 1, PHONE_PREFIX: 1, PHONE_CHAR: 0, EMAIL_INVALID: 1, DATE_INVALID: 1,
  });
  assert.equal(store.customers.length, 1);
  assert.deepEqual(store.stg.map((s) => s.customer_id), [null, null, null, 1]);
  assert.equal(store.dq.length, 5);
});

// --- QT-01: SĐT duy nhất ---

test('TC-I3 QT-01: SĐT đã có (viết khác dạng) thì gắn vào hồ sơ có sẵn, không tạo hồ sơ mới', async () => {
  const { store, importFile } = setup();
  const existing = addCustomer(store, { fullName: 'Nguyễn Văn An', phone: '0901234567' });
  const summary = await importFile(csv('Người Khác,84901234567,,,,2024-03-10'));
  assert.equal(summary.newCustomers, 0);
  assert.equal(summary.attachedRecords, 1);
  assert.equal(store.customers.length, 1);
  assert.equal(store.stg[0].customer_id, existing);
});

test('TC-I4 QT-01 + QT-13: SĐT của hồ sơ đã gộp thì gắn vào hồ sơ giữ lại', async () => {
  const { store, importFile } = setup();
  const keeper = addCustomer(store, { fullName: 'Lê Hoàng Nam', phone: '0932111222' });
  addCustomer(store, { fullName: 'Le Hoang Nam', phone: '0976333444', mergedInto: keeper });
  await importFile(csv('Lê Hoàng Nam,0976 333 444,,,,2024-03-10'));
  assert.equal(store.stg[0].customer_id, keeper);
  assert.equal(store.customers.length, 2);
});

test('TC-I5 hai dòng cùng SĐT trong một file thì chỉ tạo một hồ sơ, cả hai dòng gắn vào hồ sơ đó', async () => {
  const { store, importFile } = setup();
  const summary = await importFile(csv(
    'Võ Thị Mai,0789456123,,,,2024-03-10',
    'VÕ THỊ MAI,078 945 6123,,,,2025-01-05',
  ));
  assert.equal(summary.newCustomers, 1);
  assert.equal(summary.attachedRecords, 1);
  assert.equal(store.stg[0].customer_id, store.stg[1].customer_id);
});

// --- Cặp nghi trùng ---

test('TC-I6 tạo cặp nghi trùng khi khác SĐT nhưng cùng email, hoặc cùng họ tên và ngày sinh', async () => {
  const { store, importFile } = setup();
  const summary = await importFile(csv(
    'Nguyễn Văn An,0901234567,an@gmail.com,,,2024-03-10',
    'Nguyen Van An,0987654321,an@gmail.com,,,2025-01-15',
    'Bùi Anh Khoa,0765432198,,,14/09/1993,2024-10-05',
    'BÙI ANH KHOA,0765432199,khoa@gmail.com,,1993-09-14,2024-11-01',
    'Phạm Quốc Huy,0368123456,,,,2024-09-17',
  ));
  assert.equal(summary.newDuplicatePairs, 2);
  assert.deepEqual(store.pairs.map((p) => p.matched_by).sort(), ['EMAIL', 'NAME_BIRTHDATE']);
  assert.ok(store.pairs.every((p) => p.customer_a_id < p.customer_b_id && p.similarity === 1));
});

// --- NFR3: lỗi giữa chừng ---

test('TC-I7 NFR3: lỗi giữa chừng khi lưu thì 0 bản ghi của file được lưu và không có lần nhập dở dang', async () => {
  const { store, importFile } = setup({ failOnStgInsert: true });
  await assert.rejects(
    () => importFile(csv('An,0901234567,,,,2024-03-10', 'Bình,0912345678,,,,2024-03-10')),
    (err) => err.code === 'IMPORT_FAILED' && /mất kết nối/.test(err.cause.message),
  );
  for (const table of ['batches', 'customers', 'stg', 'dq', 'pairs']) {
    assert.equal(store[table].length, 0, `bảng ${table} phải rỗng`);
  }
});

// --- Luồng ngoại lệ của UC1 ---

test('TC-I8 file bị từ chối thì không tạo lần nhập nào (UC1-3a, 3b, 4a)', async () => {
  const cases = [
    ['sai đuôi file', () => ({ fileName: 'khach_hang.xlsx' }), csv('A,0901234567,,,,2024-03-10'), 'INVALID_FILE_TYPE'],
    ['quá 5 MB (biên)', () => ({}), Buffer.alloc(MAX_FILE_BYTES + 1, 'a'), 'FILE_TOO_LARGE'],
    ['thiếu cột', () => ({}), Buffer.from('ho_ten,email\r\nA,a@b.vn'), 'MISSING_COLUMNS'],
    ['không có dòng dữ liệu', () => ({}), Buffer.from(`${HEADER}\r\n`), 'EMPTY_FILE'],
    ['nguồn sai', () => ({ source: 'ONLINE' }), csv('A,0901234567,,,,2024-03-10'), 'INVALID_SOURCE'],
  ];
  for (const [label, options, buffer, code] of cases) {
    const { store, importFile } = setup();
    await assert.rejects(() => importFile(buffer, options()), (err) => err.code === code, label);
    assert.equal(store.batches.length, 0, label);
  }
});

test('TC-I9 thiếu cột thì báo rõ tên các cột còn thiếu', async () => {
  const { importFile } = setup();
  await assert.rejects(
    () => importFile(Buffer.from('ho_ten,email,ngay_tao\r\nA,a@b.vn,2024-03-10')),
    (err) => err.code === 'MISSING_COLUMNS' && err.details.join() === 'so_dien_thoai,dia_chi,ngay_sinh',
  );
});

test('TC-I10 file xuất từ Excel: có BOM và phân cách dấu chấm phẩy vẫn đọc được', async () => {
  const { store, importFile } = setup();
  const excel = Buffer.from(`﻿${HEADER.replace(/,/g, ';')}\r\nHoàng Thu Hà;0583777888;;;;2025-05-30\r\n`, 'utf8');
  const summary = await importFile(excel);
  assert.equal(summary.validRecords, 1);
  assert.equal(store.customers[0].phone, '0583777888');
});

// --- E3: bản ghi lỗi (FR4, QT-14) ---

async function withErrors() {
  const ctx = setup();
  await ctx.importFile(csv(
    'An,09012345,,,,2024-03-10',
    'Bình,0912345678,,,,2024-03-10',
    ',0112345678,,,,2024-03-10',
  ));
  return ctx;
}

test('TC-E1 bản ghi lỗi có đủ giá trị gốc, giá trị chuẩn hóa và danh sách lỗi; lọc theo mã lỗi', async () => {
  const { service } = await withErrors();
  const all = await service.errors('I001', {}, LAN);
  assert.equal(all.total, 2);
  assert.deepEqual(all.items.map((i) => i.rowNumber), [1, 3]);
  assert.equal(all.items[0].original.so_dien_thoai, '09012345');
  assert.equal(all.items[0].errors[0].code, 'PHONE_LENGTH');
  const filtered = await service.errors('I001', { code: 'PHONE_PREFIX' }, LAN);
  assert.equal(filtered.total, 1);
  assert.equal(filtered.items[0].rowNumber, 3);
  assert.equal(filtered.items[0].errors.length, 2); // dòng 3 còn lỗi thiếu họ tên
});

test('TC-E2 phân trang: size 1 trả đúng một dòng và tổng số; lần nhập không lỗi trả danh sách rỗng', async () => {
  const { service, importFile } = await withErrors();
  const page = await service.errors('I001', { page: '2', size: '1' }, LAN);
  assert.equal(page.items.length, 1);
  assert.equal(page.total, 2);
  assert.equal(page.items[0].rowNumber, 3);
  await importFile(csv('Chị Lan,0368123456,,,,2024-03-10'));
  const clean = await service.errors('I002', {}, LAN);
  assert.deepEqual(clean.items, []);
  assert.equal(clean.total, 0);
});

test('TC-E3 mã lỗi sai, trang sai và lần nhập không tồn tại bị từ chối đúng mã', async () => {
  const { service } = await withErrors();
  await assert.rejects(() => service.errors('I001', { code: 'ABC' }, LAN), (e) => e.code === 'INVALID_ERROR_CODE');
  await assert.rejects(() => service.errors('I001', { size: '101' }, LAN), (e) => e.code === 'INVALID_PAGE');
  await assert.rejects(() => service.errors('I999', {}, LAN), (e) => e.code === 'IMPORT_NOT_FOUND');
});

test('TC-E4 QT-14: nhân viên cửa hàng khác không thấy lần nhập (404), quản lý thấy toàn công ty', async () => {
  const { service } = await withErrors();
  await assert.rejects(() => service.errors('I001', {}, MINH), (e) => e.code === 'IMPORT_NOT_FOUND');
  assert.equal((await service.errors('I001', {}, MANAGER)).total, 2);
});
