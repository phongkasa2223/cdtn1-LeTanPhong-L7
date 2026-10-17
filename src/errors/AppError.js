/** Lỗi nghiệp vụ, mang mã nghiệp vụ (chưa phải mã HTTP). Service ném, routes đổi sang mã HTTP. */
class AppError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

/** Lỗi sai định dạng dữ liệu vào. */
class ValidationError extends AppError {
  constructor(message, details) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

/** Lỗi ràng buộc DB, repository đổi sang dạng trung tính (kind = 'DUPLICATE'). */
class ConstraintError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'ConstraintError';
    this.kind = kind;
  }
}

module.exports = { AppError, ValidationError, ConstraintError };
