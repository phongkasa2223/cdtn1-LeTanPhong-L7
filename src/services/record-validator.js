const fs = require('node:fs');
const path = require('node:path');
const { ValidationError } = require('../errors/AppError');

const PREFIX_FILE = path.resolve(__dirname, '..', '..', 'config', 'phone_prefixes.json');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DISPLAY_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const NAME_MIN = 2;
const NAME_MAX = 100;
const EMAIL_MAX = 100;
const ADDRESS_MAX = 255;
const LOCAL_PHONE_LENGTH = 10;
const STG_NAME_MAX = 120; // độ rộng cột stg_customer.full_name
const STG_PHONE_MAX = 20;

/** NFR5: đầu số đọc từ file cấu hình, không ghi cứng trong code. */
function loadPhonePrefixes(file = PREFIX_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8')).prefixes;
}

function toIsoDate(text) {
  const iso = ISO_DATE.exec(text);
  const display = DISPLAY_DATE.exec(text);
  if (!iso && !display) return null;
  const [year, month, day] = iso
    ? [iso[1], iso[2], iso[3]]
    : [display[3], display[2], display[1]];
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const valid = date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);
  return valid ? `${year}-${month}-${day}` : null;
}

/** "  NGUYỄN   văn AN " -> "Nguyễn Văn An" (bỏ khoảng trắng thừa, viết hoa chữ cái đầu mỗi từ). */
function toTitleCase(text) {
  return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi').split(' ')
    .map((word) => (word ? word[0].toLocaleUpperCase('vi') + word.slice(1) : word))
    .join(' ');
}

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

/** Chuẩn hóa và kiểm tra hồ sơ khách hàng (BR1–BR3, QT-02). Không đụng HTTP hay DB. */
class RecordValidator {
  constructor(prefixes) {
    this.prefixes = new Set(prefixes);
  }

  static fromConfig() {
    return new RecordValidator(loadPhonePrefixes());
  }

  /** QT-02: đưa SĐT về dạng 0xxxxxxxxx. Trả { phone } hoặc { code, message }. */
  normalizePhone(raw) {
    if (isBlank(raw)) return { code: 'MISSING_FIELD', message: 'Thiếu số điện thoại.' };
    const text = String(raw).trim();
    if (/[^\d\s.\-+()]/.test(text)) {
      return { code: 'PHONE_CHAR', message: 'Số điện thoại chỉ gồm chữ số, dấu cách, dấu chấm, gạch ngang hoặc +.' };
    }
    let digits = text.replace(/\D/g, '');
    if (digits.startsWith('84') && digits.length === LOCAL_PHONE_LENGTH + 1) {
      digits = `0${digits.slice(2)}`;
    }
    if (digits.length !== LOCAL_PHONE_LENGTH) {
      return { code: 'PHONE_LENGTH', message: `Số điện thoại phải có ${LOCAL_PHONE_LENGTH} chữ số, nhận được ${digits.length}.` };
    }
    if (!this.prefixes.has(digits.slice(0, 3))) {
      return { code: 'PHONE_PREFIX', message: `Đầu số ${digits.slice(0, 3)} không thuộc danh mục đầu số di động.` };
    }
    return { phone: digits };
  }

  /** Kiểm tra từng trường, không ném lỗi: trả { out (giá trị hợp lệ), errors }. */
  inspect(body, today) {
    const errors = [];
    const out = {};

    const fullName = typeof body.fullName === 'string' ? toTitleCase(body.fullName) : '';
    if (!fullName) errors.push({ field: 'fullName', code: 'MISSING_FIELD', message: 'Thiếu họ tên.' });
    else if (fullName.length < NAME_MIN || fullName.length > NAME_MAX) {
      errors.push({ field: 'fullName', code: 'NAME_LENGTH', message: `Họ tên dài ${NAME_MIN}–${NAME_MAX} ký tự.` });
    } else out.fullName = fullName;

    const phone = this.normalizePhone(body.phone);
    if (phone.code) errors.push({ field: 'phone', code: phone.code, message: phone.message });
    else out.phone = phone.phone;

    out.email = null;
    if (!isBlank(body.email)) {
      const email = String(body.email).trim().toLowerCase();
      if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
        errors.push({ field: 'email', code: 'EMAIL_INVALID', message: 'Email không đúng dạng ten@mien.tld (tối đa 100 ký tự).' });
      } else out.email = email;
    }

    out.address = null;
    if (!isBlank(body.address)) {
      const address = String(body.address).trim();
      if (address.length > ADDRESS_MAX) {
        errors.push({ field: 'address', code: 'ADDRESS_TOO_LONG', message: `Địa chỉ tối đa ${ADDRESS_MAX} ký tự.` });
      } else out.address = address;
    }

    const todayIso = today.toISOString().slice(0, 10);
    for (const field of ['birthDate', 'createdDate']) {
      out[field] = null;
      if (isBlank(body[field])) continue;
      const iso = toIsoDate(String(body[field]).trim());
      if (!iso || iso > todayIso) {
        errors.push({ field, code: 'DATE_INVALID', message: 'Ngày phải theo dạng yyyy-mm-dd hoặc dd/mm/yyyy và không sau hôm nay.' });
      } else out[field] = iso;
    }
    return { out, errors };
  }

  /**
   * @param {object} input hồ sơ thô { fullName, phone, email?, address?, birthDate?, createdDate? }
   * @param {Date} today mốc "hôm nay", để chặn ngày ở tương lai
   * @returns {object} dữ liệu đã chuẩn hóa
   * @throws {ValidationError} có danh sách lỗi theo từng trường
   */
  validateCustomer(input, today = new Date()) {
    const body = input && typeof input === 'object' ? input : {};
    const { out, errors } = this.inspect(body, today);
    if (errors.length) {
      throw new ValidationError(`Dữ liệu không hợp lệ ở các trường: ${errors.map((e) => e.field).join(', ')}`, errors);
    }
    return out;
  }

  /**
   * Kiểm tra một dòng CSV (cột theo BR8) khi nhập file. Không ném lỗi: lỗi của dòng được ghi lại (BR3).
   * @param {object} row { ho_ten, so_dien_thoai, email, dia_chi, ngay_sinh, ngay_tao }
   * @returns {{normalized: object, errors: object[], customer: object|null}}
   *   normalized: giá trị sau chuẩn hóa để lưu vào bản ghi nhập (họ tên, SĐT giữ cả khi lỗi, để người sửa còn thấy);
   *   errors: [{ field, code, message }] với code thuộc 6 mã quy tắc kiểm tra;
   *   customer: dữ liệu hợp lệ để tạo hồ sơ, null nếu dòng còn lỗi (BR3).
   */
  checkRecord(row, today = new Date()) {
    const address = isBlank(row.dia_chi) ? null : String(row.dia_chi).trim().slice(0, ADDRESS_MAX);
    const { out, errors } = this.inspect({
      fullName: row.ho_ten,
      phone: row.so_dien_thoai,
      email: row.email,
      address,
      birthDate: row.ngay_sinh,
      createdDate: row.ngay_tao,
    }, today);

    const list = errors.map((e) => (e.code === 'NAME_LENGTH' ? { ...e, code: 'MISSING_FIELD' } : e));
    // BR3: ngày tạo là trường bắt buộc (khác khi tạo hồ sơ tay, nơi mặc định là hôm nay).
    if (!out.createdDate && !list.some((e) => e.field === 'createdDate')) {
      list.push({ field: 'createdDate', code: 'MISSING_FIELD', message: 'Thiếu ngày tạo hồ sơ.' });
    }

    const normalized = {
      fullName: out.fullName ?? this.looseName(row.ho_ten),
      phone: out.phone ?? this.loosePhone(row.so_dien_thoai),
      email: out.email,
      address: out.address,
      birthDate: out.birthDate,
      createdDate: out.createdDate,
    };
    return { normalized, errors: list, customer: list.length ? null : out };
  }

  looseName(raw) {
    return isBlank(raw) ? null : toTitleCase(String(raw)).slice(0, STG_NAME_MAX);
  }

  /** SĐT lỗi vẫn giữ phần chữ số (đã đổi 84 thành 0) để hiển thị; chứa chữ cái thì bỏ. */
  loosePhone(raw) {
    if (isBlank(raw)) return null;
    const text = String(raw).trim();
    if (/[^\d\s.\-+()]/.test(text)) return null;
    let digits = text.replace(/\D/g, '');
    if (digits.startsWith('84') && digits.length === LOCAL_PHONE_LENGTH + 1) digits = `0${digits.slice(2)}`;
    return digits ? digits.slice(0, STG_PHONE_MAX) : null;
  }
}

module.exports = { RecordValidator, loadPhonePrefixes, toTitleCase };
