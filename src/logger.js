const { randomUUID } = require('node:crypto');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;
const MASKED_KEYS = ['password', 'token', 'jwt', 'authorization', 'secret'];

function mask(value) {
  if (value === null || typeof value !== 'object') return value;
  const out = Array.isArray(value) ? [] : {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = MASKED_KEYS.some((k) => key.toLowerCase().includes(k)) ? '***' : mask(val);
  }
  return out;
}

function write(level, message, context = {}) {
  if (LEVELS[level] < MIN_LEVEL) return;
  process.stdout.write(`${JSON.stringify({
    time: new Date().toISOString(), level, message, ...mask(context),
  })}\n`);
}

const logger = {
  debug: (m, c) => write('debug', m, c),
  info: (m, c) => write('info', m, c),
  warn: (m, c) => write('warn', m, c),
  error: (m, c) => write('error', m, c),
};

/** Gắn requestId cho mỗi yêu cầu để lần theo một yêu cầu qua nhiều dòng log. */
function attachRequestId(req, res, next) {
  req.requestId = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  const startedAt = Date.now();
  res.on('finish', () => logger.info('request done', {
    requestId: req.requestId, method: req.method, path: req.originalUrl,
    status: res.statusCode, ms: Date.now() - startedAt,
  }));
  next();
}

module.exports = { logger, attachRequestId };
