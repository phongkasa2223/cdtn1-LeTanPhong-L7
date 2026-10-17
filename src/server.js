const { createPool } = require('./db');
const { buildApp } = require('./app');
const { logger } = require('./logger');

const pool = createPool();
const app = buildApp(pool);
const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => logger.info('server started', { port }));

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    logger.info('shutting down', { signal });
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}
