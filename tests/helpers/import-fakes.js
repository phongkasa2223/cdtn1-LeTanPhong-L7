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

/** Thêm sẵn một hồ sơ vào kho (trước khi nhập). */
function addCustomer(store, { fullName, phone, email = null, birthDate = null, mergedInto = null }) {
  const id = store.customers.length + 1;
  store.customers.push({
    customer_id: id,
    customer_code: `C${pad(id, 6)}`,
    full_name: fullName,
    phone,
    email,
    birth_date: birthDate,
    merged_into_id: mergedInto,
  });
  return id;
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

module.exports = { USERS, createStore, addCustomer, makeUow, makeReadRepos };
