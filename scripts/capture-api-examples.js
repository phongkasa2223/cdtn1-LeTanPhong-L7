/**
 * Gọi lần lượt mọi endpoint của API đang chạy và in ra JSON gồm request và response THẬT. Đây là nguồn của các ví dụ
 * trong docs/api-docs/ (ví dụ phải chép từ lần chạy thật, không viết tay).
 *
 * Dùng, trên CSDL vừa nạp seeds (docker compose down -v rồi up lại):
 *   docker compose exec -T app node scripts/capture-api-examples.js > api-examples.json
 *
 * CẢNH BÁO: script GHI dữ liệu (tạo hồ sơ và tài khoản, nhập file, duyệt cặp, cố tình đăng nhập sai để gặp 429),
 * chỉ chạy trên môi trường thử. Chạy lại lần hai trên cùng CSDL sẽ gặp 409 vì dữ liệu đã tồn tại.
 * Biến: CAPTURE_BASE_URL (mặc định http://localhost:PORT), CAPTURE_PASSWORD (mật khẩu tài khoản mẫu, mặc định Demo@123).
 */
const BASE = process.env.CAPTURE_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const PASSWORD = process.env.CAPTURE_PASSWORD || 'Demo@123';

const captures = [];

/** Token chỉ in 16 ký tự đầu: đủ để người đọc nhận ra dạng JWT mà không để lộ một token dùng được. */
const maskToken = (value) => `${String(value).slice(0, 16)}...`;

function pickHeaders(headers, names) {
  const picked = {};
  for (const name of names) {
    if (headers.has(name)) picked[name] = headers.get(name);
  }
  return picked;
}

/** Gọi một endpoint, ghi lại request và response vào `captures`, trả về { status, body } để các bước sau dùng. */
async function call(name, method, path, { token, json, form, formNote } = {}) {
  const init = { method, headers: {} };
  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(json);
  }
  if (form) init.body = form;
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  const shown = body && body.accessToken ? { ...body, accessToken: maskToken(body.accessToken) } : body;
  const request = { method, path, authorization: token ? 'Bearer <token>' : 'none' };
  if (json !== undefined) request.body = json;
  if (formNote) request.body = formNote;
  captures.push({
    name,
    request,
    response: { status: res.status, headers: pickHeaders(res.headers, ['location', 'retry-after']), body: shown },
  });
  return { status: res.status, body };
}

const CSV_SAMPLE = [
  'ho_ten,so_dien_thoai,email,dia_chi,ngay_sinh,ngay_tao',
  'Nguyễn Minh Tâm,0912000111,tam.nguyen@example.com,"10 Lê Lợi, Q.1, TP.HCM",1992-03-04,2026-11-01',
  'trần  thu hà,+84 913 000 222,,,15/08/1990,2026-11-01',
  'Phạm Văn Lực,09123456,,,,2026-11-01',
  'Lê Thị Nở,0111222333,,,,2026-11-01',
  ',0934000555,,,,2026-11-01',
  'Nguyen Van An,0909000999,an.nguyen@gmail.com,,1990-05-12,2026-11-01',
].join('\n');

async function main() {
  await call('health', 'GET', '/health');

  // Đăng nhập (E1): thành công, sai mật khẩu, và bị khóa sau 5 lần sai liên tiếp (dùng một tên khác để không khóa tài khoản mẫu).
  const staffLogin = await call('login_ok', 'POST', '/api/auth/login', { json: { username: 'nv.lan', password: PASSWORD } });
  const managerLogin = await call('login_manager', 'POST', '/api/auth/login', { json: { username: 'ql.hung', password: PASSWORD } });
  const staff = staffLogin.body.accessToken;
  const manager = managerLogin.body.accessToken;
  await call('login_wrong_password', 'POST', '/api/auth/login', { json: { username: 'nv.lan', password: 'SaiMatKhau1' } });
  for (let i = 0; i < 5; i += 1) {
    await call(`login_throttle_attempt_${i + 1}`, 'POST', '/api/auth/login', { json: { username: 'nv.thu.sai', password: 'SaiMatKhau1' } });
  }
  await call('login_throttled', 'POST', '/api/auth/login', { json: { username: 'nv.thu.sai', password: 'SaiMatKhau1' } });
  await call('payload_too_large', 'POST', '/api/auth/login', { json: { username: 'nv.lan', password: 'x'.repeat(300 * 1024) } });
  captures[captures.length - 1].request.body = '{ "username": "nv.lan", "password": "<300 KB of x>" }';
  await call('no_token', 'GET', '/api/customers');

  // Hồ sơ khách hàng (E9, E17 và các endpoint tạo, xem, sửa).
  await call('customers_list_staff', 'GET', '/api/customers?page=1&size=2', { token: staff });
  await call('customers_list_manager', 'GET', '/api/customers?page=1&size=2', { token: manager });
  await call('customers_by_phone', 'GET', '/api/customers?phone=0901234567', { token: staff });
  await call('customer_get', 'GET', '/api/customers/C000001', { token: staff });
  await call('customer_get_not_found', 'GET', '/api/customers/C999999', { token: staff });
  const created = await call('customer_create', 'POST', '/api/customers', {
    token: staff,
    json: { fullName: 'Phạm Thu Hà', phone: '0935123456', email: 'ha.pham@example.com', address: '12 Lê Lợi, Q.1, TP.HCM', birthDate: '1994-07-21' },
  });
  const code = created.body.data.customerId;
  await call('customer_create_invalid', 'POST', '/api/customers', { token: staff, json: { fullName: 'A', phone: '09123456' } });
  await call('customer_create_duplicate_phone', 'POST', '/api/customers', { token: staff, json: { fullName: 'Người Trùng Số', phone: '0935 123 456' } });
  await call('customer_update', 'PUT', `/api/customers/${code}`, {
    token: staff,
    json: { fullName: 'Phạm Thu Hà', phone: '0935123456', email: 'ha.pham@example.com', address: '45 Nguyễn Huệ, Q.1, TP.HCM', birthDate: '1994-07-21' },
  });
  await call('customer_create_as_manager', 'POST', '/api/customers', { token: manager, json: { fullName: 'Quản Lý Thử', phone: '0935123457' } });
  await call('customer_delete', 'DELETE', `/api/customers/${code}`, { token: staff });
  await call('customer_delete_again', 'DELETE', `/api/customers/${code}`, { token: staff });

  // Lần nhập (E2, E3, E7).
  await call('imports_list', 'GET', '/api/imports?page=1&size=5', { token: staff });
  const form = new FormData();
  form.append('source', 'RETAIL');
  form.append('file', new Blob([CSV_SAMPLE], { type: 'text/csv' }), 'khach_hang_ban_le_mau.csv');
  const imported = await call('imports_create', 'POST', '/api/imports', {
    token: staff, form, formNote: 'multipart/form-data: source=RETAIL, file=khach_hang_ban_le_mau.csv (6 dòng dữ liệu)',
  });
  const importId = imported.body.importId;
  await call('imports_errors', 'GET', `/api/imports/${importId}/errors?page=1&size=2`, { token: staff });
  await call('imports_errors_by_code', 'GET', `/api/imports/${importId}/errors?code=PHONE_LENGTH`, { token: staff });
  await call('imports_errors_not_found', 'GET', '/api/imports/I999/errors', { token: staff });
  const badForm = new FormData();
  badForm.append('source', 'RETAIL');
  badForm.append('file', new Blob(['ho_ten,email\nA,a@example.com\n'], { type: 'text/csv' }), 'thieu_cot.csv');
  await call('imports_missing_columns', 'POST', '/api/imports', {
    token: staff, form: badForm, formNote: 'multipart/form-data: source=RETAIL, file=thieu_cot.csv (thiếu cột so_dien_thoai, ngay_tao)',
  });

  // Cặp nghi trùng (E4, E5, E6).
  await call('pairs_list', 'GET', '/api/duplicate-pairs?status=PENDING&page=1&size=2', { token: staff });
  const detail = await call('pair_get', 'GET', '/api/duplicate-pairs/P0001', { token: staff });
  const fieldChoices = {};
  for (const field of detail.body.differentFields) fieldChoices[field] = detail.body.customerA.customerId;
  await call('pair_decision_merge', 'POST', '/api/duplicate-pairs/P0001/decision', {
    token: staff, json: { action: 'MERGE', keepCustomerId: detail.body.customerA.customerId, fieldChoices },
  });
  await call('pair_decision_again', 'POST', '/api/duplicate-pairs/P0001/decision', { token: staff, json: { action: 'KEEP_SEPARATE' } });
  await call('pair_decision_keep_separate', 'POST', '/api/duplicate-pairs/P0002/decision', { token: staff, json: { action: 'KEEP_SEPARATE' } });
  await call('pair_get_not_found', 'GET', '/api/duplicate-pairs/P9999', { token: staff });

  // Tài khoản (E12 đến E16): chỉ Quản lý dữ liệu.
  await call('users_list', 'GET', '/api/users?page=1&size=2', { token: manager });
  await call('users_list_as_staff', 'GET', '/api/users', { token: staff });
  const user = await call('user_create', 'POST', '/api/users', {
    token: manager,
    json: { username: 'nv.thu', password: 'MatKhau123', fullName: 'Chị Thu', role: 'DATA_STAFF', storeCode: 'CH03' },
  });
  const userId = user.body.data.userId;
  await call('user_create_taken', 'POST', '/api/users', {
    token: manager, json: { username: 'nv.thu', password: 'MatKhau123', fullName: 'Chị Thu', role: 'DATA_STAFF', storeCode: 'CH03' },
  });
  await call('user_get', 'GET', `/api/users/${userId}`, { token: manager });
  await call('user_update', 'PUT', `/api/users/${userId}`, { token: manager, json: { fullName: 'Chị Thu Hà', role: 'DATA_STAFF', storeCode: 'CH02' } });
  await call('user_delete', 'DELETE', `/api/users/${userId}`, { token: manager });
  await call('user_delete_has_history', 'DELETE', '/api/users/1', { token: manager });
  await call('user_not_found', 'GET', '/api/users/999999', { token: manager });

  process.stdout.write(`${JSON.stringify(captures, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`LỖI: ${err.message}\n`);
  process.exit(1);
});
