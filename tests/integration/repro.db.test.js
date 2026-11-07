/**
 * Test tái lập (C8): chạy lại migration và seed lần hai trên CSDL thử thì không lỗi và không nhân đôi dữ liệu.
 */
const {
  test, before, after, beforeEach,
} = require('node:test');
const assert = require('node:assert/strict');
const {
  openTestDb, resetDb, snapshotCounts, testDbName,
} = require('../helpers/db');
const { runSqlDir } = require('../../scripts/run-sql');

let pool;

before(async () => {
  pool = await openTestDb();
});
after(async () => {
  await pool.end();
});
beforeEach(async () => {
  await resetDb(pool); // xóa sạch rồi nạp seeds lần 1
});

test('TC-DB3 tái lập: chạy lại migration và seed lần hai không lỗi và không nhân đôi dữ liệu', async (t) => {
  const database = testDbName();
  const first = await snapshotCounts(pool);

  const migrations = await runSqlDir('migrations', { database });
  const seeds = await runSqlDir('seeds', { database });
  const second = await snapshotCounts(pool);

  t.diagnostic(`đã chạy lại: ${[...migrations, ...seeds].join(', ')}`);
  t.diagnostic(`số dòng sau lần 1: ${JSON.stringify(first)}`);
  t.diagnostic(`số dòng sau lần 2: ${JSON.stringify(second)}`);
  assert.deepEqual(first, {
    dq_result: 1, stg_customer: 2, duplicate_pair: 2, import_batch: 2, customer: 12, app_user: 3,
  });
  assert.deepEqual(second, first);
});
