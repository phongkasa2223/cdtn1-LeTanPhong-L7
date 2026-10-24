const express = require('express');
const multer = require('multer');
const { AppError } = require('../errors/AppError');
const { handle, respondError } = require('./http-error');
const { requireRole } = require('../middleware/auth');
const { MAX_FILE_BYTES } = require('../services/import.service');

/** Nhận file tải lên (trong bộ nhớ, tối đa 5 MB); lỗi của multer đổi sang mã nghiệp vụ. */
function uploadCsv() {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 5 },
  }).single('file');
  return (req, res, next) => upload(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    respondError(new AppError(
      tooLarge ? 'FILE_TOO_LARGE' : 'INVALID_FILE_TYPE',
      tooLarge ? 'File lớn hơn 5 MB.' : 'Không đọc được file tải lên.',
    ), req, res, next);
  });
}

/** Multer đọc tên file theo latin1; trình duyệt gửi UTF-8 nên đọc lại cho đúng dấu tiếng Việt. */
function fixFileName(name) {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}

/** Routes lần nhập (E2, E3, E7): chỉ nhận HTTP, không có nghiệp vụ. */
module.exports = function importRoutes(importService) {
  const router = express.Router();

  router.get('/imports', handle(async (req, res) => {
    res.json(await importService.list(req.query, req.user));
  }));

  router.get('/imports/:importId/errors', handle(async (req, res) => {
    res.json(await importService.errors(req.params.importId, req.query, req.user));
  }));

  router.post('/imports', requireRole('DATA_STAFF'), uploadCsv(), handle(async (req, res) => {
    if (!req.file) throw new AppError('INVALID_FILE_TYPE', 'Chưa chọn file CSV.');
    const summary = await importService.importFile({
      buffer: req.file.buffer,
      fileName: fixFileName(req.file.originalname),
      source: req.body.source,
      user: req.user,
    });
    res.status(201).location(`/api/imports/${summary.importId}/errors`).json(summary);
  }));

  return router;
};
