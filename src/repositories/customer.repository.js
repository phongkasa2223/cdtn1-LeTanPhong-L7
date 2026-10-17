const { ConstraintError } = require('../errors/AppError');

const ER_DUP_ENTRY = 1062;
const CODE_DIGITS = 6;

const SELECT_CUSTOMER = `
  SELECT c.customer_id, c.customer_code, c.full_name, c.phone, c.email, c.address,
         c.birth_date, c.created_date, c.merged_into_id, m.customer_code AS merged_into_code
    FROM customer c
    LEFT JOIN customer m ON m.customer_id = c.merged_into_id`;

/**
 * Lớp truy cập dữ liệu – CHỈ đọc/ghi bảng customer.
 * Không có quy tắc nghiệp vụ; chỉ dịch lỗi của CSDL sang ConstraintError trung tính.
 */
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

  /** Thêm hồ sơ; mã hiển thị Cnnnnnn sinh từ khóa tự tăng, trong cùng một giao dịch. */
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

  translate(err) {
    return err.errno === ER_DUP_ENTRY ? new ConstraintError('DUPLICATE', err.message) : err;
  }
}

module.exports = CustomerRepository;
