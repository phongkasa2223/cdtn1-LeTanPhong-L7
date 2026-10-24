const test = require('node:test');
const assert = require('node:assert/strict');
const { RecordValidator, loadPhonePrefixes } = require('../src/services/record-validator');

const validator = RecordValidator.fromConfig();
const TODAY = new Date('2026-10-17T00:00:00Z');
const baseInput = { fullName: 'Nguyễn Văn An', phone: '0901234567' };

// --- QT-02: chuẩn hóa SĐT ---

test('TC-V1 các dạng viết khác nhau của cùng một SĐT đều về 0901234567', () => {
  for (const raw of ['0901234567', '0901 234 567', '84901234567', '+84 901.234.567', '(090) 123-4567']) {
    assert.equal(validator.normalizePhone(raw).phone, '0901234567', raw);
  }
});

test('TC-V2 SĐT sai được gắn đúng mã lỗi', () => {
  assert.equal(validator.normalizePhone('').code, 'MISSING_FIELD');
  assert.equal(validator.normalizePhone('abc0901234567').code, 'PHONE_CHAR');
  assert.equal(validator.normalizePhone('09012345').code, 'PHONE_LENGTH');
  assert.equal(validator.normalizePhone('0101234567').code, 'PHONE_PREFIX');
});

// --- NFR5: đầu số nằm trong file cấu hình ---

test('TC-V3 thêm đầu số mới chỉ cần đổi danh mục, không đổi mã nguồn', () => {
  assert.equal(validator.normalizePhone('0111234567').code, 'PHONE_PREFIX');
  const widened = new RecordValidator([...loadPhonePrefixes(), '011']);
  assert.equal(widened.normalizePhone('0111234567').phone, '0111234567');
});

// --- Các trường còn lại ---

test('TC-V4 chuẩn hóa họ tên, email và ngày dd/mm/yyyy', () => {
  const out = validator.validateCustomer({
    ...baseInput, fullName: '  Nguyễn   Văn  An ', email: ' An.Nguyen@Gmail.com ', birthDate: '12/05/1990',
  }, TODAY);
  assert.equal(out.fullName, 'Nguyễn Văn An');
  assert.equal(out.email, 'an.nguyen@gmail.com');
  assert.equal(out.birthDate, '1990-05-12');
});

test('TC-V5 gom đủ lỗi của nhiều trường trong một lần ném', () => {
  assert.throws(
    () => validator.validateCustomer({ fullName: '', phone: '123', email: 'sai', birthDate: '31/02/2024' }, TODAY),
    (err) => {
      assert.equal(err.code, 'VALIDATION_ERROR');
      assert.deepEqual(err.details.map((d) => d.field), ['fullName', 'phone', 'email', 'birthDate']);
      return true;
    },
  );
});

test('TC-V6 ngày sinh ở tương lai bị từ chối', () => {
  assert.throws(() => validator.validateCustomer({ ...baseInput, birthDate: '2027-01-01' }, TODAY),
    (err) => err.details[0].code === 'DATE_INVALID');
});

test('TC-V7 họ tên được viết hoa chữ cái đầu mỗi từ (BR1)', () => {
  const out = validator.validateCustomer({ ...baseInput, fullName: '  NGUYỄN   văn  AN ' }, TODAY);
  assert.equal(out.fullName, 'Nguyễn Văn An');
});

// --- Kiểm tra một dòng CSV khi nhập file ---

const csvRow = {
  ho_ten: 'trần thị bích', so_dien_thoai: '+84 912 345 678', email: 'Bich@Gmail.com',
  dia_chi: '12 Lê Lợi', ngay_sinh: '02/11/1985', ngay_tao: '2024-06-21',
};

test('TC-V8 checkRecord: dòng hợp lệ trả hồ sơ đã chuẩn hóa và không có lỗi', () => {
  const result = validator.checkRecord(csvRow, TODAY);
  assert.deepEqual(result.errors, []);
  assert.equal(result.customer.fullName, 'Trần Thị Bích');
  assert.equal(result.customer.phone, '0912345678');
  assert.equal(result.customer.birthDate, '1985-11-02');
});

test('TC-V9 checkRecord: dòng lỗi không có hồ sơ (BR3), mã lỗi thuộc 6 mã quy tắc, họ tên và SĐT vẫn được giữ', () => {
  const result = validator.checkRecord({ ...csvRow, so_dien_thoai: '09012345', email: 'sai' }, TODAY);
  assert.equal(result.customer, null);
  assert.deepEqual(result.errors.map((e) => e.code), ['PHONE_LENGTH', 'EMAIL_INVALID']);
  assert.equal(result.normalized.phone, '09012345');
  assert.equal(result.normalized.fullName, 'Trần Thị Bích');
  assert.equal(result.normalized.email, null);
});

test('TC-V10 checkRecord: thiếu ngày tạo là lỗi bắt buộc, thiếu ngày sinh thì không', () => {
  const result = validator.checkRecord({ ...csvRow, ngay_tao: '', ngay_sinh: '' }, TODAY);
  assert.deepEqual(result.errors.map((e) => [e.field, e.code]), [['createdDate', 'MISSING_FIELD']]);
});

test('TC-V11 checkRecord: địa chỉ quá dài bị cắt, không làm dòng lỗi', () => {
  const result = validator.checkRecord({ ...csvRow, dia_chi: 'x'.repeat(300) }, TODAY);
  assert.deepEqual(result.errors, []);
  assert.equal(result.customer.address.length, 255);
});
