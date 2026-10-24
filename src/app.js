const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { logger, attachRequestId } = require('./logger');
const AppUserRepository = require('./repositories/app-user.repository');
const CustomerRepository = require('./repositories/customer.repository');
const DqResultRepository = require('./repositories/dq-result.repository');
const DuplicatePairRepository = require('./repositories/duplicate-pair.repository');
const ImportBatchRepository = require('./repositories/import-batch.repository');
const StgCustomerRepository = require('./repositories/stg-customer.repository');
const UnitOfWork = require('./repositories/unit-of-work');
const { AuthService } = require('./services/auth.service');
const { CustomerService } = require('./services/customer.service');
const { DuplicateService } = require('./services/duplicate.service');
const { ImportService } = require('./services/import.service');
const { RecordValidator } = require('./services/record-validator');
const { authenticate } = require('./middleware/auth');
const authRoutes = require('./routes/auth.routes');
const customerRoutes = require('./routes/customer.routes');
const duplicatePairRoutes = require('./routes/duplicate-pair.routes');
const importRoutes = require('./routes/import.routes');

const FRONTEND_DIST = path.resolve(__dirname, '..', 'frontend', 'dist');
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
};

/** Lắp các lớp lại với nhau. Nhận pool từ ngoài để test không cần DB. */
function buildApp(pool, {
  jwtSecret = process.env.JWT_SECRET,
  jwtExpiresIn = Number(process.env.JWT_EXPIRES_IN) || undefined,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set(SECURITY_HEADERS);
    next();
  });
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

  const authService = new AuthService(new AppUserRepository(pool), { secret: jwtSecret, expiresIn: jwtExpiresIn });
  const validator = RecordValidator.fromConfig();
  const customerService = new CustomerService(new CustomerRepository(pool), validator);
  // Phần ghi của một lần nhập chạy trong một giao dịch: các repository được gắn với kết nối của giao dịch (NFR3).
  const importUow = new UnitOfWork(pool, (conn) => ({
    batches: new ImportBatchRepository(conn),
    stg: new StgCustomerRepository(conn),
    dq: new DqResultRepository(conn),
    customers: new CustomerRepository(conn),
    pairs: new DuplicatePairRepository(conn),
  }));
  const importService = new ImportService({
    uow: importUow,
    read: {
      batches: new ImportBatchRepository(pool),
      stg: new StgCustomerRepository(pool),
      dq: new DqResultRepository(pool),
    },
    validator,
  });

  // Một quyết định duyệt cặp cũng chạy trong một giao dịch (BR4, BR5).
  const decisionUow = new UnitOfWork(pool, (conn) => ({
    pairs: new DuplicatePairRepository(conn),
    customers: new CustomerRepository(conn),
  }));
  const duplicateService = new DuplicateService({
    uow: decisionUow,
    read: { pairs: new DuplicatePairRepository(pool) },
  });

  app.use('/api', authRoutes(authService)); // mở: đăng nhập
  app.use('/api', authenticate(authService)); // từ đây trở xuống bắt buộc đăng nhập (NFR2)
  app.use('/api', customerRoutes(customerService));
  app.use('/api', importRoutes(importService));
  app.use('/api', duplicatePairRoutes(duplicateService));

  // Chạy thật: Express phục vụ luôn bản build của frontend (một cổng, một lệnh npm start).
  if (fs.existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
    app.get(/^\/(?!api\/|health$).*/, (_req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
  }

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
