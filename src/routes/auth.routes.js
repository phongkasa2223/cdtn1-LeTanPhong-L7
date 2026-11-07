const express = require('express');
const { AppError } = require('../errors/AppError');
const { handle } = require('./http-error');
const { LoginThrottle } = require('../middleware/login-throttle');

/**
 * Routes đăng nhập (E1). Mở cho mọi người, các route khác phải qua middleware authenticate.
 * Đăng nhập sai quá nhiều lần thì bị khóa tạm (429), để không đoán mật khẩu được vô hạn (OWASP A07).
 */
module.exports = function authRoutes(authService, { throttle = new LoginThrottle() } = {}) {
  const router = express.Router();

  router.post('/auth/login', handle(async (req, res) => {
    const key = LoginThrottle.key(req.ip, req.body?.username);
    const wait = throttle.retryAfterSeconds(key);
    if (wait > 0) {
      res.set('Retry-After', String(wait));
      throw new AppError('TOO_MANY_ATTEMPTS', `Đăng nhập sai quá nhiều lần. Thử lại sau ${wait} giây.`, { retryAfterSeconds: wait });
    }
    try {
      const session = await authService.login(req.body);
      throttle.reset(key);
      res.json(session);
    } catch (err) {
      if (err.code === 'INVALID_CREDENTIALS') throttle.recordFailure(key);
      throw err;
    }
  }));

  return router;
};
