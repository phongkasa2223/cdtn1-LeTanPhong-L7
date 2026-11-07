/**
 * Test tích hợp xóa mềm hồ sơ (BR5, QT-13): CustomerService + repository thật + CSDL thử.
 * Mỗi test bắt đầu từ seeds/001_demo.sql nạp lại (12 hồ sơ; C000010 đã gộp vào C000011; C000001 và C000002 đang trong cặp chờ duyệt).
 */
const {
  test, before, after, beforeEach,
} = require('node:test');
const assert = require('node:assert/strict');
const {
  openTestDb, resetDb, countRows, TEST_JWT_SECRET,
} = require('../helpers/db');
const { buildServices } = require('../../src/app');

const MANAGER = {
  userId: 3, username: 'ql.hung', role: 'DATA_MANAGER', storeCode: null,
};
let pool;
let customerService;

before(async () => {
  pool = await openTestDb();
  ({ customerService } = buildServices(pool, { jwtSecret: TEST_JWT_SECRET }));
});
after(async () => {
  await pool.end();
});
beforeEach(async () => {
  await resetDb(pool);
});

const rowOf = async (code) => {
  const [[row]] = await pool.query('SELECT customer_code, phone, deleted_at FROM customer WHERE customer_code = ?', [code]);
  return row;
};

test('TC-DB4 BR5: xóa mềm trên CSDL thật, hồ sơ vẫn nằm trong bảng và tra cứu không còn thấy (luồng đúng)', async (t) => {
  const countBefore = await countRows(pool, 'customer');

  await customerService.remove('C000012');

  const countAfter = await countRows(pool, 'customer');
  const row = await rowOf('C000012');
  const listed = await customerService.list({}, MANAGER);
  t.diagnostic(`số dòng bảng customer: ${countBefore} -> ${countAfter}; C000012.deleted_at = ${row.deleted_at}; số hồ sơ còn hiện trong danh sách: ${listed.total}`);

  assert.equal(countAfter, countBefore, 'không xóa vật lý: số dòng không đổi');
  assert.ok(row.deleted_at, 'chỉ đánh dấu deleted_at');
  assert.equal(listed.total, countBefore - 1);
  await assert.rejects(() => customerService.findByPhone(row.phone, MANAGER), (err) => err.code === 'CUSTOMER_NOT_FOUND');
});

test('TC-DB5 BR5: ba luật chặn xóa mềm chạy đúng trên CSDL thật, hồ sơ bị chặn không bị đánh dấu xóa (dữ liệu sai)', async (t) => {
  const blocked = [
    ['C000011', 'CUSTOMER_HAS_MERGED'], // là hồ sơ giữ lại của C000010
    ['C000010', 'CUSTOMER_MERGED'], // đã gộp vào C000011
    ['C000001', 'CUSTOMER_IN_PENDING_PAIR'], // đang trong cặp P0001 chờ duyệt
  ];
  const lines = [];
  t.after(() => t.diagnostic(lines.join('; '))); // in cả khi test hỏng, để thấy giá trị thực tế
  for (const [code, expected] of blocked) {
    await assert.rejects(() => customerService.remove(code), (err) => err.code === expected, code);
    const row = await rowOf(code);
    lines.push(`${code} -> ${expected}, deleted_at = ${row.deleted_at}`);
    assert.equal(row.deleted_at, null, `${code} không bị đánh dấu xóa`);
  }
  assert.equal(await countRows(pool, 'customer'), 12);
});
