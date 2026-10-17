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

/** NFR5: danh mục đầu số đọc từ file cấu hình, mã nguồn không chứa đầu số nào. */
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

/**
 * Chuẩn hóa và kiểm tra một hồ sơ khách hàng (BR1–BR3, QT-02).
 * Chỉ biết dữ liệu trong bộ nhớ: không đụng HTTP, không đụng CSDL.
 */
class RecordValidator {
  constructor(prefixes) {
    this.prefixes = new Set(prefixes);
  }

  static fromConfig() {
    return new RecordValidator(loadPhonePrefixes());
  }

  /** QT-02: đưa SĐT về dạng 0xxxxxxxxx. Trả về { phone } hoặc { code, message }. */
  normalizePhone(raw) {
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return { code: 'MISSING_FIELD', message: 'Thiếu số điện thoại.' };
    }
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

  /**
   * @param {object} input  { fullName, phone, email?, address?, birthDate?, createdDate? }
   * @param {Date} today    mốc "hôm nay" để kiểm ngày không ở tương lai
   * @returns {object} dữ liệu đã chuẩn hóa
   * @throws {ValidationError} kèm danh sách lỗi theo từng trường
   */
  validateCustomer(input, today = new Date()) {
    const body = input && typeof input === 'object' ? input : {};
    const errors = [];
    const out = {};

    const fullName = typeof body.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : '';
    if (!fullName) errors.push({ field: 'fullName', code: 'MISSING_FIELD', message: 'Thiếu họ tên.' });
    else if (fullName.length < NAME_MIN || fullName.length > NAME_MAX) {
      errors.push({ field: 'fullName', code: 'NAME_LENGTH', message: `Họ tên dài ${NAME_MIN}–${NAME_MAX} ký tự.` });
    } else out.fullName = fullName;

    const phone = this.normalizePhone(body.phone);
    if (phone.code) errors.push({ field: 'phone', code: phone.code, message: phone.message });
    else out.phone = phone.phone;

    out.email = null;
    if (body.email !== undefined && body.email !== null && String(body.email).trim() !== '') {
      const email = String(body.email).trim().toLowerCase();
      if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
        errors.push({ field: 'email', code: 'EMAIL_INVALID', message: 'Email không đúng dạng ten@mien.tld (tối đa 100 ký tự).' });
      } else out.email = email;
    }

    out.address = null;
    if (body.address !== undefined && body.address !== null && String(body.address).trim() !== '') {
      const address = String(body.address).trim();
      if (address.length > ADDRESS_MAX) {
        errors.push({ field: 'address', code: 'ADDRESS_TOO_LONG', message: `Địa chỉ tối đa ${ADDRESS_MAX} ký tự.` });
      } else out.address = address;
    }

    const todayIso = today.toISOString().slice(0, 10);
    for (const field of ['birthDate', 'createdDate']) {
      out[field] = null;
      const value = body[field];
      if (value === undefined || value === null || String(value).trim() === '') continue;
      const iso = toIsoDate(String(value).trim());
      if (!iso || iso > todayIso) {
        errors.push({ field, code: 'DATE_INVALID', message: 'Ngày phải theo dạng yyyy-mm-dd hoặc dd/mm/yyyy và không sau hôm nay.' });
      } else out[field] = iso;
    }

    if (errors.length) {
      throw new ValidationError(`Dữ liệu không hợp lệ ở các trường: ${errors.map((e) => e.field).join(', ')}`, errors);
    }
    return out;
  }
}

module.exports = { RecordValidator, loadPhonePrefixes };
