const { logger } = require('../logger');

/** Đổi mã nghiệp vụ (AppError.code) sang mã HTTP, theo docs/api-contract.md. */
const HTTP_BY_CODE = Object.freeze({
  VALIDATION_ERROR: 400,
  INVALID_PAGE: 400,
  INVALID_FILE_TYPE: 400,
  FILE_TOO_LARGE: 400,
  MISSING_COLUMNS: 400,
  EMPTY_FILE: 400,
  INVALID_SOURCE: 400,
  INVALID_ERROR_CODE: 400,
  INVALID_STATUS: 400,
  INVALID_ACTION: 400,
  KEEP_ID_REQUIRED: 400,
  KEEP_ID_NOT_IN_PAIR: 400,
  FIELD_CHOICE_REQUIRED: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  CUSTOMER_NOT_FOUND: 404,
  IMPORT_NOT_FOUND: 404,
  PAIR_NOT_FOUND: 404,
  DUPLICATE_PHONE: 409,
  CUSTOMER_MERGED: 409,
  PAIR_ALREADY_DECIDED: 409,
  IMPORT_FAILED: 500,
});

/** Lỗi nghiệp vụ trả JSON { error }; lỗi lạ chuyển cho handler cuối (500). */
function respondError(err, req, res, next) {
  const status = HTTP_BY_CODE[err.code];
  if (!status) {
    next(err);
    return;
  }
  if (status >= 500) {
    logger.error('business error 5xx', {
      requestId: req.requestId, code: err.code, cause: err.cause ? String(err.cause.message) : undefined,
    });
  }
  const error = { code: err.code, message: err.message };
  if (err.details !== undefined) error.details = err.details;
  if (status >= 500) error.requestId = req.requestId;
  res.status(status).json({ error });
}

/** Bọc handler async của route. */
function handle(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (err) {
      respondError(err, req, res, next);
    }
  };
}

module.exports = { handle, respondError, HTTP_BY_CODE };
