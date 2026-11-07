/**
 * Dựng API thật (buildApp) trên cổng ngẫu nhiên, nối CSDL thử, gọi bằng fetch của Node. Test API đi qua đủ
 * middleware, route, service, repository và CSDL, không có đối tượng giả.
 */
// Bớt dòng log của từng request trong kết quả test; lỗi (kể cả 5xx) vẫn hiện. Đặt TEST_LOG_LEVEL=info để xem đủ.
process.env.LOG_LEVEL = process.env.TEST_LOG_LEVEL || 'error';

const { buildApp } = require('../../src/app');
const { TEST_JWT_SECRET } = require('./db');

const DEMO_PASSWORD = 'Demo@123'; // mật khẩu của 3 tài khoản mẫu trong seeds/001_demo.sql

/** Chạy API trên 127.0.0.1:<cổng ngẫu nhiên>. */
async function startApi(pool) {
  const app = buildApp(pool, { jwtSecret: TEST_JWT_SECRET, jwtExpiresIn: 3600 });
  const server = await new Promise((resolve, reject) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    listening.on('error', reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  /** Gọi API, trả { status, data, headers }; data là JSON đã đọc, hoặc chuỗi thô nếu phản hồi không phải JSON. */
  async function call(method, route, {
    token, json, form, rawBody, headers = {},
  } = {}) {
    const sent = { ...headers };
    if (token) sent.Authorization = `Bearer ${token}`;
    let body;
    if (json !== undefined) {
      sent['Content-Type'] = 'application/json';
      body = JSON.stringify(json);
    } else if (rawBody !== undefined) {
      body = rawBody;
    } else if (form) {
      body = form;
    }
    const response = await fetch(`${base}${route}`, { method, headers: sent, body });
    const text = await response.text();
    let data = text || null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Không phải JSON: giữ nguyên chuỗi.
    }
    return { status: response.status, data, headers: response.headers };
  }

  async function login(username, password = DEMO_PASSWORD) {
    const { status, data } = await call('POST', '/api/auth/login', { json: { username, password } });
    if (status !== 200) throw new Error(`Đăng nhập ${username} lỗi (HTTP ${status}): ${JSON.stringify(data)}`);
    return data.accessToken;
  }

  return {
    call, login, base, close: () => new Promise((resolve) => { server.close(resolve); }),
  };
}

/** Form tải file CSV lên POST /api/imports. */
function csvForm(buffer, { fileName = 'tc-api.csv', source = 'RETAIL' } = {}) {
  const form = new FormData();
  form.append('source', source);
  form.append('file', new Blob([buffer], { type: 'text/csv' }), fileName);
  return form;
}

module.exports = { startApi, csvForm, DEMO_PASSWORD };
