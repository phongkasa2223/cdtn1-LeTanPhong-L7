/**
 * Hợp đồng dữ liệu của một hồ sơ khách hàng trả ra từ lớp nghiệp vụ (docs/api-contract.md).
 *   customerId  : chuỗi mã hiển thị (ví dụ C000013), luôn có
 *   fullName    : chuỗi, luôn có
 *   phone       : chuỗi 10 số. DATA_MANAGER xem đầy đủ, vai trò khác bị che 090****567 (QT-15)
 *   email, address, birthDate (yyyy-mm-dd) : chuỗi hoặc null
 *   createdDate : yyyy-mm-dd, luôn có
 *   mergedInto  : mã hồ sơ giữ lại nếu đã gộp (QT-13), ngược lại null
 * Mọi nơi trả hồ sơ ra ngoài đều đi qua đây, nên QT-15 không thể bị sót.
 */
const FULL_PHONE_ROLE = 'DATA_MANAGER';
const MIN_MASKABLE_LENGTH = 7;

/** 0901234567 -> 090****567. */
function maskPhone(phone) {
  if (!phone) return null;
  return phone.length >= MIN_MASKABLE_LENGTH ? `${phone.slice(0, 3)}****${phone.slice(-3)}` : '***';
}

/** Mặc định che: chỉ DATA_MANAGER mới thấy SĐT đầy đủ. */
function viewPhone(phone, viewer) {
  return viewer?.role === FULL_PHONE_ROLE ? phone : maskPhone(phone);
}

function toCustomerView(row, viewer) {
  return {
    customerId: row.customer_code,
    fullName: row.full_name,
    phone: viewPhone(row.phone, viewer),
    email: row.email ?? null,
    address: row.address ?? null,
    birthDate: row.birth_date ?? null,
    createdDate: row.created_date,
    mergedInto: row.merged_into_code || null,
  };
}

module.exports = { maskPhone, viewPhone, toCustomerView };
