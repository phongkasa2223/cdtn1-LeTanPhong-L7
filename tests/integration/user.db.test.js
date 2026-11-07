/**
 * Test tích hợp quản lý tài khoản: UserService + repository thật + CSDL thử, để thấy cả các tình huống chỉ lộ ra khi
 * hai thao tác chồng nhau trên cùng một CSDL (test đơn vị với repository giả không thấy được).
 * Mỗi vòng bắt đầu từ seeds/001_demo.sql nạp lại (một Quản lý dữ liệu duy nhất: ql.hung, user_id 3).
 */
const {
  test, before, after, beforeEach,
} = require('node:test');
const assert = require('node:assert/strict');
const {
  openTestDb, resetDb, TEST_JWT_SECRET,
} = require('../helpers/db');
const { buildServices } = require('../../src/app');

const SEED_MANAGER_ID = 3;
let pool;
let userService;

before(async () => {
  pool = await openTestDb();
  ({ userService } = buildServices(pool, { jwtSecret: TEST_JWT_SECRET }));
});
after(async () => {
  await pool.end();
});
beforeEach(async () => {
  await resetDb(pool);
});

async function managerCount() {
  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM app_user WHERE role = 'DATA_MANAGER'");
  return Number(total);
}

test('TC-DB6 hai Quản lý xóa nhau cùng lúc: luôn còn ít nhất một Quản lý (chất lượng dữ liệu)', async (t) => {
  const rounds = 10;
  const lines = [];
  t.after(() => lines.forEach((line) => t.diagnostic(line))); // in cả khi test hỏng, để thấy giá trị thực tế
  for (let round = 1; round <= rounds; round += 1) {
    await resetDb(pool);
    const second = await userService.create({
      username: `ql.vong${round}`, password: 'MatKhau123', fullName: 'Quan Ly Hai', role: 'DATA_MANAGER',
    });
    // Mỗi Quản lý xóa người còn lại, hai yêu cầu chạy chồng nhau.
    const results = await Promise.allSettled([
      userService.remove(second.userId, { userId: SEED_MANAGER_ID }),
      userService.remove(SEED_MANAGER_ID, { userId: second.userId }),
    ]);
    const remaining = await managerCount();
    const outcome = results.map((r) => (r.status === 'fulfilled' ? 'xóa được' : r.reason.code)).join(' / ');
    lines.push(`vòng ${round}: hai yêu cầu xóa nhau -> ${outcome}; còn ${remaining} Quản lý`);
    assert.ok(remaining >= 1, `vòng ${round}: còn ${remaining} Quản lý`);
  }
});
