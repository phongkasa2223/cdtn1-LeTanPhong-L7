const { chunks } = require('./batching');

/** Chỉ đọc/ghi bảng dq_result (kết quả kiểm tra), không có nghiệp vụ. */
class DqResultRepository {
  constructor(db) {
    this.db = db;
  }

  async insertMany(rows) {
    for (const [, part] of chunks(rows)) {
      const values = part.map((r) => [r.stgCustomerId, r.ruleCode, r.fieldName, r.message]);
      await this.db.query(
        'INSERT INTO dq_result (stg_customer_id, rule_code, field_name, message) VALUES ?', [values],
      );
    }
  }

  /** Các lỗi chưa khắc phục của những bản ghi nhập đã cho. */
  async listUnresolvedByStgIds(stgIds) {
    if (!stgIds.length) return [];
    const [rows] = await this.db.query(
      `SELECT stg_customer_id, rule_code, field_name, message FROM dq_result
        WHERE stg_customer_id IN (?) AND resolved_at IS NULL ORDER BY dq_result_id`,
      [stgIds],
    );
    return rows;
  }
}

module.exports = DqResultRepository;
