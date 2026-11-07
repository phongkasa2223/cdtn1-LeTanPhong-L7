const test = require('node:test');
const assert = require('node:assert/strict');
const { UserService } = require('../src/services/user.service');
const { verifyPassword } = require('../src/services/auth.service');
const { ConstraintError } = require('../src/errors/AppError');

const ADMIN = { userId: 3, username: 'ql.hung', role: 'DATA_MANAGER' }; // người đang thao tác

const lan = {
  user_id: 1, username: 'nv.lan', password_hash: 'scrypt$aa$bb', full_name: 'Chị Lan',
  role: 'DATA_STAFF', store_code: 'CH01', created_at: '2026-10-24 09:00:00',
};
const hung = {
  user_id: 3, username: 'ql.hung', password_hash: 'scrypt$cc$dd', full_name: 'Anh Hùng',
  role: 'DATA_MANAGER', store_code: null, created_at: '2026-10-24 09:00:00',
};
const valid = {
  username: 'nv.mai', password: 'MatKhau123', fullName: 'Chị Mai', role: 'DATA_STAFF', storeCode: 'ch03',
};

/** Repository giả trong bộ nhớ. `referenced` là các user_id đã có lịch sử nên khóa ngoại chặn xóa. */
function fakeUsers(rows = [lan, hung], { referenced = [] } = {}) {
  const table = rows.map((r) => ({ ...r }));
  let nextId = Math.max(0, ...table.map((r) => r.user_id)) + 1;
  const copy = (row) => (row ? { ...row } : null);
  return {
    table,
    findById: async (id) => copy(table.find((r) => r.user_id === id)),
    list: async ({ page, size }) => ({
      rows: table.slice((page - 1) * size, page * size).map(copy), total: table.length,
    }),
    countByRole: async (role) => table.filter((r) => r.role === role).length,
    insert: async (data) => {
      if (table.some((r) => r.username === data.username)) throw new ConstraintError('DUPLICATE', 'trùng tên đăng nhập');
      const row = {
        user_id: nextId,
        username: data.username,
        password_hash: data.passwordHash,
        full_name: data.fullName,
        role: data.role,
        store_code: data.storeCode,
        created_at: '2026-10-31 09:00:00',
      };
      nextId += 1;
      table.push(row);
      return row.user_id;
    },
    update: async (id, data) => {
      const row = table.find((r) => r.user_id === id);
      Object.assign(row, { full_name: data.fullName, role: data.role, store_code: data.storeCode });
      if (data.passwordHash) row.password_hash = data.passwordHash;
    },
    remove: async (id) => {
      if (referenced.includes(id)) throw new ConstraintError('REFERENCED', 'khóa ngoại');
      table.splice(table.findIndex((r) => r.user_id === id), 1);
    },
  };
}
const service = (repo) => new UserService(repo);

/** Gọi create và trả về danh sách trường bị lỗi (null nếu tạo được). */
const failedFields = (svc, input) => svc.create(input).then(
  () => null,
  (err) => err.details?.map((d) => d.field).join(','),
);

// --- Luồng đúng ---

test('TC-U1 tạo tài khoản: hợp đồng không có mật khẩu, mật khẩu lưu dạng băm scrypt, mã đơn vị viết hoa', async () => {
  const repo = fakeUsers();
  const view = await service(repo).create(valid);
  assert.deepEqual(view, {
    userId: 4, username: 'nv.mai', fullName: 'Chị Mai', role: 'DATA_STAFF', storeCode: 'CH03', createdAt: '2026-10-31T09:00:00+07:00',
  });
  assert.equal(JSON.stringify(view).includes('MatKhau123'), false);
  const stored = repo.table.at(-1).password_hash;
  assert.ok(stored.startsWith('scrypt$'));
  assert.equal(await verifyPassword('MatKhau123', stored), true);
  assert.equal(await verifyPassword('SaiMatKhau1', stored), false);
});

test('TC-U2 sửa họ tên và đơn vị; không gửi mật khẩu thì giữ mật khẩu cũ, có gửi thì băm lại', async () => {
  const repo = fakeUsers();
  const svc = service(repo);
  const before = repo.table[0].password_hash;
  const view = await svc.update('1', { fullName: 'Chị Lan Anh', role: 'DATA_STAFF', storeCode: 'CH02' });
  assert.equal(view.fullName, 'Chị Lan Anh');
  assert.equal(view.storeCode, 'CH02');
  assert.equal(repo.table[0].password_hash, before);
  await svc.update('1', {
    fullName: 'Chị Lan Anh', role: 'DATA_STAFF', storeCode: 'CH02', password: 'MatKhauMoi9',
  });
  assert.notEqual(repo.table[0].password_hash, before);
  assert.equal(await verifyPassword('MatKhauMoi9', repo.table[0].password_hash), true);
});

test('TC-U3 xóa tài khoản chưa có lịch sử thì xong, tra lại báo USER_NOT_FOUND', async () => {
  const repo = fakeUsers();
  const svc = service(repo);
  await svc.remove('1', ADMIN);
  assert.equal(repo.table.length, 1);
  await assert.rejects(() => svc.get('1'), (err) => err.code === 'USER_NOT_FOUND');
});

test('TC-U4 danh sách phân trang, không lộ mã băm mật khẩu', async () => {
  const svc = service(fakeUsers());
  const page = await svc.list({});
  assert.equal(page.total, 2);
  assert.equal(page.size, 50);
  assert.equal(JSON.stringify(page).includes('scrypt'), false);
  assert.equal(JSON.stringify(page).includes('password'), false);
});

// --- Giá trị biên ---

test('TC-U5 tên đăng nhập 3 ký tự được và 2 ký tự bị từ chối; mật khẩu 8 và 72 ký tự được, 7 và 73 bị từ chối', async () => {
  const svc = service(fakeUsers());
  assert.equal(await failedFields(svc, { ...valid, username: 'abc' }), null);
  assert.equal(await failedFields(svc, { ...valid, username: 'ab' }), 'username');
  assert.equal(await failedFields(svc, { ...valid, username: 'tk8', password: 'a1234567' }), null);
  assert.equal(await failedFields(svc, { ...valid, username: 'tk7', password: 'a123456' }), 'password');
  assert.equal(await failedFields(svc, { ...valid, username: 'tk72', password: `a1${'x'.repeat(70)}` }), null);
  assert.equal(await failedFields(svc, { ...valid, username: 'tk73', password: `a1${'x'.repeat(71)}` }), 'password');
});

// --- Dữ liệu sai ---

test('TC-U6 dữ liệu sai bị từ chối VALIDATION_ERROR, báo đủ các trường lỗi một lần', async () => {
  const svc = service(fakeUsers());
  await assert.rejects(
    () => svc.create({
      username: 'Viết Hoa', password: 'toàn chữ', fullName: ' ', role: 'ADMIN',
    }),
    (err) => err.code === 'VALIDATION_ERROR'
      && ['username', 'password', 'fullName', 'role'].every((field) => err.details.some((d) => d.field === field)),
  );
  await assert.rejects(() => svc.create(null), (err) => err.code === 'VALIDATION_ERROR');
});

test('TC-U7 QT-14: Nhân viên dữ liệu phải có mã đơn vị, Quản lý dữ liệu thì không được có', async () => {
  const svc = service(fakeUsers());
  assert.equal(await failedFields(svc, { ...valid, username: 'thieu.dv', storeCode: undefined }), 'storeCode');
  const manager = {
    ...valid, username: 'ql.moi', role: 'DATA_MANAGER', storeCode: 'CH01',
  };
  assert.equal(await failedFields(svc, manager), 'storeCode');
  const view = await svc.create({ ...manager, storeCode: undefined });
  assert.equal(view.storeCode, null);
});

test('TC-U8 tên đăng nhập đã dùng bị từ chối USERNAME_TAKEN', async () => {
  await assert.rejects(
    () => service(fakeUsers()).create({ ...valid, username: 'nv.lan' }),
    (err) => err.code === 'USERNAME_TAKEN',
  );
});

test('TC-U9 tên đăng nhập không đổi được sau khi tạo (IMMUTABLE), gửi lại đúng tên cũ thì không sao', async () => {
  const svc = service(fakeUsers());
  const body = { fullName: 'Chị Lan', role: 'DATA_STAFF', storeCode: 'CH01' };
  await assert.rejects(
    () => svc.update('1', { ...body, username: 'nv.khac' }),
    (err) => err.code === 'VALIDATION_ERROR' && err.details[0].code === 'IMMUTABLE',
  );
  assert.equal((await svc.update('1', { ...body, username: 'nv.lan' })).username, 'nv.lan');
});

test('TC-U10 mã tài khoản không phải số nguyên dương bị từ chối, mã không tồn tại báo USER_NOT_FOUND', async () => {
  const svc = service(fakeUsers());
  for (const id of ['abc', '0', '-1', '1.5', '1e3', '']) {
    await assert.rejects(() => svc.get(id), (err) => err.code === 'VALIDATION_ERROR', id);
  }
  await assert.rejects(() => svc.get('999'), (err) => err.code === 'USER_NOT_FOUND');
});

test('TC-U11 danh sách với size vượt 100 bị từ chối INVALID_PAGE', async () => {
  await assert.rejects(() => service(fakeUsers()).list({ size: '101' }), (err) => err.code === 'INVALID_PAGE');
});

// --- Các luật nghiệp vụ khi xóa và đổi vai trò ---

test('TC-U12 không tự xóa tài khoản đang đăng nhập (CANNOT_DELETE_SELF)', async () => {
  const repo = fakeUsers();
  await assert.rejects(() => service(repo).remove('3', ADMIN), (err) => err.code === 'CANNOT_DELETE_SELF');
  assert.equal(repo.table.length, 2);
});

test('TC-U13 Quản lý dữ liệu cuối cùng không bị xóa hay hạ vai trò (LAST_MANAGER); có người thứ hai thì được', async () => {
  const repo = fakeUsers();
  const svc = service(repo);
  const demote = { fullName: 'Anh Hùng', role: 'DATA_STAFF', storeCode: 'CH01' };
  await assert.rejects(() => svc.update('3', demote), (err) => err.code === 'LAST_MANAGER');
  await assert.rejects(() => svc.remove('3', { userId: 1 }), (err) => err.code === 'LAST_MANAGER');
  await svc.create({
    username: 'ql.hoa', password: 'MatKhau123', fullName: 'Chị Hoa', role: 'DATA_MANAGER',
  });
  assert.equal((await svc.update('3', demote)).role, 'DATA_STAFF');
});

test('TC-U14 tài khoản đã có lịch sử (lần nhập, quyết định duyệt cặp) không xóa được (USER_HAS_HISTORY)', async () => {
  const repo = fakeUsers([lan, hung], { referenced: [1] });
  await assert.rejects(() => service(repo).remove('1', ADMIN), (err) => err.code === 'USER_HAS_HISTORY');
  assert.equal(repo.table.length, 2);
});

// --- BUG-010: hai Quản lý xóa nhau cùng lúc ---

test('TC-U15 xóa Quản lý chạy trong giao dịch và khóa các dòng Quản lý trước khi đếm, nên hai người xóa nhau cùng lúc không cùng qua', async (t) => {
  const calls = [];
  const base = fakeUsers([lan, hung, { ...hung, user_id: 4, username: 'ql.hoa' }]);
  const repo = {
    ...base,
    lockManagers: async () => { calls.push('lockManagers'); },
    countByRole: async (role) => { calls.push('countByRole'); return base.countByRole(role); },
    remove: async (id) => { calls.push(`remove ${id}`); return base.remove(id); },
  };
  const uow = {
    run: async (work) => {
      calls.push('begin');
      const result = await work({ users: repo });
      calls.push('commit');
      return result;
    },
  };
  await new UserService(repo, uow).remove('4', ADMIN);
  t.diagnostic(`thứ tự thao tác: ${calls.join(' -> ')}`);
  assert.deepEqual(calls, ['begin', 'lockManagers', 'countByRole', 'remove 4', 'commit']);
});

test('TC-U16 xóa nhân viên không cần khóa các dòng Quản lý và không mở giao dịch, để không làm chậm thao tác thường', async () => {
  const calls = [];
  const base = fakeUsers();
  const repo = { ...base, lockManagers: async () => { calls.push('lockManagers'); } };
  const uow = { run: async () => { calls.push('begin'); } };
  await new UserService(repo, uow).remove('1', ADMIN);
  assert.deepEqual(calls, []);
  assert.equal(base.table.length, 1);
});
