const { ConstraintError } = require('../errors/AppError');

const ER_DUP_ENTRY = 1062;
const ER_ROW_IS_REFERENCED = 1451;
// Không chọn password_hash ở bất kỳ đâu ngoài đăng nhập (NFR2).
const USER_COLUMNS = 'user_id, username, full_name, role, store_code, created_at';

/** Đọc/ghi bảng app_user, không có nghiệp vụ. Lỗi trùng khóa và khóa ngoại đổi sang ConstraintError. */
class AppUserRepository {
  constructor(db) {
    this.db = db;
  }

  /** Chỉ dùng khi đăng nhập: có kèm mã băm mật khẩu để so khớp. */
  async findByUsername(username) {
    const [rows] = await this.db.query(
      `SELECT user_id, username, password_hash, full_name, role, store_code
         FROM app_user WHERE username = ?`,
      [username],
    );
    return rows[0] || null;
  }

  async findById(userId) {
    const [rows] = await this.db.query(`SELECT ${USER_COLUMNS} FROM app_user WHERE user_id = ?`, [userId]);
    return rows[0] || null;
  }

  async list({ page, size }) {
    const [rows] = await this.db.query(
      `SELECT ${USER_COLUMNS} FROM app_user ORDER BY user_id LIMIT ? OFFSET ?`,
      [size, (page - 1) * size],
    );
    const [[{ total }]] = await this.db.query('SELECT COUNT(*) AS total FROM app_user');
    return { rows, total: Number(total) };
  }

  async countByRole(role) {
    const [[{ total }]] = await this.db.query('SELECT COUNT(*) AS total FROM app_user WHERE role = ?', [role]);
    return Number(total);
  }

  /** Trả về user_id mới. Tên đăng nhập trùng thì ném ConstraintError('DUPLICATE'). */
  async insert({
    username, passwordHash, fullName, role, storeCode,
  }) {
    try {
      const [result] = await this.db.query(
        'INSERT INTO app_user (username, password_hash, full_name, role, store_code) VALUES (?, ?, ?, ?, ?)',
        [username, passwordHash, fullName, role, storeCode],
      );
      return result.insertId;
    } catch (err) {
      throw this.translate(err);
    }
  }

  /** passwordHash là null thì giữ mật khẩu cũ. Tên đăng nhập không đổi được. */
  async update(userId, {
    fullName, role, storeCode, passwordHash,
  }) {
    await this.db.query(
      `UPDATE app_user SET full_name = ?, role = ?, store_code = ?, password_hash = COALESCE(?, password_hash)
        WHERE user_id = ?`,
      [fullName, role, storeCode, passwordHash ?? null, userId],
    );
  }

  /** Xóa dòng. Tài khoản đã có lần nhập hoặc quyết định duyệt cặp thì khóa ngoại chặn: ConstraintError('REFERENCED'). */
  async remove(userId) {
    try {
      await this.db.query('DELETE FROM app_user WHERE user_id = ?', [userId]);
    } catch (err) {
      throw this.translate(err);
    }
  }

  translate(err) {
    if (err.errno === ER_DUP_ENTRY) return new ConstraintError('DUPLICATE', err.message);
    if (err.errno === ER_ROW_IS_REFERENCED) return new ConstraintError('REFERENCED', err.message);
    return err;
  }
}

module.exports = AppUserRepository;
