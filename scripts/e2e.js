/**
 * Chạy thử toàn luồng chính qua API thật (cần đang chạy `npm start`):
 * đăng nhập -> nhập file CSV -> xem bản ghi lỗi -> duyệt một cặp nghi trùng -> tra SĐT của hồ sơ đã gộp.
 * Dùng: npm run e2e [đường dẫn file CSV]   (mặc định data/customers_raw.csv, tạo bằng npm run gen:data)
 * Thoát với mã khác 0 nếu một bước không đúng kỳ vọng.
 */
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const CSV_PATH = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'customers_raw.csv'));
const PASSWORD = process.env.E2E_PASSWORD || 'Demo@123'; // mật khẩu tài khoản mẫu trong seeds/001_demo.sql

let step = 0;
const log = (text) => process.stdout.write(`${text}\n`);

function check(condition, message) {
  if (!condition) throw new Error(`Không đạt: ${message}`);
}

async function api(method, route, { token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const response = await fetch(`${BASE}${route}`, { method, headers, body });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

async function login(username) {
  const { status, data } = await api('POST', '/api/auth/login', { json: { username, password: PASSWORD } });
  check(status === 200, `đăng nhập ${username} (HTTP ${status})`);
  return data.accessToken;
}

function announce(text) {
  step += 1;
  log(`\nBước ${step}. ${text}`);
}

async function main() {
  check(fs.existsSync(CSV_PATH), `không thấy file ${CSV_PATH}; chạy npm run gen:data trước`);

  announce('Kiểm tra hệ thống');
  const health = await api('GET', '/health');
  check(health.status === 200 && health.data.db === 'ok', 'GET /health trả db ok');
  log('  /health: ok');

  announce('Đăng nhập nv.lan (Nhân viên dữ liệu) và ql.hung (Quản lý dữ liệu)');
  const staff = await login('nv.lan');
  const manager = await login('ql.hung');
  check((await api('GET', '/api/imports')).status === 401, 'gọi API không có token bị từ chối 401');
  log('  đăng nhập được cả hai vai trò; không token thì bị 401');

  announce(`Nhập file ${path.basename(CSV_PATH)} (một giao dịch, NFR3)`);
  const form = new FormData();
  form.append('source', 'RETAIL');
  form.append('file', new Blob([fs.readFileSync(CSV_PATH)], { type: 'text/csv' }), path.basename(CSV_PATH));
  const started = Date.now();
  const imported = await api('POST', '/api/imports', { token: staff, form });
  check(imported.status === 201, `POST /api/imports (HTTP ${imported.status}: ${JSON.stringify(imported.data)})`);
  const summary = imported.data;
  check(summary.validRecords + summary.errorRecords === summary.totalRecords, 'hợp lệ + lỗi = tổng');
  log(`  ${summary.importId}: ${summary.totalRecords} dòng trong ${Date.now() - started} ms`);
  log(`  hợp lệ ${summary.validRecords}, lỗi ${summary.errorRecords}, hồ sơ mới ${summary.newCustomers}, `
    + `gắn vào hồ sơ có sẵn ${summary.attachedRecords}, cặp nghi trùng mới ${summary.newDuplicatePairs}`);
  log(`  lỗi theo mã: ${JSON.stringify(summary.errorsByCode)}`);

  announce('Xem bản ghi lỗi (lọc PHONE_LENGTH, trang 1)');
  const errors = await api('GET', `/api/imports/${summary.importId}/errors?code=PHONE_LENGTH&size=3`, { token: staff });
  check(errors.status === 200, 'GET errors trả 200');
  check(errors.data.total === summary.errorsByCode.PHONE_LENGTH || summary.errorsByCode.PHONE_LENGTH === 0,
    'tổng bản ghi lọc khớp số lỗi PHONE_LENGTH của lần nhập');
  check(errors.data.items.every((item) => item.errors.some((e) => e.code === 'PHONE_LENGTH')),
    'mọi bản ghi lọc đều có lỗi PHONE_LENGTH');
  log(`  ${errors.data.total} bản ghi lỗi PHONE_LENGTH; ví dụ dòng ${errors.data.items[0]?.rowNumber}: `
    + `"${errors.data.items[0]?.original.so_dien_thoai}"`);

  announce('Duyệt một cặp nghi trùng: Gộp, giữ hồ sơ A');
  const pairs = await api('GET', '/api/duplicate-pairs?size=1', { token: staff });
  check(pairs.status === 200 && pairs.data.items.length === 1, 'có ít nhất một cặp chờ duyệt');
  const { pairId } = pairs.data.items[0];
  const full = await api('GET', `/api/duplicate-pairs/${pairId}`, { token: manager }); // quản lý xem SĐT đầy đủ
  const detail = await api('GET', `/api/duplicate-pairs/${pairId}`, { token: staff });
  check(detail.data.customerA.phone.includes('****'), 'nhân viên thấy SĐT đã che (QT-15)');
  const keep = detail.data.customerA.customerId;
  const choices = Object.fromEntries(detail.data.differentFields.map((field) => [field, keep]));
  const merged = await api('POST', `/api/duplicate-pairs/${pairId}/decision`, {
    token: staff, json: { action: 'MERGE', keepCustomerId: keep, fieldChoices: choices },
  });
  check(merged.status === 200 && merged.data.status === 'MERGED', `quyết định Gộp (HTTP ${merged.status})`);
  log(`  ${pairId} (${detail.data.matchedBy}, giống ${detail.data.similarity}): giữ ${keep}, `
    + `${merged.data.mergedCustomerId} đánh dấu đã gộp`);

  announce('BR4: quyết định lần hai trên cùng cặp bị từ chối');
  const again = await api('POST', `/api/duplicate-pairs/${pairId}/decision`, { token: staff, json: { action: 'KEEP_SEPARATE' } });
  check(again.status === 409 && again.data.error.code === 'PAIR_ALREADY_DECIDED', 'lần hai trả 409 PAIR_ALREADY_DECIDED');
  log('  409 PAIR_ALREADY_DECIDED');

  announce('US6-AC2: tra bằng SĐT của hồ sơ bị gộp thì ra hồ sơ giữ lại');
  const lookup = await api('GET', `/api/customers?phone=${encodeURIComponent(full.data.customerB.phone)}`, { token: manager });
  check(lookup.status === 200 && lookup.data.data.customerId === keep, 'tra SĐT của hồ sơ B ra hồ sơ A');
  log(`  SĐT ${full.data.customerB.phone} -> ${lookup.data.data.customerId}`);

  log('\nE2E OK: luồng chính chạy từ đầu đến cuối.');
}

main().catch((err) => {
  process.stderr.write(`\nE2E LỖI: ${err.message}\n`);
  process.exit(1);
});
