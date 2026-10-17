const express = require('express');
const { logger, attachRequestId } = require('./logger');
const CustomerRepository = require('./repositories/customer.repository');
const { CustomerService } = require('./services/customer.service');
const { RecordValidator } = require('./services/record-validator');
const customerRoutes = require('./routes/customer.routes');

/** Lắp các lớp lại với nhau. Nhận pool từ ngoài để test không cần DB. */
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

  const customerService = new CustomerService(new CustomerRepository(pool), RecordValidator.fromConfig());
  app.use('/api', customerRoutes(customerService));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Đường dẫn không tồn tại.' } });
  });

  // Bắt lỗi cuối: không trả stack trace ra ngoài.
  app.use((err, req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Nội dung gửi lên không phải JSON hợp lệ.' } });
      return;
    }
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
