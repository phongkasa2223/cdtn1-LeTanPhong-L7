/**
 * Hạ tầng cho test chạm CSDL thật (tích hợp và API): nối CSDL thử, dựng bảng, đưa dữ liệu về trạng thái ban đầu.
 * CSDL thử tách riêng với CSDL chạy thật (mặc định <DB_NAME>_test, do `npm run db:setup` tạo) vì mỗi test
 * xóa sạch dữ liệu rồi nạp lại seeds/001_demo.sql: 3 tài khoản, 12 hồ sơ, 2 lần nhập, 2 cặp nghi trùng.
 */
const path = require('node:path');
const { createPool } = require('../../src/db');
const { runSqlDir } = require('../../scripts/run-sql');

try {
  process.loadEnvFile(path.resolve(__dirname, '..', '..', '.env'));
} catch {
  // Không có .env (máy mới clone, CI): dùng biến môi trường của shell.
}

// Đủ 6 bảng của migrations/001_init.sql.
const TABLES = ['dq_result', 'stg_customer', 'duplicate_pair', 'import_batch', 'customer', 'app_user'];
const TEST_JWT_SECRET = 'khoa-jwt-chi-dung-trong-test-123456'; // AuthService đòi từ 16 ký tự; chỉ dùng trong test

function testDbName() {
  const name = process.env.TEST_DB_NAME || `${process.env.DB_NAME || 'mekong_dq'}_test`;
  if (!/^\w+_test$/.test(name)) {
    throw new Error(`Tên CSDL thử phải kết thúc bằng _test để không dọn nhầm CSDL thật (nhận được "${name}").`);
  }
  return name;
}

/**
 * Nối CSDL thử và bảo đảm đã có đủ bảng (migration chạy lại được).
 * Không nối được thì báo lỗi kèm cách khắc phục, không bỏ qua test để khỏi có kết quả xanh giả.
 */
async function openTestDb() {
  const database = testDbName();
  const pool = createPool({ database });
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    await pool.end();
    throw new Error(
      `Không nối được CSDL thử "${database}" (${err.code || err.message}). `
      + 'Hãy bật MariaDB/MySQL và chạy npm run db:setup rồi thử lại.',
      { cause: err },
    );
  }
  await runSqlDir('migrations', { database });
  return pool;
}

/** Đưa CSDL thử về trạng thái ban đầu: xóa sạch 6 bảng rồi nạp seeds. Từ chối chạy nếu không phải CSDL *_test. */
async function resetDb(pool, { seed = true } = {}) {
  const conn = await pool.getConnection();
  try {
    const [[{ name }]] = await conn.query('SELECT DATABASE() AS name');
    if (!/_test$/.test(name)) {
      throw new Error(`Từ chối xóa dữ liệu của CSDL "${name}": không phải CSDL thử (*_test).`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of TABLES) await conn.query(`TRUNCATE TABLE ${table}`);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    conn.release();
  }
  if (seed) await runSqlDir('seeds', { database: testDbName() });
}

async function countRows(pool, table) {
  if (!TABLES.includes(table)) throw new Error(`Bảng không hợp lệ: ${table}`);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ${table}`);
  return Number(total);
}

/** Số dòng của từng bảng, để test so sánh trước và sau (kết quả mong đợi phải kiểm cả tác dụng phụ). */
async function snapshotCounts(pool) {
  const entries = await Promise.all(TABLES.map(async (table) => [table, await countRows(pool, table)]));
  return Object.fromEntries(entries);
}

/** Số dòng thêm vào ở mỗi bảng giữa hai lần chụp. */
function difference(countsAfter, countsBefore) {
  return Object.fromEntries(Object.keys(countsAfter).map((table) => [table, countsAfter[table] - countsBefore[table]]));
}

module.exports = {
  openTestDb, resetDb, countRows, snapshotCounts, difference, testDbName, TABLES, TEST_JWT_SECRET,
};
