/** Tạo database và tài khoản ứng dụng bằng tài khoản quản trị (DB_ADMIN_*). Chạy lại được. */
const mysql = require('mysql2/promise');

const {
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_ADMIN_USER, DB_ADMIN_PASSWORD,
} = process.env;

async function main() {
  if (!DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error('Thiếu DB_NAME / DB_USER / DB_PASSWORD trong .env (chạy npm run env:init).');
  }
  if (!/^\w+$/.test(DB_NAME) || !/^\w+$/.test(DB_USER)) {
    throw new Error('DB_NAME và DB_USER chỉ gồm chữ, số, dấu gạch dưới.');
  }
  const conn = await mysql.createConnection({
    host: DB_HOST || '127.0.0.1',
    port: Number(DB_PORT || 3306),
    user: DB_ADMIN_USER || 'root',
    password: DB_ADMIN_PASSWORD || '',
  });
  try {
    const db = conn.escapeId(DB_NAME);
    const account = `${conn.escape(DB_USER)}@'localhost'`;
    const password = conn.escape(DB_PASSWORD);
    // utf8mb4_unicode_ci: so sánh không phân biệt hoa/thường và dấu (dùng khi tìm cặp nghi trùng).
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${db} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY ${password}`);
    await conn.query(`ALTER USER ${account} IDENTIFIED BY ${password}`);
    await conn.query(`GRANT ALL PRIVILEGES ON ${db}.* TO ${account}`);
    await conn.query('FLUSH PRIVILEGES');
    process.stdout.write(`Đã sẵn sàng: database ${DB_NAME}, user ${DB_USER}\n`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  process.stderr.write(`LỖI: ${err.message}\n`);
  process.exit(1);
});
