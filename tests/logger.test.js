const test = require('node:test');
const assert = require('node:assert/strict');
const { attachRequestId, pathOnly, redactText } = require('../src/logger');

/** Chạy một đoạn code và gom các dòng log nó ghi ra stdout. */
function captureLog(action) {
  const lines = [];
  const original = process.stdout.write;
  process.stdout.write = (chunk) => {
    lines.push(String(chunk));
    return true;
  };
  try {
    action();
  } finally {
    process.stdout.write = original;
  }
  return lines.join('').split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

test('TC-L1 pathOnly bỏ query string để SĐT không vào log', () => {
  assert.equal(pathOnly('/api/customers?phone=0901234567'), '/api/customers');
  assert.equal(pathOnly('/api/imports/I001/errors?code=PHONE_LENGTH&page=2'), '/api/imports/I001/errors');
  assert.equal(pathOnly('/health'), '/health');
});

test('TC-L2 redactText che dãy từ 9 chữ số (ranh giới 8 và 9), giữ nguyên số ngắn', () => {
  assert.equal(
    redactText("Duplicate entry '0901234567' for key 'uk_customer_phone'"),
    "Duplicate entry '***' for key 'uk_customer_phone'",
  );
  assert.equal(redactText('12345678'), '12345678');
  assert.equal(redactText('123456789'), '***');
  assert.equal(redactText(undefined), '');
});

test('TC-L3 dòng log của request không chứa query string, nên không chứa SĐT', () => {
  let onFinish;
  const req = { headers: {}, method: 'GET', originalUrl: '/api/customers?phone=0901234567' };
  const res = {
    statusCode: 200,
    setHeader() {},
    on(event, callback) {
      if (event === 'finish') onFinish = callback;
    },
  };
  const [line] = captureLog(() => {
    attachRequestId(req, res, () => {});
    onFinish();
  });
  assert.equal(line.path, '/api/customers');
  assert.equal(JSON.stringify(line).includes('0901234567'), false);
});
