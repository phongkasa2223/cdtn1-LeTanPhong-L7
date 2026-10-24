const { chunks } = require('./batching');

const COLUMNS = `import_batch_id, row_no, raw_full_name, raw_phone, raw_email, raw_address,
  raw_birth_date, raw_created_date, full_name, phone, email, address, birth_date, created_date, customer_id`;

/** Chỉ đọc/ghi bảng stg_customer (bản ghi nhập), không có nghiệp vụ. */
class StgCustomerRepository {
  constructor(db) {
    this.db = db;
  }

  /** Thêm theo lô; trả về Map số dòng -> stg_customer_id (tra lại theo (lần nhập, số dòng) là khóa duy nhất). */
  async insertMany(batchId, rows) {
    const ids = new Map();
    for (const [, part] of chunks(rows)) {
      const values = part.map((r) => [
        batchId, r.rowNo, r.raw.fullName, r.raw.phone, r.raw.email, r.raw.address, r.raw.birthDate,
        r.raw.createdDate, r.normalized.fullName, r.normalized.phone, r.normalized.email,
        r.normalized.address, r.normalized.birthDate, r.normalized.createdDate, r.customerId,
      ]);
      await this.db.query(`INSERT INTO stg_customer (${COLUMNS}) VALUES ?`, [values]);
      const [found] = await this.db.query(
        `SELECT stg_customer_id, row_no FROM stg_customer
          WHERE import_batch_id = ? AND row_no BETWEEN ? AND ?`,
        [batchId, part[0].rowNo, part[part.length - 1].rowNo],
      );
      found.forEach((f) => ids.set(f.row_no, f.stg_customer_id));
    }
    return ids;
  }

  /** Bản ghi còn lỗi của một lần nhập, lọc theo mã quy tắc (FR4), thứ tự theo số dòng. */
  async listErrorRecords({ batchId, code, page, size }) {
    const filter = `s.import_batch_id = ? AND EXISTS (
        SELECT 1 FROM dq_result d
         WHERE d.stg_customer_id = s.stg_customer_id AND d.resolved_at IS NULL${code ? ' AND d.rule_code = ?' : ''})`;
    const params = code ? [batchId, code] : [batchId];
    const [[{ total }]] = await this.db.query(`SELECT COUNT(*) AS total FROM stg_customer s WHERE ${filter}`, params);
    const [idRows] = await this.db.query(
      `SELECT s.stg_customer_id FROM stg_customer s WHERE ${filter} ORDER BY s.row_no LIMIT ? OFFSET ?`,
      [...params, size, (page - 1) * size],
    );
    if (!idRows.length) return { rows: [], total };
    const [rows] = await this.db.query(
      'SELECT * FROM stg_customer WHERE stg_customer_id IN (?) ORDER BY row_no',
      [idRows.map((r) => r.stg_customer_id)],
    );
    return { rows, total };
  }
}

module.exports = StgCustomerRepository;
