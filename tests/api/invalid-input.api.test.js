/**
 * Test API dữ liệu sai: lỗi của người gọi phải ra đúng nhóm 400, 404 hoặc 409 kèm mã và thông báo, không để lại bản ghi,
 * và không bao giờ là 500. Mỗi test bắt đầu từ seeds/001_demo.sql nạp lại.
 */
const {
  test, before, after, beforeEach, afterEach,
} = require('node:test');
const assert = require('node:assert/strict');
const { openTestDb, resetDb, snapshotCounts } = require('../helpers/db');
const { startApi } = require('../helpers/api');

let pool;
let api;

before(async () => {
  pool = await openTestDb();
});
after(async () => {
  await pool.end();
});
beforeEach(async () => {
  await resetDb(pool);
  api = await startApi(pool);
});
afterEach(async () => {
  await api.close();
});

test('TC-API3 dữ liệu sai: trả đúng 400, 404, 409 kèm mã và thông báo, không để lại bản ghi, không bao giờ 500 (dữ liệu sai)', async (t) => {
  const staff = await api.login('nv.lan');
  const countsBefore = await snapshotCounts(pool);
  const lines = [];
  const statuses = [];
  t.after(() => lines.forEach((line) => t.diagnostic(line))); // in cả khi test hỏng, để thấy giá trị thực tế

  const expectError = (label, response, status, code) => {
    statuses.push(response.status);
    lines.push(`${label} -> ${response.status} ${response.data?.error?.code ?? ''}`);
    assert.equal(response.status, status, label);
    assert.equal(response.data.error.code, code, label);
  };
  const postCustomer = (json) => api.call('POST', '/api/customers', { token: staff, json });

  // 400: SĐT sai độ dài, kiểm cả trường lỗi, mã lỗi và thông báo.
  const badPhone = await postCustomer({ fullName: 'Phạm Thu', phone: '090123' });
  expectError('SĐT 6 chữ số', badPhone, 400, 'VALIDATION_ERROR');
  assert.deepEqual(badPhone.data.error.details.map((d) => [d.field, d.code]), [['phone', 'PHONE_LENGTH']]);
  assert.match(badPhone.data.error.details[0].message, /10 chữ số/);
  lines.push(`  thông báo: ${badPhone.data.error.details[0].message}`);

  expectError('thiếu họ tên', await postCustomer({ phone: '0904111222' }), 400, 'VALIDATION_ERROR');
  expectError('họ tên kiểu số', await postCustomer({ fullName: 12345, phone: '0904111222' }), 400, 'VALIDATION_ERROR');
  expectError('trùng SĐT hồ sơ C000001', await postCustomer({ fullName: 'Người Khác', phone: '0901234567' }), 409, 'DUPLICATE_PHONE');
  expectError('hồ sơ không tồn tại', await api.call('GET', '/api/customers/C999999', { token: staff }), 404, 'CUSTOMER_NOT_FOUND');
  expectError('size=0', await api.call('GET', '/api/customers?size=0', { token: staff }), 400, 'INVALID_PAGE');
  expectError('size=101', await api.call('GET', '/api/customers?size=101', { token: staff }), 400, 'INVALID_PAGE');
  expectError('page=-1', await api.call('GET', '/api/customers?page=-1', { token: staff }), 400, 'INVALID_PAGE');
  expectError('tra SĐT không hợp lệ', await api.call('GET', '/api/customers?phone=abc', { token: staff }), 400, 'VALIDATION_ERROR');
  expectError('nhập file mà không chọn file', await api.call('POST', '/api/imports', { token: staff }), 400, 'INVALID_FILE_TYPE');
  expectError(
    'đăng nhập với username kiểu số, password kiểu mảng',
    await api.call('POST', '/api/auth/login', { json: { username: 123, password: ['a'] } }),
    400,
    'VALIDATION_ERROR',
  );
  expectError(
    'JSON hỏng',
    await api.call('POST', '/api/customers', { token: staff, rawBody: '{"fullName":', headers: { 'Content-Type': 'application/json' } }),
    400,
    'INVALID_JSON',
  );

  const countsAfter = await snapshotCounts(pool);
  lines.push(`mã trạng thái đã gặp: ${[...new Set(statuses)].join(', ')}; số dòng các bảng trước và sau giống nhau: ${JSON.stringify(countsAfter) === JSON.stringify(countsBefore)}`);
  assert.ok(statuses.every((status) => status < 500), 'không có lỗi 5xx');
  assert.deepEqual(countsAfter, countsBefore, 'không bản ghi nào được thêm');
});
