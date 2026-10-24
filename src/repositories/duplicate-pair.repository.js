const { randomBytes } = require('node:crypto');
const { chunks } = require('./batching');

const CODE_DIGITS = 4;

// Nguồn (RETAIL / WARRANTY) của hồ sơ lấy từ bản ghi nhập đầu tiên gắn với hồ sơ đó.
const sourceOf = (alias) => `(SELECT ib.source FROM stg_customer s
      JOIN import_batch ib ON ib.import_batch_id = s.import_batch_id
     WHERE s.customer_id = ${alias}.customer_id ORDER BY s.stg_customer_id LIMIT 1)`;

const SELECT_PAIR = `
  SELECT p.pair_id, p.pair_code, p.matched_by, p.similarity, p.status, p.decided_at, du.username AS decided_by_name,
         a.customer_id AS a_id, a.customer_code AS a_code, a.full_name AS a_name, a.phone AS a_phone,
         a.email AS a_email, a.address AS a_address, a.birth_date AS a_birth, a.merged_into_id AS a_merged,
         ${sourceOf('a')} AS a_source,
         b.customer_id AS b_id, b.customer_code AS b_code, b.full_name AS b_name, b.phone AS b_phone,
         b.email AS b_email, b.address AS b_address, b.birth_date AS b_birth, b.merged_into_id AS b_merged,
         ${sourceOf('b')} AS b_source
    FROM duplicate_pair p
    JOIN customer a ON a.customer_id = p.customer_a_id
    JOIN customer b ON b.customer_id = p.customer_b_id
    JOIN import_batch ibp ON ibp.import_batch_id = p.import_batch_id
    JOIN app_user u ON u.user_id = ibp.imported_by
    LEFT JOIN app_user du ON du.user_id = p.decided_by`;

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

  /** Cặp theo trạng thái, điểm tương đồng cao trước (FR6). `scope` = { restrict, storeCode } theo QT-14. */
  async list({ status, page, size, scope }) {
    const params = [status, scope.restrict ? 1 : 0, scope.storeCode];
    const [rows] = await this.db.query(
      `${SELECT_PAIR} WHERE p.status = ? AND (? = 0 OR u.store_code = ?)
        ORDER BY p.similarity DESC, p.pair_id LIMIT ? OFFSET ?`,
      [...params, size, (page - 1) * size],
    );
    const [[{ total }]] = await this.db.query(
      `SELECT COUNT(*) AS total FROM duplicate_pair p
         JOIN import_batch ibp ON ibp.import_batch_id = p.import_batch_id
         JOIN app_user u ON u.user_id = ibp.imported_by
        WHERE p.status = ? AND (? = 0 OR u.store_code = ?)`,
      params,
    );
    return { rows, total: Number(total) };
  }

  async findByCode(code, scope) {
    const [rows] = await this.db.query(
      `${SELECT_PAIR} WHERE p.pair_code = ? AND (? = 0 OR u.store_code = ?)`,
      [code, scope.restrict ? 1 : 0, scope.storeCode],
    );
    return rows[0] || null;
  }

  /** BR4: chỉ đổi khi cặp còn PENDING. Trả về true nếu lần gọi này là người quyết định đầu tiên. */
  async decide(pairId, { status, userId }) {
    const [result] = await this.db.query(
      `UPDATE duplicate_pair SET status = ?, decided_by = ?, decided_at = NOW()
        WHERE pair_id = ? AND status = 'PENDING'`,
      [status, userId, pairId],
    );
    return result.affectedRows === 1;
  }

  async countByBatch(batchId) {
    const [[{ total }]] = await this.db.query(
      'SELECT COUNT(*) AS total FROM duplicate_pair WHERE import_batch_id = ?', [batchId],
    );
    return Number(total);
  }
}

module.exports = DuplicatePairRepository;
