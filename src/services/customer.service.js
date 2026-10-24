const { AppError, ValidationError, ConstraintError } = require('../errors/AppError');
const { toCustomerView } = require('./customer.contract');

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value, fallback) {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** Nghiệp vụ khách hàng, không biết HTTP hay SQL. Nhận repository và validator qua constructor. */
class CustomerService {
  constructor(customers, validator, now = () => new Date()) {
    this.customers = customers;
    this.validator = validator;
    this.now = now;
  }

  /** QT-01: mỗi SĐT chỉ thuộc một hồ sơ. */
  async assertPhoneFree(phone, ownId = null) {
    const existing = await this.customers.findByPhone(phone);
    if (existing && existing.customer_id !== ownId) {
      throw new AppError('DUPLICATE_PHONE', `Số điện thoại ${phone} đã thuộc hồ sơ ${existing.customer_code}.`,
        { customerId: existing.customer_code });
    }
  }

  async create(input, viewer) {
    const data = this.validator.validateCustomer(input, this.now());
    await this.assertPhoneFree(data.phone);
    data.createdDate = data.createdDate || this.now().toISOString().slice(0, 10);
    const code = await this.guard(() => this.customers.insert(data));
    return toCustomerView(await this.customers.findByCode(code), viewer);
  }

  async get(code) {
    const row = await this.customers.findByCode(code);
    if (!row) throw new AppError('CUSTOMER_NOT_FOUND', `Không tìm thấy hồ sơ khách hàng ${code}.`);
    return row;
  }

  async getDto(code, viewer) {
    return toCustomerView(await this.get(code), viewer);
  }

  /** FR7: tra theo SĐT, viết dạng nào cũng được (0901 234 567, +84901234567...). */
  async findByPhone(rawPhone, viewer) {
    const phone = this.validator.normalizePhone(rawPhone);
    if (phone.code) {
      throw new ValidationError('Số điện thoại tra cứu không hợp lệ.',
        [{ field: 'phone', code: phone.code, message: phone.message }]);
    }
    const row = await this.customers.findByPhone(phone.phone);
    if (!row) throw new AppError('CUSTOMER_NOT_FOUND', `Không có hồ sơ nào dùng số ${phone.phone}.`);
    return toCustomerView(row, viewer);
  }

  async list({ page, size } = {}, viewer) {
    const pageNo = parsePositiveInt(page, 1);
    const pageSize = parsePositiveInt(size, DEFAULT_PAGE_SIZE);
    if (pageNo === null || pageSize === null || pageSize > MAX_PAGE_SIZE) {
      throw new AppError('INVALID_PAGE', `page >= 1 và 1 <= size <= ${MAX_PAGE_SIZE}.`);
    }
    const { rows, total } = await this.customers.list({ page: pageNo, size: pageSize });
    return { data: rows.map((row) => toCustomerView(row, viewer)), page: pageNo, size: pageSize, total };
  }

  async update(code, input, viewer) {
    const current = await this.get(code);
    // QT-13: hồ sơ đã gộp thì không sửa nữa.
    if (current.merged_into_id) {
      throw new AppError('CUSTOMER_MERGED', `Hồ sơ ${code} đã gộp vào ${current.merged_into_code}, không sửa được.`);
    }
    const data = this.validator.validateCustomer(input, this.now());
    await this.assertPhoneFree(data.phone, current.customer_id);
    await this.guard(() => this.customers.update(current.customer_id, data));
    return this.getDto(code, viewer);
  }

  /** Đổi lỗi trùng khóa của DB (2 request cùng SĐT cùng lúc) thành DUPLICATE_PHONE. */
  async guard(action) {
    try {
      return await action();
    } catch (err) {
      if (err instanceof ConstraintError && err.kind === 'DUPLICATE') {
        throw new AppError('DUPLICATE_PHONE', 'Số điện thoại đã thuộc một hồ sơ khác.');
      }
      throw err;
    }
  }
}

module.exports = { CustomerService };
