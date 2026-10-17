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

module.exports = { AppError, ValidationError };
