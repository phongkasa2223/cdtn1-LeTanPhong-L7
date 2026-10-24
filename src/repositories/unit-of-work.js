/**
 * Chạy một nhóm thao tác trong MỘT giao dịch (NFR3): xong thì COMMIT, có lỗi thì ROLLBACK toàn bộ.
 * Các repository được tạo lại gắn với kết nối của giao dịch, nên service không biết gì về SQL.
 */
class UnitOfWork {
  constructor(pool, makeRepos) {
    this.pool = pool;
    this.makeRepos = makeRepos;
  }

  async run(work) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await work(this.makeRepos(conn));
      await conn.commit();
      return result;
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        // Kết nối đã hỏng: máy chủ tự hủy giao dịch, giữ nguyên lỗi gốc để báo.
      }
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = UnitOfWork;
