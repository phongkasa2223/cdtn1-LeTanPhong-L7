const test = require('node:test');
const assert = require('node:assert/strict');
const { CustomerService } = require('../src/services/customer.service');
const { RecordValidator } = require('../src/services/record-validator');
const { ConstraintError } = require('../src/errors/AppError');

const NOW = () => new Date('2026-10-17T08:00:00Z');
const MANAGER = { role: 'DATA_MANAGER' }; // thấy SĐT đầy đủ (QT-15)
const STAFF = { role: 'DATA_STAFF' };

/** Repository giả trong bộ nhớ, test không cần DB. Xóa mềm giống bảng thật: hồ sơ vẫn nằm trong table, chỉ có deleted_at. */
function fakeRepo(rows = [], hooks = {}) {
  const table = rows.map((r) => ({ deleted_at: null, ...r }));
  const visible = (row, includeDeleted) => includeDeleted || !row.deleted_at;
  return {
    table,
    findByCode: async (code, { includeDeleted = false } = {}) => (
      table.find((r) => r.customer_code === code && visible(r, includeDeleted)) || null),
    findByPhone: async (phone, { includeDeleted = false } = {}) => (
      table.find((r) => r.phone === phone && visible(r, includeDeleted)) || null),
    list: async ({ page, size }) => {
      const active = table.filter((r) => !r.deleted_at);
      return { rows: active.slice((page - 1) * size, page * size), total: active.length };
    },
    insert: hooks.insert || (async (data) => {
      const id = table.length + 1;
      const code = `C${String(id).padStart(6, '0')}`;
      table.push({ customer_id: id, customer_code: code, full_name: data.fullName, phone: data.phone,
        email: data.email, address: data.address, birth_date: data.birthDate,
        created_date: data.createdDate, merged_into_id: null, merged_into_code: null, deleted_at: null });
      return code;
    }),
    update: async () => {},
    lockByIds: async (ids) => table.filter((r) => ids.includes(r.customer_id)).map((r) => ({ ...r })),
    countMergedInto: async (customerId) => table.filter((r) => r.merged_into_id === customerId).length,
    softDelete: async (customerId) => {
      table.find((r) => r.customer_id === customerId).deleted_at = '2026-10-17 15:00:00';
    },
  };
}

/** Cặp nghi trùng giả: chỉ cần biết hồ sơ nào đang nằm trong bao nhiêu cặp chờ duyệt. */
const fakePairs = (pendingByCustomer = {}) => ({
  countPendingOf: async (customerId) => pendingByCustomer[customerId] ?? 0,
});

const existing = {
  customer_id: 1, customer_code: 'C000001', full_name: 'Nguyễn Văn An', phone: '0901234567',
  email: null, address: null, birth_date: null, created_date: '2024-03-10',
  merged_into_id: null, merged_into_code: null,
};
const merged = { ...existing, customer_id: 2, customer_code: 'C000002', phone: '0987654321',
  merged_into_id: 1, merged_into_code: 'C000001' };
const service = (repo, pairs = fakePairs()) => new CustomerService(
  repo, RecordValidator.fromConfig(), NOW, { run: (work) => work({ customers: repo, pairs }) },
);

// --- Luồng đúng ---

test('TC-S1 tạo hồ sơ: SĐT +84 được chuẩn hóa về 0xxxxxxxxx, ngày tạo mặc định là hôm nay', async () => {
  const dto = await service(fakeRepo()).create({ fullName: 'Trần Thị Bích', phone: '+84 912 345 678' }, MANAGER);
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

// --- BR5: xóa MỀM (S1) ---

test('TC-S7 BR5: xóa là xóa mềm, hồ sơ vẫn nằm trong kho với deleted_at nhưng tra cứu và liệt kê không còn thấy', async () => {
  const repo = fakeRepo([existing]);
  const svc = service(repo);
  await svc.remove('C000001');
  assert.equal(repo.table.length, 1); // không xóa vật lý
  assert.ok(repo.table[0].deleted_at); // chỉ đánh dấu
  await assert.rejects(() => svc.getDto('C000001'), (err) => err.code === 'CUSTOMER_NOT_FOUND');
  await assert.rejects(() => svc.findByPhone('0901234567', STAFF), (err) => err.code === 'CUSTOMER_NOT_FOUND');
  assert.equal((await svc.list({}, STAFF)).total, 0);
});

test('TC-S13 xóa hồ sơ không tồn tại, hoặc xóa lần thứ hai, đều trả CUSTOMER_NOT_FOUND', async () => {
  const svc = service(fakeRepo([existing]));
  await assert.rejects(() => svc.remove('C999999'), (err) => err.code === 'CUSTOMER_NOT_FOUND');
  await svc.remove('C000001');
  await assert.rejects(() => svc.remove('C000001'), (err) => err.code === 'CUSTOMER_NOT_FOUND');
});

test('TC-S14 QT-13: hồ sơ đã gộp vào hồ sơ khác không xóa được', async () => {
  const repo = fakeRepo([existing, merged]);
  await assert.rejects(() => service(repo).remove('C000002'), (err) => err.code === 'CUSTOMER_MERGED');
  assert.equal(repo.table[1].deleted_at, null);
});

test('TC-S15 hồ sơ giữ lại (đã có hồ sơ gộp vào) không xóa được', async () => {
  const repo = fakeRepo([existing, merged]);
  await assert.rejects(
    () => service(repo).remove('C000001'),
    (err) => err.code === 'CUSTOMER_HAS_MERGED' && /1 hồ sơ/.test(err.message),
  );
  assert.equal(repo.table[0].deleted_at, null);
});

test('TC-S16 hồ sơ đang nằm trong cặp nghi trùng chờ duyệt không xóa được, phải duyệt cặp trước', async () => {
  const repo = fakeRepo([existing]);
  await assert.rejects(
    () => service(repo, fakePairs({ 1: 2 })).remove('C000001'),
    (err) => err.code === 'CUSTOMER_IN_PENDING_PAIR' && /2 cặp/.test(err.message),
  );
  assert.equal(repo.table[0].deleted_at, null);
});

test('TC-S17 QT-01: SĐT của hồ sơ đã xóa vẫn bị giữ, tạo hồ sơ mới với số đó báo DUPLICATE_PHONE kèm deleted=true', async () => {
  const repo = fakeRepo([existing]);
  const svc = service(repo);
  await svc.remove('C000001');
  await assert.rejects(
    () => svc.create({ fullName: 'Người Mới', phone: '0901234567' }),
    (err) => err.code === 'DUPLICATE_PHONE' && err.details.deleted === true && /khôi phục/.test(err.message),
  );
});

test('TC-S18 hồ sơ đã xóa không sửa được (coi như không tồn tại)', async () => {
  const svc = service(fakeRepo([existing]));
  await svc.remove('C000001');
  await assert.rejects(
    () => svc.update('C000001', { fullName: 'Nguyễn Văn An', phone: '0901234567' }),
    (err) => err.code === 'CUSTOMER_NOT_FOUND',
  );
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
  await assert.rejects(() => svc.list({ size: '101' }, STAFF), (err) => err.code === 'INVALID_PAGE');
  assert.equal((await svc.list({}, STAFF)).size, 50);
});

// --- QT-15: che SĐT theo vai trò ---

test('TC-S11 QT-15: tra cứu theo SĐT, nhân viên nhận SĐT đã che còn quản lý nhận đầy đủ', async () => {
  const svc = service(fakeRepo([existing]));
  assert.equal((await svc.findByPhone('+84 901 234 567', STAFF)).phone, '090****567');
  assert.equal((await svc.findByPhone('0901234567', MANAGER)).phone, '0901234567');
});

test('TC-S12 US6-AC2: tra bằng SĐT của hồ sơ đã gộp thì ra hồ sơ giữ lại', async () => {
  const svc = service(fakeRepo([existing, merged]));
  const found = await svc.findByPhone('0987654321', MANAGER);
  assert.equal(found.customerId, 'C000001');
  assert.equal(found.mergedInto, null);
});
