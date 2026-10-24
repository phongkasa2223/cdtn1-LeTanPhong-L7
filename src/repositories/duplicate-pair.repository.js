const { randomBytes } = require('node:crypto');
const { chunks } = require('./batching');

const CODE_DIGITS = 4;

/** Chỉ đọc/ghi bảng duplicate_pair (cặp nghi trùng), không có nghiệp vụ. */
class DuplicatePairRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Thêm cặp mới. Cặp đã tồn tại (cùng hai hồ sơ) thì bỏ qua, không đổi trạng thái đã duyệt.
   * Mã Pnnnn sinh từ id tự tăng; mã tạm có tiền tố ngẫu nhiên riêng cho lần gọi này.
   */
  async insertMany(batchId, pairs) {
    if (!pairs.length) return;
    const token = `T${randomBytes(2).toString('hex')}`;
    for (const [offset, part] of chunks(pairs)) {
      const values = part.map((p, i) => [
        `${token}${(offset + i).toString(36)}`, batchId, p.aId, p.bId, p.matchedBy, p.similarity,
      ]);
      await this.db.query(
        `INSERT INTO duplicate_pair (pair_code, import_batch_id, customer_a_id, customer_b_id, matched_by, similarity)
         VALUES ? ON DUPLICATE KEY UPDATE pair_id = pair_id`,
        [values],
      );
    }
    await this.db.query(
      `UPDATE duplicate_pair SET pair_code = CONCAT('P', LPAD(pair_id, ${CODE_DIGITS}, '0')) WHERE pair_code LIKE ?`,
      [`${token}%`],
    );
  }

  async countByBatch(batchId) {
    const [[{ total }]] = await this.db.query(
      'SELECT COUNT(*) AS total FROM duplicate_pair WHERE import_batch_id = ?', [batchId],
    );
    return Number(total);
  }
}

module.exports = DuplicatePairRepository;
