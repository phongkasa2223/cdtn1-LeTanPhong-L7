const { AppError } = require('../errors/AppError');

const MAX_PAGE_SIZE = 100;

/** Đọc page và size từ query: page >= 1, 1 <= size <= 100; sai thì ném INVALID_PAGE. */
function parsePaging(query = {}, defaultSize = 50) {
  const toInt = (value, fallback) => {
    if (value === undefined || value === '') return fallback;
    const n = Number(value);
    return Number.isInteger(n) ? n : NaN;
  };
  const page = toInt(query.page, 1);
  const size = toInt(query.size, defaultSize);
  if (!(page >= 1) || !(size >= 1) || size > MAX_PAGE_SIZE) {
    throw new AppError('INVALID_PAGE', `page >= 1 và 1 <= size <= ${MAX_PAGE_SIZE}.`);
  }
  return { page, size };
}

module.exports = { parsePaging, MAX_PAGE_SIZE };
