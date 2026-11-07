const test = require('node:test');
const assert = require('node:assert/strict');
const { LoginThrottle } = require('../src/middleware/login-throttle');

const KEY = LoginThrottle.key('10.0.0.1', 'nv.lan');
const MINUTE = 60 * 1000;

/** Đồng hồ giả để test chạy tức thì và xác định, không phụ thuộc giờ máy. */
function setup(options = {}) {
  const clock = { now: 1_000_000 };
  const throttle = new LoginThrottle({ now: () => clock.now, ...options });
  return { clock, throttle };
}

function fail(throttle, times) {
  for (let i = 0; i < times; i += 1) throttle.recordFailure(KEY);
}

test('TC-A9 A07 biên 4 và 5: sai 4 lần liên tiếp chưa bị khóa, sai lần thứ 5 thì bị khóa 15 phút', (t) => {
  const { throttle } = setup();
  fail(throttle, 4);
  const afterFour = throttle.retryAfterSeconds(KEY);
  fail(throttle, 1);
  const afterFive = throttle.retryAfterSeconds(KEY);
  t.diagnostic(`sau 4 lần sai: còn khóa ${afterFour} giây; sau 5 lần sai: còn khóa ${afterFive} giây`);
  assert.equal(afterFour, 0);
  assert.equal(afterFive, 15 * 60);
});

test('TC-A10 A07 biên 15 phút: còn khóa ở giây thứ 899, mở khóa ở giây thứ 900 kể từ lần sai cuối, rồi đếm lại từ đầu', (t) => {
  const { clock, throttle } = setup();
  fail(throttle, 5);
  clock.now += 15 * MINUTE - 1000;
  const justBefore = throttle.retryAfterSeconds(KEY);
  clock.now += 1000;
  const atLimit = throttle.retryAfterSeconds(KEY);
  t.diagnostic(`899 giây sau lần sai cuối: còn khóa ${justBefore} giây; 900 giây sau: còn khóa ${atLimit} giây`);
  assert.equal(justBefore, 1);
  assert.equal(atLimit, 0);
  fail(throttle, 4);
  assert.equal(throttle.retryAfterSeconds(KEY), 0, 'mở khóa rồi thì đếm lại từ 0, 4 lần sai chưa khóa');
});

test('TC-A11 đăng nhập đúng xóa bộ đếm; tên hoặc địa chỉ khác không bị ảnh hưởng; không phân biệt hoa thường và khoảng trắng', () => {
  const { throttle } = setup();
  fail(throttle, 4);
  throttle.reset(KEY);
  fail(throttle, 4);
  assert.equal(throttle.retryAfterSeconds(KEY), 0, 'đã xóa bộ đếm thì đếm lại từ 0');

  fail(throttle, 1);
  assert.ok(throttle.retryAfterSeconds(KEY) > 0);
  assert.equal(throttle.retryAfterSeconds(LoginThrottle.key('10.0.0.1', 'nv.minh')), 0, 'tên đăng nhập khác');
  assert.equal(throttle.retryAfterSeconds(LoginThrottle.key('10.0.0.2', 'nv.lan')), 0, 'địa chỉ khác');
  assert.ok(throttle.retryAfterSeconds(LoginThrottle.key('10.0.0.1', ' NV.Lan ')) > 0, 'cùng một khóa dù viết hoa và thừa khoảng trắng');
});

test('TC-A12 bảng đếm có trần: gửi vô số tên đăng nhập khác nhau không làm bảng phình quá maxEntries', (t) => {
  const { throttle } = setup({ maxEntries: 100 });
  for (let i = 0; i < 1000; i += 1) throttle.recordFailure(LoginThrottle.key('10.0.0.1', `user${i}`));
  t.diagnostic(`sau 1000 tên đăng nhập khác nhau: bảng có ${throttle.entries.size} mục (trần 100)`);
  assert.ok(throttle.entries.size <= 100);
});
