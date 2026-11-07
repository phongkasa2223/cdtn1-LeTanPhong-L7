const { AppError, ValidationError, ConstraintError } = require('../errors/AppError');
const { hashPassword } = require('./auth.service');
const { parsePaging } = require('./paging');
const { toUserView } = require('./user.contract');

const ROLES = ['DATA_STAFF', 'DATA_MANAGER'];
const USERNAME_PATTERN = /^[a-z0-9._]{3,50}$/;
const STORE_PATTERN = /^[A-Z0-9]{2,10}$/;
const FULL_NAME_LENGTH = [2, 100];
const PASSWORD_LENGTH = [8, 72];
const DEFAULT_PAGE_SIZE = 50;

const isText = (value) => typeof value === 'string';
const inRange = (text, [min, max]) => text.length >= min && text.length <= max;

/** Mã tài khoản trong đường dẫn phải là số nguyên dương. */
function parseId(raw) {
  const text = String(raw);
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text))) {
    throw new ValidationError('Mã tài khoản phải là số nguyên dương.',
      [{ field: 'id', code: 'INVALID_FORMAT', message: 'Mã tài khoản phải là số nguyên dương.' }]);
  }
  return Number(text);
}

/** Kiểm dữ liệu vào của tài khoản. `creating` là true thì bắt buộc có tên đăng nhập và mật khẩu. */
function validateUserInput(input, { creating }) {
  const body = input && typeof input === 'object' ? input : {};
  const errors = [];
  const fail = (field, code, message) => errors.push({ field, code, message });

  const username = isText(body.username) ? body.username.trim() : null;
  if (creating && (username === null || !USERNAME_PATTERN.test(username))) {
    fail('username', 'INVALID_FORMAT',
      'Tên đăng nhập dài 3–50 ký tự, chỉ gồm chữ thường, số, dấu chấm và dấu gạch dưới.');
  }

  const fullName = isText(body.fullName) ? body.fullName.trim().replace(/\s+/g, ' ') : null;
  if (fullName === null || !inRange(fullName, FULL_NAME_LENGTH)) {
    fail('fullName', 'INVALID_LENGTH', 'Họ tên dài 2–100 ký tự.');
  }

  if (!ROLES.includes(body.role)) fail('role', 'INVALID_VALUE', `Vai trò phải thuộc: ${ROLES.join(', ')}.`);

  // QT-14: Nhân viên dữ liệu thuộc một đơn vị, Quản lý dữ liệu xem toàn công ty nên không có đơn vị.
  let storeCode = null;
  if (body.role === 'DATA_STAFF') {
    storeCode = isText(body.storeCode) ? body.storeCode.trim().toUpperCase() : null;
    if (storeCode === null || !STORE_PATTERN.test(storeCode)) {
      fail('storeCode', 'INVALID_FORMAT', 'Nhân viên dữ liệu cần mã đơn vị 2–10 ký tự chữ hoa hoặc số, ví dụ CH01.');
    }
  } else if (ROLES.includes(body.role) && body.storeCode) {
    fail('storeCode', 'INVALID_VALUE', 'Quản lý dữ liệu không thuộc đơn vị nào, hãy bỏ trống mã đơn vị.');
  }

  const hasPassword = body.password !== undefined && body.password !== null;
  if (creating || hasPassword) {
    const strong = isText(body.password) && inRange(body.password, PASSWORD_LENGTH)
      && /[A-Za-z]/.test(body.password) && /\d/.test(body.password);
    if (!strong) fail('password', 'INVALID_FORMAT', 'Mật khẩu dài 8–72 ký tự, có ít nhất một chữ cái và một chữ số.');
  }

  if (errors.length) throw new ValidationError('Thông tin tài khoản chưa hợp lệ.', errors);
  return {
    username, fullName, role: body.role, storeCode, password: hasPassword ? body.password : undefined,
  };
}

/** Quản lý tài khoản (E12–E16), chỉ Quản lý dữ liệu được gọi. Không biết HTTP hay SQL. */
class UserService {
  /** `uow` (tùy chọn) chạy việc đổi số Quản lý trong một giao dịch có khóa; không truyền thì chạy thẳng trên `users` (test đơn vị). */
  constructor(users, uow = null) {
    this.users = users;
    this.uow = uow;
  }

  async create(input) {
    const data = validateUserInput(input, { creating: true });
    const passwordHash = await hashPassword(data.password);
    const userId = await this.guard(() => this.users.insert({
      username: data.username, passwordHash, fullName: data.fullName, role: data.role, storeCode: data.storeCode,
    }));
    return toUserView(await this.users.findById(userId));
  }

  async get(id) {
    return toUserView(await this.find(parseId(id)));
  }

  async list(query) {
    const { page, size } = parsePaging(query, DEFAULT_PAGE_SIZE);
    const { rows, total } = await this.users.list({ page, size });
    return { page, size, total, items: rows.map(toUserView) };
  }

  /** Sửa họ tên, vai trò, đơn vị; mật khẩu chỉ đổi khi có gửi lên. Tên đăng nhập không đổi được. */
  async update(id, input) {
    const current = await this.find(parseId(id));
    const data = validateUserInput(input, { creating: false });
    if (isText(input?.username) && input.username.trim() !== current.username) {
      throw new ValidationError('Không đổi được tên đăng nhập.',
        [{ field: 'username', code: 'IMMUTABLE', message: 'Tên đăng nhập không đổi sau khi tạo.' }]);
    }
    const passwordHash = data.password === undefined ? null : await hashPassword(data.password);
    const demoting = current.role === 'DATA_MANAGER' && data.role !== 'DATA_MANAGER';
    const write = async (users) => {
      if (demoting) await this.assertNotLastManager('đổi vai trò', users);
      await users.update(current.user_id, {
        fullName: data.fullName, role: data.role, storeCode: data.storeCode, passwordHash,
      });
    };
    if (demoting) await this.changingManagers(write);
    else await write(this.users);
    return toUserView(await this.users.findById(current.user_id));
  }

  /**
   * Xóa tài khoản. Không tự xóa mình, không xóa Quản lý dữ liệu cuối cùng; tài khoản đã có lịch sử
   * (lần nhập, quyết định duyệt cặp) bị khóa ngoại chặn, và BR5 giữ nguyên lịch sử đó.
   */
  async remove(id, actor) {
    const current = await this.find(parseId(id));
    if (current.user_id === actor?.userId) {
      throw new AppError('CANNOT_DELETE_SELF', 'Không thể xóa tài khoản đang đăng nhập.');
    }
    const write = async (users) => {
      if (current.role === 'DATA_MANAGER') await this.assertNotLastManager('xóa', users);
      try {
        await users.remove(current.user_id);
      } catch (err) {
        if (err instanceof ConstraintError && err.kind === 'REFERENCED') {
          throw new AppError('USER_HAS_HISTORY',
            `Tài khoản ${current.username} đã có lịch sử thao tác (lần nhập hoặc quyết định duyệt cặp) nên không xóa được.`);
        }
        throw err;
      }
    };
    if (current.role === 'DATA_MANAGER') await this.changingManagers(write);
    else await write(this.users);
  }

  async find(userId) {
    const row = await this.users.findById(userId);
    if (!row) throw new AppError('USER_NOT_FOUND', `Không tìm thấy tài khoản ${userId}.`);
    return row;
  }

  /**
   * Đổi số Quản lý (xóa, hạ vai trò) phải kiểm "còn mấy Quản lý" và ghi trên cùng một số liệu: chạy trong giao dịch,
   * khóa các dòng Quản lý trước khi đếm, nên hai yêu cầu chồng nhau thì yêu cầu sau chờ rồi thấy số đã đổi (BUG-010).
   */
  async changingManagers(work) {
    if (!this.uow) return work(this.users);
    return this.uow.run(async ({ users }) => {
      await users.lockManagers();
      return work(users);
    });
  }

  async assertNotLastManager(action, users = this.users) {
    if (await users.countByRole('DATA_MANAGER') <= 1) {
      throw new AppError('LAST_MANAGER', `Đây là Quản lý dữ liệu cuối cùng, không thể ${action}.`);
    }
  }

  /** Đổi lỗi trùng khóa của DB (hai yêu cầu cùng tên đăng nhập cùng lúc) thành USERNAME_TAKEN. */
  async guard(action) {
    try {
      return await action();
    } catch (err) {
      if (err instanceof ConstraintError && err.kind === 'DUPLICATE') {
        throw new AppError('USERNAME_TAKEN', 'Tên đăng nhập đã được dùng.');
      }
      throw err;
    }
  }
}

module.exports = { UserService };
