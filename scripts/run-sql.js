/**
 * Chạy các file .sql trong một thư mục (migrations hoặc seeds).
 * Dùng: node --env-file=.env scripts/run-sql.js migrations
 */
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Thiếu tham số thư mục: migrations hoặc seeds.');
  const folder = path.resolve(__dirname, '..', dir);
  const files = fs.readdirSync(folder).filter((f) => f.endsWith('.sql')).sort();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4',
    multipleStatements: true,
  });
  try {
    for (const file of files) {
      await conn.query(fs.readFileSync(path.join(folder, file), 'utf8'));
      process.stdout.write(`OK  ${dir}/${file}\n`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  process.stderr.write(`LỖI: ${err.message}\n`);
  process.exit(1);
});
