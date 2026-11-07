/**
 * Chạy các file .sql trong một thư mục (migrations hoặc seeds).
 * Dùng: node --env-file=.env scripts/run-sql.js migrations
 */
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

/**
 * Chạy lần lượt (theo tên file) mọi file .sql của một thư mục trong repo. `database` cho phép chạy lên CSDL khác
 * DB_NAME (test tích hợp dùng CSDL thử); `log` nhận một dòng chữ sau mỗi file. Trả về danh sách file đã chạy.
 */
async function runSqlDir(dir, { database = process.env.DB_NAME, log = () => {} } = {}) {
  const folder = path.resolve(__dirname, '..', dir);
  const files = fs.readdirSync(folder).filter((f) => f.endsWith('.sql')).sort();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4',
    multipleStatements: true,
  });
  try {
    for (const file of files) {
      await conn.query(fs.readFileSync(path.join(folder, file), 'utf8'));
      log(`OK  ${dir}/${file}\n`);
    }
  } finally {
    await conn.end();
  }
  return files;
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Thiếu tham số thư mục: migrations hoặc seeds.');
  await runSqlDir(dir, { log: (text) => process.stdout.write(text) });
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`LỖI: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { runSqlDir };
