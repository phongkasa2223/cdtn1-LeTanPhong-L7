/**
 * Tạo database, database thử (<DB_NAME>_test, dành cho test tích hợp của npm test) và tài khoản ứng dụng
 * bằng tài khoản quản trị (DB_ADMIN_*). Chạy lại được.
 */
const mysql = require('mysql2/promise');

const {
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_ADMIN_USER, DB_ADMIN_PASSWORD, TEST_DB_NAME,
} = process.env;

async function main() {
  if (!DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error('Thiếu DB_NAME / DB_USER / DB_PASSWORD trong .env (chạy npm run env:init).');
  }
  // Test tích hợp xóa sạch dữ liệu trước mỗi test, nên chạy trên database riêng có đuôi _test.
  const testDb = TEST_DB_NAME || `${DB_NAME}_test`;
  if (!/^\w+$/.test(DB_NAME) || !/^\w+$/.test(DB_USER) || !/^\w+_test$/.test(testDb)) {
    throw new Error('DB_NAME và DB_USER chỉ gồm chữ, số, dấu gạch dưới; TEST_DB_NAME phải kết thúc bằng _test.');
  }
  const conn = await mysql.createConnection({
    host: DB_HOST || '127.0.0.1',
    port: Number(DB_PORT || 3306),
    user: DB_ADMIN_USER || 'root',
    password: DB_ADMIN_PASSWORD || '',
  });
  try {
    const account = `${conn.escape(DB_USER)}@'localhost'`;
    const password = conn.escape(DB_PASSWORD);
    await conn.query(`CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY ${password}`);
    await conn.query(`ALTER USER ${account} IDENTIFIED BY ${password}`);
    for (const name of [DB_NAME, testDb]) {
      const db = conn.escapeId(name);
      // utf8mb4_unicode_ci: so sánh không phân biệt hoa/thường và dấu (dùng khi tìm cặp nghi trùng).
      await conn.query(`CREATE DATABASE IF NOT EXISTS ${db} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await conn.query(`GRANT ALL PRIVILEGES ON ${db}.* TO ${account}`);
    }
    await conn.query('FLUSH PRIVILEGES');
    process.stdout.write(`Đã sẵn sàng: database ${DB_NAME} và ${testDb} (cho npm test), user ${DB_USER}\n`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  process.stderr.write(`LỖI: ${err.message}\n`);
  process.exit(1);
});
