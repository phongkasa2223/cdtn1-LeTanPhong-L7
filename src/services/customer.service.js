const { AppError, ValidationError, ConstraintError } = require('../errors/AppError');

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Dòng CSDL (snake_case) -> đối tượng trả về cho API (camelCase, customerId là mã hiển thị). */
function toDto(row) {
  return {
    customerId: row.customer_code,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    birthDate: row.birth_date,
    createdDate: row.created_date,
    mergedInto: row.merged_into_code || null,
  };
}

function parsePositiveInt(value, fallback) {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/**
 * Lớp nghiệp vụ cho hồ sơ khách hàng. KHÔNG biết gì về HTTP hay SQL.
 * Nhận validator và repository qua hàm khởi tạo nên test được bằng đối tượng giả.
 */
class CustomerService {
  constructor(customers, validator, now = () => new Date()) {
    this.customers = customers;
    this.validator = validator;
    this.now = now;
  }

  /** QT-01: mỗi SĐT chỉ thuộc về một hồ sơ. */
  async assertPhoneFree(phone, ownId = null) {
    const existing = await this.customers.findByPhone(phone);
    if (existing && existing.customer_id !== ownId) {
      throw new AppError('DUPLICATE_PHONE', `Số điện thoại ${phone} đã thuộc hồ sơ ${existing.customer_code}.`,
        { customerId: existing.customer_code });
    }
  }

  async create(input) {
    const data = this.validator.validateCustomer(input, this.now());
    await this.assertPhoneFree(data.phone);
    data.createdDate = data.createdDate || this.now().toISOString().slice(0, 10);
    const code = await this.guard(() => this.customers.insert(data));
    return toDto(await this.customers.findByCode(code));
  }

  async get(code) {
    const row = await this.customers.findByCode(code);
    if (!row) throw new AppError('CUSTOMER_NOT_FOUND', `Không tìm thấy hồ sơ khách hàng ${code}.`);
    return row;
  }

  async getDto(code) {
    return toDto(await this.get(code));
  }

  /** FR7: tra cứu theo SĐT ở bất kỳ dạng nào (0901 234 567, +84901234567, ...). */
  async findByPhone(rawPhone) {
    const phone = this.validator.normalizePhone(rawPhone);
    if (phone.code) {
      throw new ValidationError('Số điện thoại tra cứu không hợp lệ.',
        [{ field: 'phone', code: phone.code, message: phone.message }]);
    }
    const row = await this.customers.findByPhone(phone.phone);
    if (!row) throw new AppError('CUSTOMER_NOT_FOUND', `Không có hồ sơ nào dùng số ${phone.phone}.`);
    return toDto(row);
  }

  async list({ page, size } = {}) {
    const pageNo = parsePositiveInt(page, 1);
    const pageSize = parsePositiveInt(size, DEFAULT_PAGE_SIZE);
    if (pageNo === null || pageSize === null || pageSize > MAX_PAGE_SIZE) {
      throw new AppError('INVALID_PAGE', `page >= 1 và 1 <= size <= ${MAX_PAGE_SIZE}.`);
    }
    const { rows, total } = await this.customers.list({ page: pageNo, size: pageSize });
    return { data: rows.map(toDto), page: pageNo, size: pageSize, total };
  }

  async update(code, input) {
    const current = await this.get(code);
    // QT-13: hồ sơ đã gộp chỉ còn để tra cứu lịch sử, không sửa nữa.
    if (current.merged_into_id) {
      throw new AppError('CUSTOMER_MERGED', `Hồ sơ ${code} đã gộp vào ${current.merged_into_code}, không sửa được.`);
    }
    const data = this.validator.validateCustomer(input, this.now());
    await this.assertPhoneFree(data.phone, current.customer_id);
    await this.guard(() => this.customers.update(current.customer_id, data));
    return this.getDto(code);
  }

  async remove(code) {
    const current = await this.get(code);
    await this.guard(() => this.customers.delete(current.customer_id));
  }

  /** Đổi lỗi ràng buộc trung tính của repository thành mã nghiệp vụ. */
  async guard(action) {
    try {
      return await action();
    } catch (err) {
      if (!(err instanceof ConstraintError)) throw err;
      if (err.kind === 'DUPLICATE') {
        throw new AppError('DUPLICATE_PHONE', 'Số điện thoại đã thuộc một hồ sơ khác.');
      }
      throw new AppError('CUSTOMER_IN_USE',
        'Hồ sơ đang được tham chiếu (bản ghi nhập, cặp nghi trùng hoặc hồ sơ đã gộp), không xóa được.');
    }
  }
}

module.exports = { CustomerService, toDto };
