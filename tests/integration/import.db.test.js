/**
 * Test tích hợp nhập file: ImportService + repository thật + CSDL thử. Không có đối tượng giả, trừ chỗ cố ý làm hỏng
 * một câu SQL (TC-DB2). Mỗi test bắt đầu từ seeds/001_demo.sql nạp lại: 3 tài khoản, 12 hồ sơ, 2 lần nhập, 2 cặp nghi trùng.
 */
const {
  test, before, after, beforeEach,
} = require('node:test');
const assert = require('node:assert/strict');
const {
  openTestDb, resetDb, snapshotCounts, difference, TEST_JWT_SECRET,
} = require('../helpers/db');
const { csv } = require('../helpers/csv');
const { buildServices } = require('../../src/app');

const STAFF = {
  userId: 1, username: 'nv.lan', role: 'DATA_STAFF', storeCode: 'CH01',
};
let pool;

before(async () => {
  pool = await openTestDb();
});
after(async () => {
  await pool.end();
});
beforeEach(async () => {
  await resetDb(pool);
});

/** Bọc pool: câu SQL khớp `pattern` bị ném lỗi như mất kết nối giữa chừng, các câu khác chạy thật. */
function failingPool(real, pattern) {
  return {
    query: (...args) => real.query(...args),
    end: () => real.end(),
    getConnection: async () => {
      const conn = await real.getConnection();
      return {
        query: (sql, params) => {
          if (pattern.test(sql)) return Promise.reject(new Error('giả lập: mất kết nối khi ghi'));
          return conn.query(sql, params);
        },
        beginTransaction: () => conn.beginTransaction(),
        commit: () => conn.commit(),
        rollback: () => conn.rollback(),
        release: () => conn.release(),
      };
    },
  };
}

test('TC-DB1 nhập file lên CSDL thật: số dòng ở từng bảng khớp bản tóm tắt (luồng đúng)', async (t) => {
  const { importService } = buildServices(pool, { jwtSecret: TEST_JWT_SECRET });
  const countsBefore = await snapshotCounts(pool);

  const summary = await importService.importFile({
    buffer: csv(
      'Phạm Minh Tâm,0904111222,tam.pham@gmail.com,,10/02/1994,2025-01-05', // hợp lệ, hồ sơ mới
      'Ngô Bảo Châu,0905333444,,,,2025-02-11', // hợp lệ, hồ sơ mới
      'Lê Thanh Hà,09012345,,,,2025-03-01', // lỗi PHONE_LENGTH (8 chữ số)
      'Nguyễn Văn An,0907555666,an.nguyen@gmail.com,,1990-05-12,2025-04-01', // hợp lệ, trùng email và họ tên + ngày sinh với hồ sơ mẫu
      'Hoàng Thu Hà,0583777888,,,,2025-05-30', // SĐT đã có (C000009): gắn vào hồ sơ có sẵn
    ),
    fileName: 'tc-db1.csv',
    source: 'RETAIL',
    user: STAFF,
  });
  const added = difference(await snapshotCounts(pool), countsBefore);
  const [[stored]] = await pool.query('SELECT full_name, email, birth_date FROM customer WHERE phone = ?', ['0904111222']);

  t.diagnostic(`bản tóm tắt: ${summary.importId}, tổng ${summary.totalRecords}, hợp lệ ${summary.validRecords}, lỗi ${summary.errorRecords} `
    + `(PHONE_LENGTH ${summary.errorsByCode.PHONE_LENGTH}), hồ sơ mới ${summary.newCustomers}, gắn vào hồ sơ có sẵn ${summary.attachedRecords}, `
    + `cặp nghi trùng mới ${summary.newDuplicatePairs}`);
  t.diagnostic(`số dòng thêm vào từng bảng: ${JSON.stringify(added)}`);
  t.diagnostic(`hồ sơ 0904111222 trong CSDL: ${JSON.stringify(stored)}`);

  assert.equal(summary.importId, 'I003');
  assert.deepEqual(
    [summary.totalRecords, summary.validRecords, summary.errorRecords, summary.newCustomers,
      summary.attachedRecords, summary.newDuplicatePairs],
    [5, 4, 1, 3, 1, 2],
  );
  assert.equal(summary.errorsByCode.PHONE_LENGTH, 1);
  assert.deepEqual(added, {
    dq_result: 1, stg_customer: 5, duplicate_pair: 2, import_batch: 1, customer: 3, app_user: 0,
  });
  assert.deepEqual(stored, { full_name: 'Phạm Minh Tâm', email: 'tam.pham@gmail.com', birth_date: '1994-02-10' });
});

test('TC-DB2 NFR3: lỗi giữa chừng khi ghi thì CSDL thật không đổi, giao dịch được hoàn tác (chất lượng dữ liệu)', async (t) => {
  // Câu INSERT vào dq_result chạy SAU khi lần nhập, hồ sơ mới và bản ghi nhập đã được ghi trong cùng giao dịch.
  const { importService } = buildServices(failingPool(pool, /INSERT INTO dq_result/), { jwtSecret: TEST_JWT_SECRET });
  const countsBefore = await snapshotCounts(pool);

  let failure;
  await assert.rejects(
    () => importService.importFile({
      buffer: csv('Ngô Bảo Châu,0905333444,,,,2025-02-11', 'Lê Thanh Hà,09012345,,,,2025-03-01'),
      fileName: 'tc-db2.csv',
      source: 'RETAIL',
      user: STAFF,
    }),
    (err) => {
      failure = err;
      return err.code === 'IMPORT_FAILED' && /giả lập/.test(err.cause.message);
    },
  );
  const countsAfter = await snapshotCounts(pool);

  t.diagnostic(`lỗi trả về: ${failure.code} (${failure.message}); nguyên nhân gốc: ${failure.cause.message}`);
  t.diagnostic(`số dòng trước: ${JSON.stringify(countsBefore)}`);
  t.diagnostic(`số dòng sau:   ${JSON.stringify(countsAfter)}`);
  assert.deepEqual(countsAfter, countsBefore);
});
