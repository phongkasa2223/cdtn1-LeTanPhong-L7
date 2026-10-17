/**
 * Lỗi nghiệp vụ mang MÃ nghiệp vụ (không phải mã HTTP).
 * Lớp service ném AppError; chỉ lớp routes mới đổi mã nghiệp vụ sang mã HTTP.
 */
class AppError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

/** Lỗi định dạng dữ liệu vào, do validator ném ra. */
class ValidationError extends AppError {
  constructor(message, details) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

/**
 * Lỗi ràng buộc của CSDL đã được repository dịch sang dạng trung tính:
 * kind = 'DUPLICATE' (trùng khóa duy nhất) hoặc 'REFERENCED' (còn bản ghi tham chiếu).
 * Service quyết định đây là mã nghiệp vụ nào.
 */
class ConstraintError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'ConstraintError';
    this.kind = kind;
  }
}

module.exports = { AppError, ValidationError, ConstraintError };
