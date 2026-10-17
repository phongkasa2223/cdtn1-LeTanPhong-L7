/** Đổi mã nghiệp vụ (AppError.code) sang mã HTTP, theo docs/api-contract.md mục 2. */
const HTTP_BY_CODE = Object.freeze({
  VALIDATION_ERROR: 400,
  INVALID_PAGE: 400,
  CUSTOMER_NOT_FOUND: 404,
  DUPLICATE_PHONE: 409,
  CUSTOMER_MERGED: 409,
});

/** Bọc handler async: lỗi nghiệp vụ trả JSON { error }, lỗi lạ chuyển cho handler cuối (500). */
function handle(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (err) {
      const status = HTTP_BY_CODE[err.code];
      if (!status) return next(err);
      const error = { code: err.code, message: err.message };
      if (err.details !== undefined) error.details = err.details;
      return res.status(status).json({ error });
    }
    return undefined;
  };
}

module.exports = { handle, HTTP_BY_CODE };
