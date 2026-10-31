const mysql = require('mysql2/promise');
const { AppError } = require('./errors/AppError');

// Mã lỗi khi không nói chuyện được với máy chủ CSDL: tắt, sập, đứt mạng, hết kết nối.
const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET', 'EPIPE',
  'PROTOCOL_CONNECTION_LOST', 'ER_CON_COUNT_ERROR', 'ER_SERVER_SHUTDOWN',
]);

/** Mất kết nối CSDL thì đổi thành lỗi ứng dụng SERVICE_UNAVAILABLE (lỗi gốc giữ trong cause), lỗi khác giữ nguyên. */
function translateDbError(err) {
  if (!CONNECTION_ERROR_CODES.has(err?.code)) return err;
  return new AppError(
    'SERVICE_UNAVAILABLE',
    'Không kết nối được cơ sở dữ liệu nên chưa xử lý được yêu cầu. Dữ liệu đã lưu không bị ảnh hưởng, hãy thử lại sau ít phút.',
    undefined,
    { cause: err },
  );
}

async function translating(operation) {
  try {
    return await operation();
  } catch (err) {
    throw translateDbError(err);
  }
}

function wrapConnection(connection) {
  return {
    query: (...args) => translating(() => connection.query(...args)),
    beginTransaction: () => translating(() => connection.beginTransaction()),
    commit: () => translating(() => connection.commit()),
    rollback: () => translating(() => connection.rollback()),
    release: () => connection.release(),
  };
}

/**
 * Bọc pool để lỗi mất kết nối đổi sang SERVICE_UNAVAILABLE ở MỘT chỗ, repository không phải biết mã lỗi của mysql2.
 * Repository chỉ dùng query, getConnection và các lệnh giao dịch nên chỉ bọc chừng đó.
 */
function wrapPool(pool) {
  return {
    query: (...args) => translating(() => pool.query(...args)),
    getConnection: async () => wrapConnection(await translating(() => pool.getConnection())),
    end: () => pool.end(),
  };
}

/** Tạo pool kết nối DB từ biến môi trường (.env). */
function createPool() {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (!DB_HOST || !DB_NAME || !DB_USER) {
    throw new Error('Thiếu biến môi trường DB_HOST / DB_NAME / DB_USER. Xem .env.example.');
  }
  return wrapPool(mysql.createPool({
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
  }));
}

module.exports = { createPool, wrapPool, translateDbError };
