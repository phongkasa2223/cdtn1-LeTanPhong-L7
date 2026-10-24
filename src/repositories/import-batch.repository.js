const { randomBytes } = require('node:crypto');

const CODE_DIGITS = 3;
const FILE_NAME_MAX = 255;

/** Chỉ đọc/ghi bảng import_batch, không có nghiệp vụ. `scope` = { restrict, storeCode } theo QT-14. */
class ImportBatchRepository {
  constructor(db) {
    this.db = db;
  }

  /** Tạo lần nhập. Mã Innn sinh từ id tự tăng, cùng giao dịch với lần nhập. */
  async create({ source, fileName, userId }) {
    const tempCode = `T${randomBytes(4).toString('hex')}`;
    const [result] = await this.db.query(
      'INSERT INTO import_batch (import_code, source, file_name, imported_by) VALUES (?, ?, ?, ?)',
      [tempCode, source, fileName.slice(0, FILE_NAME_MAX), userId],
    );
    const code = `I${String(result.insertId).padStart(CODE_DIGITS, '0')}`;
    await this.db.query('UPDATE import_batch SET import_code = ? WHERE import_batch_id = ?', [code, result.insertId]);
    const [[row]] = await this.db.query(
      'SELECT imported_at FROM import_batch WHERE import_batch_id = ?', [result.insertId],
    );
    return { id: result.insertId, code, importedAt: row.imported_at };
  }

  async findByCode(code, scope) {
    const [rows] = await this.db.query(
      `SELECT ib.import_batch_id, ib.import_code, ib.source, ib.file_name, ib.imported_at, u.username
         FROM import_batch ib JOIN app_user u ON u.user_id = ib.imported_by
        WHERE ib.import_code = ? AND (? = 0 OR u.store_code = ?)`,
      [code, scope.restrict ? 1 : 0, scope.storeCode],
    );
    return rows[0] || null;
  }

  /** Mới nhất trước (FR3). Tổng bản ghi và số bản ghi còn lỗi đếm khi truy vấn, không lưu (3NF). */
  async list({ page, size, scope }) {
    const params = [scope.restrict ? 1 : 0, scope.storeCode];
    const [rows] = await this.db.query(
      `SELECT ib.import_code, ib.source, ib.file_name, ib.imported_at, u.username,
              (SELECT COUNT(*) FROM stg_customer s
                WHERE s.import_batch_id = ib.import_batch_id) AS total_records,
              (SELECT COUNT(DISTINCT d.stg_customer_id) FROM dq_result d
                 JOIN stg_customer s ON s.stg_customer_id = d.stg_customer_id
                WHERE s.import_batch_id = ib.import_batch_id AND d.resolved_at IS NULL) AS error_records
         FROM import_batch ib JOIN app_user u ON u.user_id = ib.imported_by
        WHERE (? = 0 OR u.store_code = ?)
        ORDER BY ib.imported_at DESC, ib.import_batch_id DESC
        LIMIT ? OFFSET ?`,
      [...params, size, (page - 1) * size],
    );
    const [[{ total }]] = await this.db.query(
      `SELECT COUNT(*) AS total FROM import_batch ib JOIN app_user u ON u.user_id = ib.imported_by
        WHERE (? = 0 OR u.store_code = ?)`,
      params,
    );
    return { rows, total };
  }
}

module.exports = ImportBatchRepository;
