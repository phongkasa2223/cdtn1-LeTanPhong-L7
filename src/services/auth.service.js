const crypto = require('node:crypto');
const { promisify } = require('node:util');
const jwt = require('jsonwebtoken');
const { AppError, ValidationError } = require('../errors/AppError');

const scrypt = promisify(crypto.scrypt);

const USERNAME_LENGTH = [3, 50];
const PASSWORD_LENGTH = [8, 72];
const MIN_SECRET_LENGTH = 16;
const DEFAULT_EXPIRES_IN = 3600; // giây
const SALT_BYTES = 16;
const HASH_BYTES = 32;
// Băm giả để thời gian trả lời của tên không tồn tại giống tên có tồn tại.
const DUMMY_HASH = `scrypt$${'00'.repeat(16)}$${'00'.repeat(32)}`;

/** Mật khẩu lưu dạng scrypt$<salt hex>$<hash hex> (NFR2: không lưu dạng đọc được). */
async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

/** Băm mật khẩu mới thành đúng dạng mà verifyPassword đọc được, muối ngẫu nhiên cho từng tài khoản. */
async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = await scrypt(password, salt, HASH_BYTES);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function outOfRange(value, [min, max]) {
  return typeof value !== 'string' || value.length < min || value.length > max;
}

/** Đăng nhập và kiểm tra token (E1, NFR2). Đồng hồ được tiêm vào để test hạn token. */
class AuthService {
  constructor(users, { secret, expiresIn = DEFAULT_EXPIRES_IN, now = () => Date.now() } = {}) {
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      throw new Error(`JWT_SECRET phải có ít nhất ${MIN_SECRET_LENGTH} ký tự. Xem .env.example.`);
    }
    this.users = users;
    this.secret = secret;
    this.expiresIn = expiresIn;
    this.now = now;
  }

  nowSeconds() {
    return Math.floor(this.now() / 1000);
  }

  async login(body) {
    const { username, password } = body || {};
    const errors = [];
    if (outOfRange(username, USERNAME_LENGTH)) {
      errors.push({ field: 'username', code: 'INVALID_LENGTH', message: 'Tên đăng nhập dài 3–50 ký tự.' });
    }
    if (outOfRange(password, PASSWORD_LENGTH)) {
      errors.push({ field: 'password', code: 'INVALID_LENGTH', message: 'Mật khẩu dài 8–72 ký tự.' });
    }
    if (errors.length) throw new ValidationError('Thiếu hoặc sai độ dài tên đăng nhập / mật khẩu.', errors);

    const user = await this.users.findByUsername(username);
    const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) {
      // Cùng một thông báo cho sai tên và sai mật khẩu, để không lộ tài khoản nào tồn tại.
      throw new AppError('INVALID_CREDENTIALS', 'Sai tên đăng nhập hoặc mật khẩu.');
    }

    const accessToken = jwt.sign(
      { iat: this.nowSeconds(), usr: user.username, role: user.role, store: user.store_code },
      this.secret,
      { algorithm: 'HS256', subject: String(user.user_id), expiresIn: this.expiresIn },
    );
    return {
      accessToken,
      expiresIn: this.expiresIn,
      user: { username: user.username, fullName: user.full_name, role: user.role },
    };
  }

  /**
   * Trả về người dùng của token, hoặc ném UNAUTHORIZED (token sai, giả, hết hạn, hoặc tài khoản đã bị xóa).
   * Vai trò và đơn vị lấy từ CSDL chứ không từ token, nên xóa tài khoản hay đổi vai trò có hiệu lực ngay.
   */
  async verifyToken(token) {
    let claims;
    try {
      claims = jwt.verify(token, this.secret, {
        algorithms: ['HS256'], clockTimestamp: this.nowSeconds(),
      });
    } catch {
      throw new AppError('UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
    const user = await this.users.findById(Number(claims.sub));
    if (!user) throw new AppError('UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    return {
      userId: user.user_id, username: user.username, role: user.role, storeCode: user.store_code ?? null,
    };
  }
}

module.exports = { AuthService, verifyPassword, hashPassword };
