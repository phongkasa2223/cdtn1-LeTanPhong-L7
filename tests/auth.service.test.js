const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { AuthService } = require('../src/services/auth.service');

const SECRET = 'khoa-bi-mat-chi-dung-trong-test-123';
const T0 = Date.parse('2026-10-24T08:00:00Z');

function hashOf(password) {
  const salt = Buffer.from('muoi-test-1234567');
  return `scrypt$${salt.toString('hex')}$${crypto.scryptSync(password, salt, 32).toString('hex')}`;
}
const lan = {
  user_id: 1, username: 'nv.lan', password_hash: hashOf('Demo@123'), full_name: 'Chị Lan',
  role: 'DATA_STAFF', store_code: 'CH01',
};
const users = {
  findByUsername: async (name) => (name === lan.username ? lan : null),
  findById: async (id) => (id === lan.user_id ? lan : null),
};
const makeService = (now = () => T0, repo = users) => new AuthService(repo, { secret: SECRET, expiresIn: 3600, now });

// --- Luồng đúng ---

test('TC-A1 đăng nhập đúng: trả token, thời hạn và thông tin người dùng, không lộ mật khẩu', async () => {
  const result = await makeService().login({ username: 'nv.lan', password: 'Demo@123' });
  assert.equal(result.expiresIn, 3600);
  assert.deepEqual(result.user, { username: 'nv.lan', fullName: 'Chị Lan', role: 'DATA_STAFF' });
  assert.ok(!JSON.stringify(result).includes('scrypt'));
  const user = await makeService().verifyToken(result.accessToken);
  assert.deepEqual(user, { userId: 1, username: 'nv.lan', role: 'DATA_STAFF', storeCode: 'CH01' });
});

// --- Dữ liệu sai ---

test('TC-A2 sai mật khẩu và sai tên đăng nhập đều ra INVALID_CREDENTIALS (không lộ tài khoản nào có)', async () => {
  const svc = makeService();
  for (const body of [{ username: 'nv.lan', password: 'SaiMatKhau1' }, { username: 'khong.co', password: 'Demo@123' }]) {
    await assert.rejects(() => svc.login(body), (err) => err.code === 'INVALID_CREDENTIALS');
  }
});

test('TC-A3 thiếu hoặc sai độ dài tên đăng nhập / mật khẩu bị từ chối VALIDATION_ERROR', async () => {
  await assert.rejects(
    () => makeService().login({ username: 'ab', password: '1234567' }),
    (err) => err.code === 'VALIDATION_ERROR' && err.details.length === 2,
  );
  await assert.rejects(() => makeService().login(undefined), (err) => err.code === 'VALIDATION_ERROR');
});

// --- Giá trị biên: hạn của token ---

test('TC-A4 token còn hạn đến hết 3600 giây, sau đó bị từ chối UNAUTHORIZED', async () => {
  const { accessToken } = await makeService().login({ username: 'nv.lan', password: 'Demo@123' });
  const at = (seconds) => makeService(() => T0 + seconds * 1000);
  assert.equal((await at(3599).verifyToken(accessToken)).username, 'nv.lan');
  await assert.rejects(() => at(3601).verifyToken(accessToken), (err) => err.code === 'UNAUTHORIZED');
});

test('TC-A5 token ký bằng khóa khác, token rác hoặc không ký đều bị từ chối', async () => {
  const svc = makeService();
  const forged = jwt.sign({ usr: 'nv.lan', role: 'DATA_MANAGER' }, 'khoa-khac-hoan-toan-12345', { subject: '1' });
  const unsigned = jwt.sign({ usr: 'nv.lan', role: 'DATA_MANAGER' }, '', { algorithm: 'none', subject: '1' });
  for (const token of [forged, unsigned, 'khong.phai.token']) {
    await assert.rejects(() => svc.verifyToken(token), (err) => err.code === 'UNAUTHORIZED');
  }
});

test('TC-A6 khóa JWT quá ngắn thì không khởi tạo được dịch vụ', () => {
  assert.throws(() => new AuthService(users, { secret: 'ngan' }), /JWT_SECRET/);
});

// --- Token chỉ có giá trị khi tài khoản còn tồn tại và còn đúng vai trò ---

test('TC-A7 tài khoản bị xóa sau khi đăng nhập thì token còn hạn cũng bị từ chối', async () => {
  const { accessToken } = await makeService().login({ username: 'nv.lan', password: 'Demo@123' });
  const afterDelete = makeService(() => T0, { findByUsername: users.findByUsername, findById: async () => null });
  await assert.rejects(() => afterDelete.verifyToken(accessToken), (err) => err.code === 'UNAUTHORIZED');
});

test('TC-A8 vai trò lấy từ CSDL chứ không từ token: đổi vai trò sau khi đăng nhập có hiệu lực ngay', async () => {
  const { accessToken } = await makeService().login({ username: 'nv.lan', password: 'Demo@123' });
  const promoted = { ...lan, role: 'DATA_MANAGER', store_code: null };
  const svc = makeService(() => T0, { findByUsername: users.findByUsername, findById: async () => promoted });
  assert.deepEqual(await svc.verifyToken(accessToken), {
    userId: 1, username: 'nv.lan', role: 'DATA_MANAGER', storeCode: null,
  });
});
