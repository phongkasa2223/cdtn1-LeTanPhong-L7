/**
 * In số dòng của từng bảng. Dùng để kiểm phép thử "chạy lại được":
 * chạy migrate + seed hai lần, số dòng phải giữ nguyên.
 */
const mysql = require('mysql2/promise');

const TABLES = ['app_user', 'import_batch', 'customer', 'stg_customer', 'dq_result', 'duplicate_pair'];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  });
  try {
    for (const table of TABLES) {
      const [[row]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
      process.stdout.write(`${table.padEnd(16)} ${row.n}\n`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  process.stderr.write(`LỖI: ${err.message}\n`);
  process.exit(1);
});
