const express = require('express');
const { logger, attachRequestId } = require('./logger');

/**
 * Lắp ráp ứng dụng. Mỗi lớp nhận lớp ngay dưới qua tham số,
 * nên test được bằng đối tượng giả (không cần CSDL).
 */
function buildApp(pool) {
  const app = express();
  app.use(express.json({ limit: '256kb' }));
  app.use(attachRequestId);

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'unreachable' });
    }
  });

  // Xử lý lỗi cuối cùng: không trả stack trace cho người gọi.
  app.use((err, req, res, _next) => {
    logger.error('unhandled error', {
      requestId: req.requestId, name: err.name, message: err.message,
    });
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Đã xảy ra lỗi không mong đợi.', requestId: req.requestId },
    });
  });

  return app;
}

module.exports = { buildApp };
