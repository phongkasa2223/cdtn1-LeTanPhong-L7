const { AppError } = require('../errors/AppError');
const { respondError } = require('../routes/http-error');

/** Bắt buộc đăng nhập (NFR2): đọc Bearer token, gắn req.user = { userId, username, role, storeCode }. */
function authenticate(authService) {
  return (req, res, next) => {
    try {
      const [scheme, token] = (req.headers.authorization || '').split(' ');
      if (scheme !== 'Bearer' || !token) throw new AppError('UNAUTHORIZED', 'Chưa đăng nhập.');
      req.user = authService.verifyToken(token);
      next();
    } catch (err) {
      respondError(err, req, res, next);
    }
  };
}

/** Chỉ cho các vai trò được liệt kê. Khai báo cho mọi route ghi; route chỉ đọc thì chỉ cần đăng nhập. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      respondError(new AppError('FORBIDDEN', 'Vai trò của bạn không được dùng chức năng này.'), req, res, next);
      return;
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
