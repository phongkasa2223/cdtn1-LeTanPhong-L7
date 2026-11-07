/**
 * Chặn đoán mật khẩu (OWASP A07): một cặp (địa chỉ gọi, tên đăng nhập) sai MAX_FAILURES lần liên tiếp thì bị khóa tới khi
 * đủ WINDOW_MS kể từ lần sai cuối; đăng nhập đúng thì xóa bộ đếm. Cặp khác không bị ảnh hưởng, nên người đoán mật khẩu
 * từ máy khác không khóa được tài khoản của người dùng thật.
 * Bộ đếm nằm trong bộ nhớ của một tiến trình: khởi động lại thì xóa; chạy nhiều máy chủ cần kho chung (ví dụ Redis).
 */
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 10000; // trần của bảng đếm, để gửi vô số tên đăng nhập khác nhau không làm đầy bộ nhớ
const USERNAME_KEY_LENGTH = 50;

class LoginThrottle {
  constructor({
    maxFailures = MAX_FAILURES, windowMs = WINDOW_MS, maxEntries = MAX_ENTRIES, now = () => Date.now(),
  } = {}) {
    this.maxFailures = maxFailures;
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
    this.now = now;
    this.entries = new Map(); // khóa -> { failures, lastFailureAt }; Map giữ thứ tự thêm vào nên đầu bảng là mục cũ nhất
  }

  /** Khóa đếm: địa chỉ gọi và tên đăng nhập (bỏ khoảng trắng, không phân biệt hoa thường, cắt ở độ dài tối đa). */
  static key(ip, username) {
    return `${ip}|${String(username ?? '').trim().toLowerCase().slice(0, USERNAME_KEY_LENGTH)}`;
  }

  /** Số giây còn bị khóa; 0 nghĩa là được thử. */
  retryAfterSeconds(key) {
    const entry = this.entries.get(key);
    if (!entry) return 0;
    const remainingMs = entry.lastFailureAt + this.windowMs - this.now();
    if (remainingMs <= 0) {
      this.entries.delete(key); // quá hạn: quên hẳn
      return 0;
    }
    return entry.failures >= this.maxFailures ? Math.ceil(remainingMs / 1000) : 0;
  }

  /** Ghi một lần đăng nhập sai. Lần sai cách lần trước từ WINDOW_MS trở lên thì đếm lại từ 1. */
  recordFailure(key) {
    const at = this.now();
    const entry = this.entries.get(key);
    const fresh = !entry || at - entry.lastFailureAt >= this.windowMs;
    this.entries.delete(key); // xóa rồi thêm lại để mục vừa sai nằm cuối bảng
    this.entries.set(key, { failures: fresh ? 1 : entry.failures + 1, lastFailureAt: at });
    if (this.entries.size > this.maxEntries) this.prune(at);
  }

  /** Đăng nhập đúng thì xóa bộ đếm của cặp đó. */
  reset(key) {
    this.entries.delete(key);
  }

  /** Bỏ các mục quá hạn; nếu bảng vẫn quá trần thì bỏ dần các mục cũ nhất. */
  prune(at) {
    for (const [key, entry] of this.entries) {
      if (at - entry.lastFailureAt >= this.windowMs) this.entries.delete(key);
    }
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value);
  }
}

module.exports = { LoginThrottle, MAX_FAILURES, WINDOW_MS };
