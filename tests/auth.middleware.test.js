const test = require('node:test');
const assert = require('node:assert/strict');
const { authenticate, requireRole } = require('../src/middleware/auth');
const { AppError } = require('../src/errors/AppError');

/** req/res giả: đủ để thử middleware mà không cần chạy máy chủ. */
function run(middleware, req) {
  return new Promise((resolve) => {
    const request = { headers: {}, ...req };
    const res = {
      statusCode: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body, nextCalled: false, request }); },
    };
    middleware(request, res, (err) => resolve({ status: null, err, nextCalled: !err, request }));
  });
}

const authService = {
  verifyToken(token) {
    if (token !== 'token-tot') throw new AppError('UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ.');
    return { userId: 1, username: 'nv.lan', role: 'DATA_STAFF', storeCode: 'CH01' };
  },
};

test('TC-M1 thiếu header Authorization thì trả 401 UNAUTHORIZED', async () => {
  const out = await run(authenticate(authService), {});
  assert.equal(out.status, 401);
  assert.equal(out.body.error.code, 'UNAUTHORIZED');
});

test('TC-M2 token sai hoặc không phải Bearer thì trả 401', async () => {
  for (const authorization of ['Bearer token-gia', 'Basic token-tot', 'token-tot']) {
    const out = await run(authenticate(authService), { headers: { authorization } });
    assert.equal(out.status, 401, authorization);
  }
});

test('TC-M3 token đúng thì gắn req.user và cho đi tiếp', async () => {
  const out = await run(authenticate(authService), { headers: { authorization: 'Bearer token-tot' } });
  assert.equal(out.nextCalled, true);
  assert.equal(out.request.user.storeCode, 'CH01');
});

test('TC-M4 NFR2: vai trò không được phép bị từ chối 403 FORBIDDEN, vai trò được phép đi tiếp', async () => {
  const onlyManager = requireRole('DATA_MANAGER');
  const denied = await run(onlyManager, { user: { role: 'DATA_STAFF' } });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error.code, 'FORBIDDEN');
  const allowed = await run(onlyManager, { user: { role: 'DATA_MANAGER' } });
  assert.equal(allowed.nextCalled, true);
});

test('TC-M5 chưa đăng nhập mà gọi route cần vai trò thì cũng bị từ chối 403', async () => {
  const out = await run(requireRole('DATA_STAFF'), {});
  assert.equal(out.status, 403);
});
