/**
 * Test API kiểm soát truy cập (OWASP A01): 401 khi chưa đăng nhập, 403 sai vai trò, 404 với dữ liệu của đơn vị khác (QT-14),
 * SĐT bị che với nhân viên (QT-15). Mỗi test bắt đầu từ seeds/001_demo.sql nạp lại.
 */
const {
  test, before, after, beforeEach, afterEach,
} = require('node:test');
const assert = require('node:assert/strict');
const { openTestDb, resetDb, snapshotCounts } = require('../helpers/db');
const { startApi, csvForm, DEMO_PASSWORD } = require('../helpers/api');
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

test('TC-API2 A01 kiểm soát truy cập: 401 chưa đăng nhập, 403 sai vai trò, 404 dữ liệu đơn vị khác, SĐT bị che (bảo mật)', async (t) => {
  const lan = await api.login('nv.lan'); // CH01
  const minh = await api.login('nv.minh'); // CH02
  const manager = await api.login('ql.hung');
  const countsBefore = await snapshotCounts(pool);
  const lines = [];
  t.after(() => lines.forEach((line) => t.diagnostic(line))); // in cả khi test hỏng, để thấy giá trị thực tế

  const expectError = (label, response, status, code) => {
    lines.push(`${label} -> ${response.status} ${response.data?.error?.code ?? ''}`);
    assert.equal(response.status, status, label);
    assert.equal(response.data.error.code, code, label);
  };

  // Bị từ chối.
  expectError('không token, GET /api/imports', await api.call('GET', '/api/imports'), 401, 'UNAUTHORIZED');
  expectError('token giả, GET /api/customers', await api.call('GET', '/api/customers', { token: `${lan}x` }), 401, 'UNAUTHORIZED');
  expectError('nhân viên gọi GET /api/users', await api.call('GET', '/api/users', { token: lan }), 403, 'FORBIDDEN');
  expectError(
    'quản lý nhập file, POST /api/imports',
    await api.call('POST', '/api/imports', { token: manager, form: csvForm(csv('An Bình,0904111222,,,,2025-01-01')) }),
    403,
    'FORBIDDEN',
  );
  expectError('nv.minh (CH02) xem lỗi lần nhập I001 của CH01', await api.call('GET', '/api/imports/I001/errors', { token: minh }), 404, 'IMPORT_NOT_FOUND');
  expectError('nv.minh (CH02) xem cặp P0001 của CH01', await api.call('GET', '/api/duplicate-pairs/P0001', { token: minh }), 404, 'PAIR_NOT_FOUND');
  expectError(
    'nv.minh (CH02) quyết định cặp P0001 của CH01',
    await api.call('POST', '/api/duplicate-pairs/P0001/decision', { token: minh, json: { action: 'KEEP_SEPARATE' } }),
    404,
    'PAIR_NOT_FOUND',
  );

  // Được phép.
  const own = await api.call('GET', '/api/imports/I001/errors', { token: lan });
  const ownMinh = await api.call('GET', '/api/imports/I002/errors', { token: minh });
  const users = await api.call('GET', '/api/users', { token: manager });
  lines.push(`nv.lan xem I001 -> ${own.status}; nv.minh xem I002 -> ${ownMinh.status}; quản lý GET /api/users -> ${users.status}`);
  assert.deepEqual([own.status, ownMinh.status, users.status], [200, 200, 200]);

  // QT-15: SĐT che với nhân viên, đủ với quản lý.
  const asStaff = await api.call('GET', '/api/customers/C000001', { token: lan });
  const asManager = await api.call('GET', '/api/customers/C000001', { token: manager });
  lines.push(`SĐT C000001: nhân viên thấy ${asStaff.data.data.phone}, quản lý thấy ${asManager.data.data.phone}`);
  assert.equal(asStaff.data.data.phone, '090****567');
  assert.equal(asManager.data.data.phone, '0901234567');

  // Các yêu cầu bị từ chối không để lại tác dụng phụ.
  const countsAfter = await snapshotCounts(pool);
  const [[pair]] = await pool.query("SELECT status FROM duplicate_pair WHERE pair_code = 'P0001'");
  lines.push(`số dòng các bảng trước và sau giống nhau: ${JSON.stringify(countsAfter) === JSON.stringify(countsBefore)}; trạng thái cặp P0001: ${pair.status}`);
  assert.deepEqual(countsAfter, countsBefore);
  assert.equal(pair.status, 'PENDING');

  // A07: đoán mật khẩu. Sai 5 lần liên tiếp thì lần sau bị chặn 429 (kể cả khi nhập đúng); tài khoản khác không bị ảnh hưởng.
  const guesses = [];
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const guess = await api.call('POST', '/api/auth/login', { json: { username: 'nv.minh', password: `SaiMatKhau${attempt}` } });
    guesses.push(guess.status);
  }
  const rightAfter = await api.call('POST', '/api/auth/login', { json: { username: 'nv.minh', password: DEMO_PASSWORD } });
  const otherUser = await api.call('POST', '/api/auth/login', { json: { username: 'nv.lan', password: DEMO_PASSWORD } });
  lines.push(`6 lần sai mật khẩu nv.minh -> ${guesses.join(', ')}; nhập đúng ngay sau đó -> ${rightAfter.status} ${rightAfter.data?.error?.code ?? ''} `
    + `(Retry-After: ${rightAfter.headers.get('retry-after')}); nv.lan đăng nhập -> ${otherUser.status}`);
  assert.deepEqual(guesses, [401, 401, 401, 401, 401, 429]);
  assert.equal(rightAfter.status, 429);
  assert.equal(rightAfter.data.error.code, 'TOO_MANY_ATTEMPTS');
  assert.ok(Number(rightAfter.headers.get('retry-after')) > 0);
  assert.equal(otherUser.status, 200, 'tài khoản khác không bị ảnh hưởng');
});
