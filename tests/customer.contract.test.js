const test = require('node:test');
const assert = require('node:assert/strict');
const { maskPhone, toCustomerView } = require('../src/services/customer.contract');

const row = {
  customer_id: 7, customer_code: 'C000007', full_name: 'Nguyễn Văn An', phone: '0901234567',
  email: 'an@gmail.com', address: null, birth_date: '1990-05-12', created_date: '2024-03-10',
  merged_into_id: null, merged_into_code: null,
};
const STAFF = { role: 'DATA_STAFF' };
const MANAGER = { role: 'DATA_MANAGER' };

test('TC-C1 hợp đồng: hồ sơ trả ra có đúng các trường, không lộ tên cột của bảng', () => {
  const view = toCustomerView(row, MANAGER);
  assert.deepEqual(Object.keys(view).sort(),
    ['address', 'birthDate', 'createdDate', 'customerId', 'email', 'fullName', 'mergedInto', 'phone']);
  assert.equal(view.customerId, 'C000007');
  assert.equal(view.address, null);
});

test('TC-C2 QT-15: nhân viên thấy SĐT dạng che, quản lý thấy đầy đủ', () => {
  assert.equal(toCustomerView(row, STAFF).phone, '090****567');
  assert.equal(toCustomerView(row, MANAGER).phone, '0901234567');
});

test('TC-C3 QT-15: không rõ người xem thì mặc định che (an toàn trước)', () => {
  assert.equal(toCustomerView(row, undefined).phone, '090****567');
  assert.equal(toCustomerView(row, { role: 'KHAC' }).phone, '090****567');
});

test('TC-C4 maskPhone: giá trị biên (rỗng, quá ngắn)', () => {
  assert.equal(maskPhone(null), null);
  assert.equal(maskPhone(''), null);
  assert.equal(maskPhone('12345'), '***');
  assert.equal(maskPhone('0901234'), '090****234');
});

test('TC-C5 hồ sơ đã gộp ghi rõ mã hồ sơ giữ lại', () => {
  const view = toCustomerView({ ...row, merged_into_id: 1, merged_into_code: 'C000001' }, STAFF);
  assert.equal(view.mergedInto, 'C000001');
});
