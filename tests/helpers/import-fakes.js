/**
 * Repository và đơn vị giao dịch GIẢ trong bộ nhớ, dùng để thử nghiệp vụ nhập file mà không cần CSDL.
 * makeUow mô phỏng giao dịch: lỗi giữa chừng thì trả kho dữ liệu về đúng trạng thái trước khi chạy (NFR3).
 */
const { ConstraintError } = require('../../src/errors/AppError');
const { normalizeName } = require('../../src/services/similarity');

const USERS = {
  1: { username: 'nv.lan', storeCode: 'CH01' },
  2: { username: 'nv.minh', storeCode: 'CH02' },
};

const pad = (n, width) => String(n).padStart(width, '0');

function createStore() {
  return { batches: [], customers: [], stg: [], dq: [], pairs: [] };
}

/** Thêm sẵn một hồ sơ vào kho (trước khi nhập hoặc trước khi duyệt cặp). */
function addCustomer(store, {
  fullName, phone, email = null, address = null, birthDate = null, mergedInto = null,
}) {
  const id = store.customers.length + 1;
  store.customers.push({
    customer_id: id,
    customer_code: `C${pad(id, 6)}`,
    full_name: fullName,
    phone,
    email,
    address,
    birth_date: birthDate,
    merged_into_id: mergedInto,
  });
  return id;
}

/** Thêm sẵn một cặp nghi trùng chờ duyệt; trả về mã cặp. */
function addPair(store, {
  batchId, aId, bId, matchedBy = 'EMAIL', similarity = 1,
}) {
  const id = store.pairs.length + 1;
  const code = `P${pad(id, 4)}`;
  store.pairs.push({
    pair_id: id,
    pair_code: code,
    import_batch_id: batchId,
    customer_a_id: aId,
    customer_b_id: bId,
    matched_by: matchedBy,
    similarity,
    status: 'PENDING',
  });
  return code;
}

/** Dòng truy vấn cặp (dạng phẳng a_*, b_*) giống câu SQL của repository thật; similarity là chuỗi như DECIMAL. */
function pairRow(store, pair) {
  const side = (id, p) => {
    const c = store.customers.find((x) => x.customer_id === id);
    return {
      [`${p}_id`]: c.customer_id,
      [`${p}_code`]: c.customer_code,
      [`${p}_name`]: c.full_name,
      [`${p}_phone`]: c.phone,
      [`${p}_email`]: c.email ?? null,
      [`${p}_address`]: c.address ?? null,
      [`${p}_birth`]: c.birth_date ?? null,
      [`${p}_merged`]: c.merged_into_id ?? null,
      [`${p}_source`]: 'RETAIL',
    };
  };
  const owner = USERS[store.batches.find((b) => b.import_batch_id === pair.import_batch_id).imported_by];
  return {
    pair_id: pair.pair_id,
    pair_code: pair.pair_code,
    matched_by: pair.matched_by,
    similarity: Number(pair.similarity).toFixed(2),
    status: pair.status,
    decided_at: pair.decided_at ?? null,
    decided_by_name: pair.decided_by ? USERS[pair.decided_by].username : null,
    ...side(pair.customer_a_id, 'a'),
    ...side(pair.customer_b_id, 'b'),
    store_code: owner.storeCode,
  };
}

const inScope = (row, scope) => !scope.restrict || row.store_code === scope.storeCode;

/** Ràng buộc UNIQUE của cột phone, như CSDL thật. */
function assertPhoneFree(store, customerId, phone) {
  if (store.customers.some((c) => c.customer_id !== customerId && c.phone === phone)) {
    throw new ConstraintError('DUPLICATE', 'trùng SĐT');
  }
}

function makeRepos(store, hooks = {}) {
  return {
    batches: {
      async create({ source, fileName, userId }) {
        const id = store.batches.length + 1;
        const code = `I${pad(id, 3)}`;
        const importedAt = '2026-10-24 10:00:00';
        store.batches.push({
          import_batch_id: id, import_code: code, source, file_name: fileName, imported_by: userId, imported_at: importedAt,
        });
        return { id, code, importedAt };
      },
      async findByCode(code, scope) {
        const batch = store.batches.find((b) => b.import_code === code);
        if (!batch) return null;
        const owner = USERS[batch.imported_by];
        if (scope.restrict && owner.storeCode !== scope.storeCode) return null;
        return { ...batch, username: owner.username };
      },
    },
    customers: {
      async findIdsByPhones(phones) {
        const found = new Map();
        for (const c of store.customers) {
          if (phones.includes(c.phone)) found.set(c.phone, c.merged_into_id ?? c.customer_id);
        }
        return found;
      },
      async insertMany(rows) {
        for (const r of rows) {
          if (store.customers.some((c) => c.phone === r.phone)) throw new ConstraintError('DUPLICATE', 'trùng SĐT');
          addCustomer(store, r);
          Object.assign(store.customers.at(-1), { email: r.email, birth_date: r.birthDate, address: r.address });
        }
      },
      async lockByIds(ids) {
        return store.customers.filter((c) => ids.includes(c.customer_id)).map((c) => ({ ...c }));
      },
      async update(customerId, data) {
        assertPhoneFree(store, customerId, data.phone);
        Object.assign(store.customers.find((c) => c.customer_id === customerId), {
          full_name: data.fullName,
          phone: data.phone,
          email: data.email,
          address: data.address,
          birth_date: data.birthDate,
        });
      },
      async setPhone(customerId, phone) {
        assertPhoneFree(store, customerId, phone);
        store.customers.find((c) => c.customer_id === customerId).phone = phone;
      },
      async markMerged(customerId, keeperId, phone) {
        const target = store.customers.find((c) => c.customer_id === customerId);
        if (phone !== undefined) {
          assertPhoneFree(store, customerId, phone);
          target.phone = phone;
        }
        target.merged_into_id = keeperId;
      },
      async findDuplicateCandidates(ids) {
        const found = [];
        const active = store.customers.filter((c) => !c.merged_into_id);
        for (const a of active.filter((c) => ids.includes(c.customer_id))) {
          for (const b of active.filter((c) => c.customer_id !== a.customer_id)) {
            const meta = { aId: a.customer_id, bId: b.customer_id, aName: a.full_name, bName: b.full_name };
            if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
              found.push({ ...meta, matchedBy: 'EMAIL' });
            }
            if (a.birth_date && a.birth_date === b.birth_date && normalizeName(a.full_name) === normalizeName(b.full_name)) {
              found.push({ ...meta, matchedBy: 'NAME_BIRTHDATE' });
            }
          }
        }
        return found;
      },
    },
    stg: {
      async insertMany(batchId, rows) {
        if (hooks.failOnStgInsert) throw new Error('mất kết nối cơ sở dữ liệu');
        const ids = new Map();
        for (const r of rows) {
          const id = store.stg.length + 1;
          store.stg.push({
            stg_customer_id: id,
            import_batch_id: batchId,
            row_no: r.rowNo,
            raw_full_name: r.raw.fullName,
            raw_phone: r.raw.phone,
            raw_email: r.raw.email,
            raw_address: r.raw.address,
            raw_birth_date: r.raw.birthDate,
            raw_created_date: r.raw.createdDate,
            full_name: r.normalized.fullName,
            phone: r.normalized.phone,
            email: r.normalized.email,
            address: r.normalized.address,
            birth_date: r.normalized.birthDate,
            created_date: r.normalized.createdDate,
            customer_id: r.customerId,
          });
          ids.set(r.rowNo, id);
        }
        return ids;
      },
      async listErrorRecords({ batchId, code, page, size }) {
        const rows = store.stg
          .filter((s) => s.import_batch_id === batchId && store.dq.some((d) => d.stg_customer_id === s.stg_customer_id
            && !d.resolved_at && (!code || d.rule_code === code)))
          .sort((a, b) => a.row_no - b.row_no);
        return { rows: rows.slice((page - 1) * size, page * size), total: rows.length };
      },
    },
    dq: {
      async insertMany(rows) {
        for (const r of rows) {
          store.dq.push({
            dq_result_id: store.dq.length + 1,
            stg_customer_id: r.stgCustomerId,
            rule_code: r.ruleCode,
            field_name: r.fieldName,
            message: r.message,
            resolved_at: null,
          });
        }
      },
      async listUnresolvedByStgIds(ids) {
        return store.dq.filter((d) => ids.includes(d.stg_customer_id) && !d.resolved_at);
      },
    },
    pairs: {
      async insertMany(batchId, pairs) {
        for (const p of pairs) {
          if (store.pairs.some((x) => x.customer_a_id === p.aId && x.customer_b_id === p.bId)) continue;
          const id = store.pairs.length + 1;
          store.pairs.push({
            pair_id: id,
            pair_code: `P${pad(id, 4)}`,
            import_batch_id: batchId,
            customer_a_id: p.aId,
            customer_b_id: p.bId,
            matched_by: p.matchedBy,
            similarity: p.similarity,
            status: 'PENDING',
          });
        }
      },
      async findByCode(code, scope) {
        const pair = store.pairs.find((p) => p.pair_code === code);
        if (!pair) return null;
        const row = pairRow(store, pair);
        return inScope(row, scope) ? row : null;
      },
      async list({ status, page, size, scope }) {
        const rows = store.pairs.filter((p) => p.status === status)
          .map((p) => pairRow(store, p)).filter((row) => inScope(row, scope))
          .sort((x, y) => Number(y.similarity) - Number(x.similarity) || x.pair_id - y.pair_id);
        return { rows: rows.slice((page - 1) * size, page * size), total: rows.length };
      },
      // BR4: chỉ người đầu tiên thắng. hooks.claimLost mô phỏng một nhân viên khác đã quyết định trước.
      async decide(pairId, { status, userId }) {
        const pair = store.pairs.find((p) => p.pair_id === pairId);
        if (hooks.claimLost || pair.status !== 'PENDING') return false;
        Object.assign(pair, { status, decided_by: userId, decided_at: '2026-10-24 11:00:00' });
        return true;
      },
      async countByBatch(batchId) {
        return store.pairs.filter((p) => p.import_batch_id === batchId).length;
      },
    },
  };
}

/** Giao dịch giả: lỗi thì khôi phục kho về trạng thái trước khi chạy. */
function makeUow(store, hooks = {}) {
  return {
    async run(work) {
      const snapshot = structuredClone(store);
      try {
        return await work(makeRepos(store, hooks));
      } catch (err) {
        Object.assign(store, snapshot);
        throw err;
      }
    },
  };
}

function makeReadRepos(store) {
  const { batches, stg, dq } = makeRepos(store);
  return { batches, stg, dq };
}

function makeReadPairRepos(store) {
  return { pairs: makeRepos(store).pairs };
}

module.exports = {
  USERS, createStore, addCustomer, addPair, makeUow, makeReadRepos, makeReadPairRepos,
};
