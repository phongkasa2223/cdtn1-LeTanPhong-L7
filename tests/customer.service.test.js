const test = require('node:test');
const assert = require('node:assert/strict');
const { CustomerService } = require('../src/services/customer.service');
const { RecordValidator } = require('../src/services/record-validator');
const { ConstraintError } = require('../src/errors/AppError');

const NOW = () => new Date('2026-10-17T08:00:00Z');

/** Repository giả trong bộ nhớ, test không cần DB. */
function fakeRepo(rows = [], hooks = {}) {
  const table = rows.map((r) => ({ ...r }));
  return {
    table,
    findByCode: async (code) => table.find((r) => r.customer_code === code) || null,
    findByPhone: async (phone) => table.find((r) => r.phone === phone) || null,
    list: async ({ page, size }) => ({ rows: table.slice((page - 1) * size, page * size), total: table.length }),
    insert: hooks.insert || (async (data) => {
      const id = table.length + 1;
      const code = `C${String(id).padStart(6, '0')}`;
      table.push({ customer_id: id, customer_code: code, full_name: data.fullName, phone: data.phone,
        email: data.email, address: data.address, birth_date: data.birthDate,
        created_date: data.createdDate, merged_into_id: null, merged_into_code: null });
      return code;
    }),
    update: async () => {},
  };
}

const existing = {
  customer_id: 1, customer_code: 'C000001', full_name: 'Nguyễn Văn An', phone: '0901234567',
  email: null, address: null, birth_date: null, created_date: '2024-03-10',
  merged_into_id: null, merged_into_code: null,
};
const merged = { ...existing, customer_id: 2, customer_code: 'C000002', phone: '0987654321',
  merged_into_id: 1, merged_into_code: 'C000001' };
const service = (repo) => new CustomerService(repo, RecordValidator.fromConfig(), NOW);

// --- Luồng đúng ---

test('TC-S1 tạo hồ sơ: SĐT +84 được chuẩn hóa về 0xxxxxxxxx, ngày tạo mặc định là hôm nay', async () => {
  const dto = await service(fakeRepo()).create({ fullName: 'Trần Thị Bích', phone: '+84 912 345 678' });
  assert.equal(dto.customerId, 'C000001');
  assert.equal(dto.phone, '0912345678');
  assert.equal(dto.createdDate, '2026-10-17');
});

// --- QT-01: SĐT duy nhất ---

test('TC-S2 QT-01: tạo hồ sơ có SĐT đã tồn tại (viết khác dạng) bị từ chối', async () => {
  await assert.rejects(
    () => service(fakeRepo([existing])).create({ fullName: 'Người Khác', phone: '0901 234 567' }),
    (err) => err.code === 'DUPLICATE_PHONE' && err.details.customerId === 'C000001',
  );
});

test('TC-S3 QT-01: hai yêu cầu đồng thời – CSDL báo trùng khóa vẫn ra DUPLICATE_PHONE', async () => {
  const racing = fakeRepo([], { insert: async () => { throw new ConstraintError('DUPLICATE', '1062'); } });
  await assert.rejects(
    () => service(racing).create({ fullName: 'Lê Hoàng Nam', phone: '0932111222' }),
    (err) => err.code === 'DUPLICATE_PHONE',
  );
});

test('TC-S4 sửa hồ sơ giữ nguyên SĐT của chính nó thì không bị coi là trùng', async () => {
  const dto = await service(fakeRepo([existing])).update('C000001',
    { fullName: 'Nguyễn Văn An', phone: '0901234567', address: '12 Lê Lợi' });
  assert.equal(dto.customerId, 'C000001');
});

test('TC-S5 sửa SĐT sang số của hồ sơ khác bị từ chối', async () => {
  const other = { ...existing, customer_id: 3, customer_code: 'C000003', phone: '0912345678' };
  await assert.rejects(
    () => service(fakeRepo([existing, other])).update('C000001', { fullName: 'Nguyễn Văn An', phone: '0912345678' }),
    (err) => err.code === 'DUPLICATE_PHONE',
  );
});

// --- QT-13: hồ sơ đã gộp ---

test('TC-S6 QT-13: hồ sơ đã gộp không sửa được', async () => {
  await assert.rejects(
    () => service(fakeRepo([existing, merged])).update('C000002', { fullName: 'Nguyen Van An', phone: '0987654321' }),
    (err) => err.code === 'CUSTOMER_MERGED',
  );
});

test('TC-S7 BR5: dịch vụ không có thao tác xóa hồ sơ khách hàng', () => {
  assert.equal(typeof service(fakeRepo()).remove, 'undefined');
});

// --- Dữ liệu sai ---

test('TC-S8 tra cứu hồ sơ không tồn tại trả CUSTOMER_NOT_FOUND', async () => {
  await assert.rejects(() => service(fakeRepo()).getDto('C999999'), (err) => err.code === 'CUSTOMER_NOT_FOUND');
});

test('TC-S9 tạo hồ sơ với SĐT sai độ dài bị từ chối kèm mã PHONE_LENGTH', async () => {
  await assert.rejects(
    () => service(fakeRepo()).create({ fullName: 'Lý Gia Bảo', phone: '09012345' }),
    (err) => err.code === 'VALIDATION_ERROR' && err.details[0].code === 'PHONE_LENGTH',
  );
});

test('TC-S10 size vượt 100 bị từ chối, mặc định 50 dòng mỗi trang', async () => {
  const svc = service(fakeRepo([existing]));
  await assert.rejects(() => svc.list({ size: '101' }), (err) => err.code === 'INVALID_PAGE');
  assert.equal((await svc.list({})).size, 50);
});
