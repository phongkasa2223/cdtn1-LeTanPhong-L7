const { randomBytes } = require('node:crypto');
const { ConstraintError } = require('../errors/AppError');
const { chunks } = require('./batching');

const ER_DUP_ENTRY = 1062;
const CODE_DIGITS = 6;

const SELECT_CUSTOMER = `
  SELECT c.customer_id, c.customer_code, c.full_name, c.phone, c.email, c.address,
         c.birth_date, c.created_date, c.merged_into_id, m.customer_code AS merged_into_code
    FROM customer c
    LEFT JOIN customer m ON m.customer_id = c.merged_into_id`;

/** Chỉ đọc/ghi bảng customer, không có nghiệp vụ. Lỗi trùng khóa đổi sang ConstraintError. */
class CustomerRepository {
  constructor(db) {
    this.db = db;
  }

  async findByCode(code) {
    const [rows] = await this.db.query(`${SELECT_CUSTOMER} WHERE c.customer_code = ?`, [code]);
    return rows[0] || null;
  }

  async findByPhone(phone) {
    const [rows] = await this.db.query(`${SELECT_CUSTOMER} WHERE c.phone = ?`, [phone]);
    return rows[0] || null;
  }

  async list({ page, size }) {
    const [rows] = await this.db.query(
      `${SELECT_CUSTOMER} ORDER BY c.customer_id LIMIT ? OFFSET ?`,
      [size, (page - 1) * size],
    );
    const [[{ total }]] = await this.db.query('SELECT COUNT(*) AS total FROM customer');
    return { rows, total };
  }

  /** Thêm hồ sơ. Mã Cnnnnnn sinh từ id tự tăng, cùng một giao dịch. */
  async insert(data) {
    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        `INSERT INTO customer (customer_code, full_name, phone, email, address, birth_date, created_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`TMP${Date.now()}${Math.floor(Math.random() * 1e6)}`.slice(0, 10),
          data.fullName, data.phone, data.email, data.address, data.birthDate, data.createdDate],
      );
      const code = `C${String(result.insertId).padStart(CODE_DIGITS, '0')}`;
      await conn.query('UPDATE customer SET customer_code = ? WHERE customer_id = ?', [code, result.insertId]);
      await conn.commit();
      return code;
    } catch (err) {
      await conn.rollback();
      throw this.translate(err);
    } finally {
      conn.release();
    }
  }

  async update(customerId, data) {
    try {
      await this.db.query(
        `UPDATE customer SET full_name = ?, phone = ?, email = ?, address = ?, birth_date = ?
          WHERE customer_id = ?`,
        [data.fullName, data.phone, data.email, data.address, data.birthDate, customerId],
      );
    } catch (err) {
      throw this.translate(err);
    }
  }

  /** Tra nhiều SĐT một lúc. Hồ sơ đã gộp trả về hồ sơ giữ lại (QT-13). Kết quả: Map SĐT -> customer_id. */
  async findIdsByPhones(phones) {
    const found = new Map();
    for (const [, part] of chunks(phones)) {
      const [rows] = await this.db.query(
        'SELECT phone, COALESCE(merged_into_id, customer_id) AS target_id FROM customer WHERE phone IN (?)',
        [part],
      );
      rows.forEach((r) => found.set(r.phone, r.target_id));
    }
    return found;
  }

  /** Thêm nhiều hồ sơ theo lô. Mã Cnnnnnn sinh từ id tự tăng, mã tạm có tiền tố ngẫu nhiên riêng cho lần gọi. */
  async insertMany(rows) {
    if (!rows.length) return;
    const token = `T${randomBytes(2).toString('hex')}`;
    try {
      for (const [offset, part] of chunks(rows)) {
        const values = part.map((r, i) => [
          `${token}${(offset + i).toString(36)}`, r.fullName, r.phone, r.email, r.address, r.birthDate, r.createdDate,
        ]);
        await this.db.query(
          `INSERT INTO customer (customer_code, full_name, phone, email, address, birth_date, created_date)
           VALUES ?`,
          [values],
        );
      }
      await this.db.query(
        `UPDATE customer SET customer_code = CONCAT('C', LPAD(customer_id, ${CODE_DIGITS}, '0')) WHERE customer_code LIKE ?`,
        [`${token}%`],
      );
    } catch (err) {
      throw this.translate(err);
    }
  }

  /**
   * Hồ sơ khác SĐT nhưng cùng email, hoặc cùng họ tên và ngày sinh với các hồ sơ mới (FR2, BR4).
   * So sánh họ tên dựa vào collation utf8mb4_unicode_ci (không phân biệt hoa/thường và dấu), xem db:setup.
   */
  async findDuplicateCandidates(customerIds) {
    const found = [];
    const sources = [
      ['EMAIL', 'b.email = a.email', 'a.email IS NOT NULL'],
      ['NAME_BIRTHDATE', 'b.full_name = a.full_name AND b.birth_date = a.birth_date', 'a.birth_date IS NOT NULL'],
    ];
    for (const [, part] of chunks(customerIds)) {
      for (const [matchedBy, joinOn, notNull] of sources) {
        const [rows] = await this.db.query(
          `SELECT a.customer_id AS a_id, b.customer_id AS b_id, a.full_name AS a_name, b.full_name AS b_name
             FROM customer a JOIN customer b ON ${joinOn} AND b.customer_id <> a.customer_id
            WHERE a.customer_id IN (?) AND ${notNull}
              AND a.merged_into_id IS NULL AND b.merged_into_id IS NULL`,
          [part],
        );
        rows.forEach((r) => found.push({
          aId: r.a_id, bId: r.b_id, aName: r.a_name, bName: r.b_name, matchedBy,
        }));
      }
    }
    return found;
  }

  /** Đọc và khóa dòng các hồ sơ (theo thứ tự id để hai giao dịch không khóa chéo nhau). */
  async lockByIds(ids) {
    const [rows] = await this.db.query(
      `SELECT customer_id, customer_code, full_name, phone, email, address, birth_date, merged_into_id
         FROM customer WHERE customer_id IN (?) ORDER BY customer_id FOR UPDATE`,
      [ids],
    );
    return rows;
  }

  async setPhone(customerId, phone) {
    try {
      await this.db.query('UPDATE customer SET phone = ? WHERE customer_id = ?', [phone, customerId]);
    } catch (err) {
      throw this.translate(err);
    }
  }

  /** QT-13: đánh dấu hồ sơ đã gộp vào hồ sơ giữ lại (không xóa); có thể đổi SĐT cùng lúc khi hoán đổi. */
  async markMerged(customerId, keeperId, phone) {
    try {
      await this.db.query(
        'UPDATE customer SET merged_into_id = ?, phone = COALESCE(?, phone) WHERE customer_id = ?',
        [keeperId, phone ?? null, customerId],
      );
    } catch (err) {
      throw this.translate(err);
    }
  }

  translate(err) {
    return err.errno === ER_DUP_ENTRY ? new ConstraintError('DUPLICATE', err.message) : err;
  }
}

module.exports = CustomerRepository;
