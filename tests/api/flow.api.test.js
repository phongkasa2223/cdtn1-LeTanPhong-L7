/**
 * Test hệ thống (API): đi qua HTTP thật, đủ middleware, route, service, repository và CSDL thử.
 * Mỗi test bắt đầu từ seeds/001_demo.sql nạp lại; tài khoản mẫu nv.lan (CH01), nv.minh (CH02), ql.hung (quản lý), mật khẩu Demo@123.
 */
const {
  test, before, after, beforeEach, afterEach,
} = require('node:test');
const assert = require('node:assert/strict');
const { openTestDb, resetDb } = require('../helpers/db');
const { startApi, csvForm } = require('../helpers/api');
const { csv } = require('../helpers/csv');

let pool;
let api;

before(async () => {
  pool = await openTestDb();
});
after(async () => {
  await pool.end();
});
beforeEach(async () => {
  await resetDb(pool);
  api = await startApi(pool);
});
afterEach(async () => {
  await api.close();
});

test('TC-API1 luồng chính qua HTTP thật: đăng nhập, nhập file, xem lỗi, gộp cặp, tra SĐT của hồ sơ đã gộp (luồng đúng)', async (t) => {
  const staff = await api.login('nv.lan');
  const manager = await api.login('ql.hung');
  const steps = [];
  t.after(() => steps.forEach((line) => t.diagnostic(line))); // in cả khi test hỏng, để thấy giá trị thực tế

  // 1. Nhập file: hai dòng cùng email (nghi trùng) và một dòng lỗi SĐT.
  const imported = await api.call('POST', '/api/imports', {
    token: staff,
    form: csvForm(csv(
      'Trịnh Công Sơn,0906000111,son.trinh@gmail.com,,01/01/1990,2025-01-01',
      'Trinh Cong Son,0906000222,son.trinh@gmail.com,12 Lê Lợi,1990-01-01,2025-02-02',
      'Mai Lan,0906000,,,,2025-03-03', // lỗi PHONE_LENGTH (7 chữ số)
    ), { fileName: 'tc-api1.csv' }),
  });
  assert.equal(imported.status, 201);
  const summary = imported.data;
  steps.push(`1. nhập file -> 201 ${summary.importId}: ${summary.totalRecords} dòng, ${summary.errorRecords} lỗi, ${summary.newDuplicatePairs} cặp nghi trùng mới`);
  assert.deepEqual(
    [summary.importId, summary.totalRecords, summary.validRecords, summary.errorRecords, summary.newDuplicatePairs],
    ['I003', 3, 2, 1, 1],
  );

  // 2. Bản ghi lỗi của lần nhập.
  const errors = await api.call('GET', `/api/imports/${summary.importId}/errors?code=PHONE_LENGTH`, { token: staff });
  assert.equal(errors.status, 200);
  steps.push(`2. bản ghi lỗi PHONE_LENGTH -> 200: ${errors.data.total} bản ghi, dòng ${errors.data.items[0].rowNumber} có SĐT "${errors.data.items[0].original.so_dien_thoai}"`);
  assert.equal(errors.data.total, 1);
  assert.equal(errors.data.items[0].original.so_dien_thoai, '0906000');

  // 3. Cặp nghi trùng vừa sinh ra: nhân viên thấy SĐT bị che, quản lý thấy đủ (QT-15).
  const pairs = await api.call('GET', '/api/duplicate-pairs?size=100', { token: staff });
  const listed = pairs.data.items.find((p) => p.customerA.fullName === 'Trịnh Công Sơn');
  assert.ok(listed, 'cặp mới có trong danh sách chờ duyệt');
  const asStaff = await api.call('GET', `/api/duplicate-pairs/${listed.pairId}`, { token: staff });
  const asManager = await api.call('GET', `/api/duplicate-pairs/${listed.pairId}`, { token: manager });
  steps.push(`3. cặp ${listed.pairId} (${asStaff.data.matchedBy}): nhân viên thấy ${asStaff.data.customerB.phone}, quản lý thấy ${asManager.data.customerB.phone}`);
  assert.equal(asStaff.data.customerB.phone, '090****222');
  assert.equal(asManager.data.customerB.phone, '0906000222');

  // 4. Gộp, giữ hồ sơ A; các trường khác nhau đều chọn giá trị của A.
  const keep = asStaff.data.customerA.customerId;
  const other = asStaff.data.customerB.customerId;
  const fieldChoices = Object.fromEntries(asStaff.data.differentFields.map((field) => [field, keep]));
  const merged = await api.call('POST', `/api/duplicate-pairs/${listed.pairId}/decision`, {
    token: staff, json: { action: 'MERGE', keepCustomerId: keep, fieldChoices },
  });
  steps.push(`4. gộp ${listed.pairId}, giữ ${keep} -> ${merged.status} ${merged.data.status}, ${merged.data.mergedCustomerId} đánh dấu đã gộp`);
  assert.equal(merged.status, 200);
  assert.equal(merged.data.status, 'MERGED');
  assert.equal(merged.data.mergedCustomerId, other);

  // 5. BR4: quyết định lần hai trên cùng cặp bị từ chối.
  const again = await api.call('POST', `/api/duplicate-pairs/${listed.pairId}/decision`, {
    token: staff, json: { action: 'KEEP_SEPARATE' },
  });
  steps.push(`5. quyết định lần hai -> ${again.status} ${again.data.error.code}`);
  assert.equal(again.status, 409);
  assert.equal(again.data.error.code, 'PAIR_ALREADY_DECIDED');

  // 6. US6-AC2: tra bằng SĐT của hồ sơ đã gộp thì ra hồ sơ giữ lại; hồ sơ đã gộp vẫn còn trong bảng (BR5).
  const lookup = await api.call('GET', '/api/customers?phone=0906000222', { token: manager });
  const [[stored]] = await pool.query('SELECT merged_into_id IS NOT NULL AS merged FROM customer WHERE customer_code = ?', [other]);
  steps.push(`6. tra SĐT 0906000222 -> ${lookup.status}, ra ${lookup.data.data.customerId}; ${other} còn trong bảng customer, đã gộp = ${Boolean(stored.merged)}`);
  assert.equal(lookup.status, 200);
  assert.equal(lookup.data.data.customerId, keep);
  assert.equal(Number(stored.merged), 1);
});
