const test = require('node:test');
const assert = require('node:assert/strict');
const { AppError } = require('../src/errors/AppError');
const { respondError } = require('../src/routes/http-error');

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

/** Gọi respondError, gom phản hồi và các dòng log nó ghi ra stdout. */
function respond(err, req) {
  const lines = [];
  const original = process.stdout.write;
  process.stdout.write = (chunk) => {
    lines.push(String(chunk));
    return true;
  };
  const res = fakeRes();
  let passedOn = false;
  try {
    respondError(err, req, res, () => { passedOn = true; });
  } finally {
    process.stdout.write = original;
  }
  const logs = lines.join('').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  return { res, logs, passedOn };
}

test('TC-H1 mất kết nối CSDL trả 503 SERVICE_UNAVAILABLE kèm requestId, log ERROR đúng một dòng', () => {
  const cause = new Error('connect ECONNREFUSED 127.0.0.1:3306');
  const err = new AppError('SERVICE_UNAVAILABLE', 'Không kết nối được cơ sở dữ liệu.', undefined, { cause });
  const { res, logs, passedOn } = respond(err, { requestId: 'req-1' });
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error.code, 'SERVICE_UNAVAILABLE');
  assert.equal(res.body.error.requestId, 'req-1');
  assert.equal(passedOn, false);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].level, 'error');
  assert.equal(logs[0].requestId, 'req-1');
});

test('TC-H2 lỗi 4xx không bị log ở đây và không lộ requestId, chỉ lỗi 5xx mới log', () => {
  const { res, logs } = respond(new AppError('CUSTOMER_NOT_FOUND', 'Không tìm thấy.'), { requestId: 'req-2' });
  assert.equal(res.statusCode, 404);
  assert.equal('requestId' in res.body.error, false);
  assert.equal(logs.length, 0);
});

test('TC-H3 SĐT nằm trong thông báo lỗi gốc bị che trước khi vào log', () => {
  const cause = new Error("Duplicate entry '0901234567' for key 'uk_customer_phone'");
  const err = new AppError('SERVICE_UNAVAILABLE', 'x', undefined, { cause });
  const { logs } = respond(err, { requestId: 'req-3' });
  assert.equal(JSON.stringify(logs).includes('0901234567'), false);
});

test('TC-H4 lỗi không có mã nghiệp vụ được chuyển cho handler cuối, không tự trả lời', () => {
  const { res, passedOn } = respond(new Error('lỗi lạ'), { requestId: 'req-4' });
  assert.equal(passedOn, true);
  assert.equal(res.statusCode, null);
});
