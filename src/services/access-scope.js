/**
 * QT-14: Nhân viên dữ liệu chỉ thấy dữ liệu của cửa hàng/trung tâm mình; Quản lý dữ liệu thấy toàn công ty.
 * Nhân viên không có đơn vị thì không khớp đơn vị nào (không thấy gì), không phải thấy tất cả.
 */
function storeScope(user) {
  return { restrict: user?.role !== 'DATA_MANAGER', storeCode: user?.storeCode ?? null };
}

module.exports = { storeScope };
