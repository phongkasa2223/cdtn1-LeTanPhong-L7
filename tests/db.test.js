const test = require('node:test');
const assert = require('node:assert/strict');
const { translateDbError, wrapPool } = require('../src/db');
const { AppError } = require('../src/errors/AppError');

const refused = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3306'), { code: 'ECONNREFUSED' });
const connectionLost = Object.assign(new Error('Connection lost'), { code: 'PROTOCOL_CONNECTION_LOST' });

test('TC-N1 mất kết nối CSDL đổi thành SERVICE_UNAVAILABLE, lỗi gốc giữ trong cause', () => {
  const out = translateDbError(refused);
  assert.ok(out instanceof AppError);
  assert.equal(out.code, 'SERVICE_UNAVAILABLE');
  assert.equal(out.cause, refused);
});

test('TC-N2 lỗi khác (trùng khóa, SQL sai) giữ nguyên để lớp trên tự xử lý', () => {
  const duplicate = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY', errno: 1062 });
  assert.equal(translateDbError(duplicate), duplicate);
  assert.equal(translateDbError(undefined), undefined);
});

test('TC-N3 pool bọc: query và getConnection bị từ chối thì ném SERVICE_UNAVAILABLE', async () => {
  const pool = wrapPool({
    query: async () => { throw refused; },
    getConnection: async () => { throw refused; },
    end: async () => {},
  });
  await assert.rejects(() => pool.query('SELECT 1'), { code: 'SERVICE_UNAVAILABLE' });
  await assert.rejects(() => pool.getConnection(), { code: 'SERVICE_UNAVAILABLE' });
});

test('TC-N4 kết nối bọc: lệnh đúng đi qua nguyên vẹn, đứt kết nối giữa giao dịch thành SERVICE_UNAVAILABLE', async () => {
  const calls = [];
  const rawConnection = {
    query: async (sql, params) => {
      calls.push([sql, params]);
      if (sql === 'BAD') throw connectionLost;
      return [[{ ok: 1 }]];
    },
    beginTransaction: async () => {},
    commit: async () => { throw connectionLost; },
    rollback: async () => {},
    release: () => calls.push(['release']),
  };
  const pool = wrapPool({ getConnection: async () => rawConnection, query: async () => [[]], end: async () => {} });

  const connection = await pool.getConnection();
  assert.deepEqual(await connection.query('SELECT ?', [1]), [[{ ok: 1 }]]);
  assert.deepEqual(calls[0], ['SELECT ?', [1]]);
  await assert.rejects(() => connection.query('BAD'), { code: 'SERVICE_UNAVAILABLE' });
  await assert.rejects(() => connection.commit(), { code: 'SERVICE_UNAVAILABLE' });
  connection.release();
  assert.deepEqual(calls.at(-1), ['release']);
});

test('TC-N5 lỗi không phải mất kết nối đi qua pool bọc nguyên vẹn (service vẫn bắt được ER_DUP_ENTRY)', async () => {
  const duplicate = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY', errno: 1062 });
  const pool = wrapPool({ query: async () => { throw duplicate; }, getConnection: async () => {}, end: async () => {} });
  await assert.rejects(() => pool.query('INSERT'), (err) => err === duplicate);
});
