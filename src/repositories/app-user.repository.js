/** Chỉ đọc bảng app_user, không có nghiệp vụ. */
class AppUserRepository {
  constructor(db) {
    this.db = db;
  }

  async findByUsername(username) {
    const [rows] = await this.db.query(
      `SELECT user_id, username, password_hash, full_name, role, store_code
         FROM app_user WHERE username = ?`,
      [username],
    );
    return rows[0] || null;
  }
}

module.exports = AppUserRepository;
