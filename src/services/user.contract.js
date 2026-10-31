/**
 * Hợp đồng dữ liệu của một tài khoản trả ra từ lớp nghiệp vụ (docs/api-contract.md, E12–E16).
 *   userId    : số, luôn có
 *   username  : chuỗi, luôn có, không đổi sau khi tạo
 *   fullName  : chuỗi, luôn có
 *   role      : DATA_STAFF hoặc DATA_MANAGER
 *   storeCode : mã đơn vị với DATA_STAFF, null với DATA_MANAGER (QT-14)
 *   createdAt : ISO 8601 kèm múi giờ
 * Không bao giờ có mật khẩu hay mã băm (NFR2): mọi nơi trả tài khoản ra ngoài đều đi qua đây.
 */
const { toIsoOffset } = require('./import.contract');

function toUserView(row) {
  return {
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    storeCode: row.store_code ?? null,
    createdAt: toIsoOffset(row.created_at),
  };
}

module.exports = { toUserView };
