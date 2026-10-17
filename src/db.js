const mysql = require('mysql2/promise');

/** Tạo pool kết nối DB từ biến môi trường (.env). */
function createPool() {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (!DB_HOST || !DB_NAME || !DB_USER) {
    throw new Error('Thiếu biến môi trường DB_HOST / DB_NAME / DB_USER. Xem .env.example.');
  }
  return mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT || 3306),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD || '',
    charset: 'utf8mb4',
    dateStrings: true,          // trả DATE/DATETIME dạng chuỗi, tránh lệch múi giờ
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_MAX || 10),
    connectTimeout: 3000,
  });
}

module.exports = { createPool };
