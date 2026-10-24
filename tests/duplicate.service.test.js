const test = require('node:test');
const assert = require('node:assert/strict');
const { DuplicateService } = require('../src/services/duplicate.service');
const {
  createStore, addCustomer, addPair, makeUow, makeReadPairRepos,
} = require('./helpers/import-fakes');

const LAN = { userId: 1, username: 'nv.lan', role: 'DATA_STAFF', storeCode: 'CH01' };
const MINH = { userId: 2, username: 'nv.minh', role: 'DATA_STAFF', storeCode: 'CH02' };
const MANAGER = { userId: 3, username: 'ql.hung', role: 'DATA_MANAGER', storeCode: null };

/** Hai hồ sơ cùng email, khác SĐT; lần nhập I001 của cửa hàng CH01, I002 của CH02. */
function setup(hooks = {}) {
  const store = createStore();
  store.batches.push(
    { import_batch_id: 1, import_code: 'I001', imported_by: 1 },
    { import_batch_id: 2, import_code: 'I002', imported_by: 2 },
  );
  const a = addCustomer(store, {
    fullName: 'Nguyễn Văn An', phone: '0901234567', email: 'an@gmail.com', birthDate: '1990-05-12',
  });
  const b = addCustomer(store, {
    fullName: 'Nguyen Van An', phone: '0987654321', email: 'an@gmail.com', birthDate: '1990-05-12', address: '45 Nguyễn Huệ',
  });
  const pairCode = addPair(store, { batchId: 1, aId: a, bId: b, matchedBy: 'EMAIL', similarity: 0.93 });
  const service = new DuplicateService({ uow: makeUow(store, hooks), read: makeReadPairRepos(store) });
  return {
    store, service, a, b, pairCode,
  };
}
const customer = (store, id) => store.customers.find((c) => c.customer_id === id);
const MERGE_OWN_PHONE = { action: 'MERGE', keepCustomerId: 'C000001', fieldChoices: { fullName: 'C000001', phone: 'C000001' } };

// --- Danh sách và chi tiết (E4, E5) ---

test('TC-P1 danh sách: điểm cao trước, SĐT che với nhân viên, nhân viên chỉ thấy cặp của cửa hàng mình (QT-14)', async () => {
  const { store, service } = setup();
  const c = addCustomer(store, { fullName: 'Lê Hoàng Nam', phone: '0932111222' });
  const d = addCustomer(store, { fullName: 'Lê Hoang Nam', phone: '0976333444' });
  addPair(store, { batchId: 2, aId: c, bId: d, matchedBy: 'NAME_BIRTHDATE', similarity: 0.99 });

  const mine = await service.list({}, LAN);
  assert.equal(mine.total, 1);
  assert.equal(mine.items[0].pairId, 'P0001');
  assert.equal(mine.items[0].similarity, 0.93);
  assert.equal(mine.items[0].customerA.phone, '090****567');

  const all = await service.list({}, MANAGER);
  assert.deepEqual(all.items.map((i) => i.pairId), ['P0002', 'P0001']);
  assert.equal(all.items[1].customerA.phone, '0901234567');
});

test('TC-P2 danh sách: status sai hoặc trang sai bị từ chối; không có cặp chờ duyệt thì trả danh sách rỗng', async () => {
  const { service } = setup();
  await assert.rejects(() => service.list({ status: 'XYZ' }, LAN), (e) => e.code === 'INVALID_STATUS');
  await assert.rejects(() => service.list({ page: '0' }, LAN), (e) => e.code === 'INVALID_PAGE');
  const none = await service.list({}, MINH);
  assert.deepEqual(none.items, []);
  assert.equal(none.total, 0);
});

test('TC-P3 chi tiết: hai hồ sơ cạnh nhau kèm danh sách trường khác nhau; cặp lạ hoặc của cửa hàng khác trả 404', async () => {
  const { service, pairCode } = setup();
  const detail = await service.get(pairCode, LAN);
  assert.deepEqual(detail.differentFields, ['fullName', 'phone']);
  assert.equal(detail.customerB.address, '45 Nguyễn Huệ');
  assert.equal(detail.customerB.phone, '098****321');
  await assert.rejects(() => service.get('P9999', LAN), (e) => e.code === 'PAIR_NOT_FOUND');
  await assert.rejects(() => service.get(pairCode, MINH), (e) => e.code === 'PAIR_NOT_FOUND');
});

// --- Gộp (UC5, QT-13) ---

test('TC-P4 gộp: hồ sơ kia trỏ tới hồ sơ giữ lại, trường trống được bổ sung, hồ sơ không bị xóa', async () => {
  const { store, service, a, b } = setup();
  const done = await service.decide('P0001', MERGE_OWN_PHONE, LAN);
  assert.equal(done.status, 'MERGED');
  assert.equal(done.survivingCustomerId, 'C000001');
  assert.equal(done.mergedCustomerId, 'C000002');
  assert.equal(done.result.phone, '090****567');
  assert.equal(done.decidedBy, 'nv.lan');
  assert.equal(customer(store, b).merged_into_id, a);
  assert.equal(customer(store, a).address, '45 Nguyễn Huệ'); // US5-AC1: địa chỉ trống được lấy từ hồ sơ kia
  assert.equal(store.customers.length, 2);
  assert.equal(store.pairs[0].status, 'MERGED');
});

test('TC-P5 gộp và chọn SĐT của hồ sơ bị gộp: hai hồ sơ hoán đổi SĐT, không vi phạm SĐT duy nhất (QT-01)', async () => {
  const { store, service, a, b } = setup();
  await service.decide('P0001', {
    action: 'MERGE', keepCustomerId: 'C000001', fieldChoices: { fullName: 'C000001', phone: 'C000002' },
  }, LAN);
  assert.equal(customer(store, a).phone, '0987654321');
  assert.equal(customer(store, b).phone, '0901234567');
  assert.equal(customer(store, b).merged_into_id, a);
});

test('TC-P6 giữ riêng: chỉ đổi trạng thái cặp, hai hồ sơ giữ nguyên', async () => {
  const { store, service, b } = setup();
  const done = await service.decide('P0001', { action: 'KEEP_SEPARATE' }, LAN);
  assert.equal(done.status, 'KEEP_SEPARATE');
  assert.equal(store.pairs[0].status, 'KEEP_SEPARATE');
  assert.equal(customer(store, b).merged_into_id, null);
});

// --- BR4: mỗi cặp chỉ được quyết định một lần ---

test('TC-P7 BR4: quyết định lần hai trên cùng một cặp bị từ chối và không đổi dữ liệu', async () => {
  const { store, service, b } = setup();
  await service.decide('P0001', { action: 'KEEP_SEPARATE' }, LAN);
  await assert.rejects(() => service.decide('P0001', MERGE_OWN_PHONE, MINH), (e) => e.code === 'PAIR_NOT_FOUND');
  await assert.rejects(() => service.decide('P0001', MERGE_OWN_PHONE, LAN), (e) => e.code === 'PAIR_ALREADY_DECIDED');
  assert.equal(customer(store, b).merged_into_id, null);
});

test('TC-P8 BR4: hai nhân viên cùng duyệt một cặp, người đến sau thua thì không có gì bị thay đổi', async () => {
  const { store, service, b } = setup({ claimLost: true });
  await assert.rejects(() => service.decide('P0001', MERGE_OWN_PHONE, LAN), (e) => e.code === 'PAIR_ALREADY_DECIDED');
  assert.equal(customer(store, b).merged_into_id, null);
  assert.equal(store.pairs[0].status, 'PENDING');
});

// --- Dữ liệu sai ---

test('TC-P9 quyết định sai đầu vào bị từ chối đúng mã (INVALID_ACTION, KEEP_ID, FIELD_CHOICE)', async () => {
  const { service } = setup();
  const reject = (body, code) => assert.rejects(() => service.decide('P0001', body, LAN), (e) => e.code === code);
  await reject({ action: 'XOA' }, 'INVALID_ACTION');
  await reject(undefined, 'INVALID_ACTION');
  await reject({ action: 'MERGE' }, 'KEEP_ID_REQUIRED');
  await reject({ action: 'MERGE', keepCustomerId: 'C999999' }, 'KEEP_ID_NOT_IN_PAIR');
  await reject({ action: 'MERGE', keepCustomerId: 'C000001' }, 'FIELD_CHOICE_REQUIRED');
  await reject({
    action: 'MERGE', keepCustomerId: 'C000001', fieldChoices: { fullName: 'C000099', phone: 'C000001' },
  }, 'FIELD_CHOICE_REQUIRED');
});

test('TC-P10 thiếu lựa chọn thì báo rõ các trường còn phải chọn và không đổi dữ liệu', async () => {
  const { store, service } = setup();
  await assert.rejects(
    () => service.decide('P0001', { action: 'MERGE', keepCustomerId: 'C000002', fieldChoices: { phone: 'C000002' } }, LAN),
    (e) => e.code === 'FIELD_CHOICE_REQUIRED' && e.details.join() === 'fullName',
  );
  assert.equal(store.pairs[0].status, 'PENDING');
});

test('TC-P11 QT-13: cặp có hồ sơ đã gộp ở cặp khác thì không còn hiệu lực (CUSTOMER_MERGED)', async () => {
  const { store, service, b } = setup();
  const other = addCustomer(store, { fullName: 'Người Khác', phone: '0368123456' });
  customer(store, b).merged_into_id = other;
  await assert.rejects(() => service.decide('P0001', MERGE_OWN_PHONE, LAN), (e) => e.code === 'CUSTOMER_MERGED');
  assert.equal(store.pairs[0].status, 'PENDING');
});
