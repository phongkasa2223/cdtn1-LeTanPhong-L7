/**
 * Hợp đồng dữ liệu của cặp nghi trùng (docs/api-contract.md, E4, E5).
 *   pairId       : mã cặp (P0007), luôn có
 *   similarity   : số từ 0 đến 1 (mã hóa thập phân của CSDL được đổi sang số)
 *   customerA/B  : { customerId, fullName, phone, source }; phone che theo QT-15; source là RETAIL, WARRANTY hoặc null
 *   differentFields : trường mà CẢ HAI hồ sơ đều có giá trị nhưng khác nhau (UC5-5a); SĐT luôn khác vì QT-01
 */
const { viewPhone } = require('./customer.contract');

const FIELDS = ['fullName', 'phone', 'email', 'address', 'birthDate'];

/** Một phía của cặp, đọc từ dòng truy vấn có tiền tố a_ hoặc b_. */
function sideOf(row, prefix) {
  return {
    id: row[`${prefix}_id`],
    code: row[`${prefix}_code`],
    fullName: row[`${prefix}_name`],
    phone: row[`${prefix}_phone`],
    email: row[`${prefix}_email`] ?? null,
    address: row[`${prefix}_address`] ?? null,
    birthDate: row[`${prefix}_birth`] ?? null,
    mergedInto: row[`${prefix}_merged`] ?? null,
    source: row[`${prefix}_source`] ?? null,
  };
}

function differentFields(a, b) {
  return FIELDS.filter((field) => a[field] != null && b[field] != null && a[field] !== b[field]);
}

const summaryOf = (side, viewer) => ({
  customerId: side.code,
  fullName: side.fullName,
  phone: viewPhone(side.phone, viewer),
  source: side.source,
});

const detailOf = (side, viewer) => ({
  ...summaryOf(side, viewer),
  email: side.email,
  address: side.address,
  birthDate: side.birthDate,
});

function toPairListItemView(row, viewer) {
  return {
    pairId: row.pair_code,
    matchedBy: row.matched_by,
    similarity: Number(row.similarity),
    status: row.status,
    customerA: summaryOf(sideOf(row, 'a'), viewer),
    customerB: summaryOf(sideOf(row, 'b'), viewer),
  };
}

function toPairDetailView(row, viewer) {
  const a = sideOf(row, 'a');
  const b = sideOf(row, 'b');
  return {
    pairId: row.pair_code,
    matchedBy: row.matched_by,
    similarity: Number(row.similarity),
    status: row.status,
    customerA: detailOf(a, viewer),
    customerB: detailOf(b, viewer),
    differentFields: differentFields(a, b),
  };
}

module.exports = { FIELDS, sideOf, differentFields, toPairListItemView, toPairDetailView };
