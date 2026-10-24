/**
 * Đổi mã lỗi của API thành thông báo cho người dùng gồm ba phần: chuyện gì, vì sao, làm gì tiếp.
 * Không bao giờ hiện lỗi kỹ thuật, tên bảng hay câu SQL; lỗi hệ thống chỉ hiện mã tra cứu để đối chiếu log.
 */
const MESSAGES = {
  NETWORK_ERROR: [
    'Không kết nối được tới hệ thống.',
    'Máy chủ không phản hồi hoặc kết nối mạng bị ngắt.',
    'Kiểm tra mạng rồi bấm Thử lại. Dữ liệu bạn đã chọn vẫn được giữ.',
  ],
  UNAUTHORIZED: ['Phiên đăng nhập đã hết hạn.', 'Phiên làm việc không còn hiệu lực.', 'Đăng nhập lại để tiếp tục.'],
  INVALID_CREDENTIALS: ['Đăng nhập không thành công.', 'Sai tên đăng nhập hoặc mật khẩu.', 'Kiểm tra lại rồi thử lần nữa.'],
  VALIDATION_ERROR: ['Thông tin chưa hợp lệ.', 'Tên đăng nhập dài 3–50 ký tự, mật khẩu dài 8–72 ký tự.', 'Sửa lại rồi gửi lần nữa.'],
  FORBIDDEN: [
    'Bạn không có quyền dùng chức năng này.',
    'Vai trò của tài khoản hiện tại không được phép.',
    'Đăng nhập bằng tài khoản Nhân viên dữ liệu hoặc liên hệ quản lý.',
  ],
  INVALID_FILE_TYPE: ['File không phải CSV.', 'Chỉ nhận file có đuôi .csv.', 'Chọn lại file xuất từ hệ thống bán lẻ hoặc bảo hành.'],
  FILE_TOO_LARGE: ['File lớn hơn 5 MB.', 'Mỗi lần nhập tối đa 5 MB.', 'Tách thành nhiều file nhỏ rồi nhập từng file.'],
  MISSING_COLUMNS: (e) => [
    'File thiếu cột bắt buộc.',
    `Còn thiếu cột: ${(e.details || []).join(', ')}.`,
    'Bổ sung các cột này vào file rồi chọn lại.',
  ],
  EMPTY_FILE: ['File không có dữ liệu.', 'File chỉ có dòng tiêu đề.', 'Chọn file có ít nhất một dòng khách hàng.'],
  INVALID_SOURCE: ['Chưa chọn nguồn dữ liệu.', 'Nguồn phải là Bán lẻ hoặc Bảo hành.', 'Chọn nguồn rồi nhập lại.'],
  IMPORT_FAILED: [
    'Không lưu được lần nhập.',
    'Có lỗi khi lưu nên toàn bộ file đã được hủy, chưa có bản ghi nào được lưu.',
    'Bấm Thử lại sau ít phút.',
  ],
  IMPORT_NOT_FOUND: ['Không tìm thấy lần nhập.', 'Mã lần nhập không tồn tại hoặc thuộc đơn vị khác.', 'Chọn một lần nhập trong danh sách.'],
  PAIR_NOT_FOUND: ['Không tìm thấy cặp nghi trùng.', 'Mã cặp không tồn tại hoặc thuộc đơn vị khác.', 'Quay về danh sách để chọn cặp khác.'],
  PAIR_ALREADY_DECIDED: [
    'Cặp này đã được xử lý.',
    'Một nhân viên khác đã quyết định trước bạn.',
    'Quay về danh sách để chọn cặp khác.',
  ],
  FIELD_CHOICE_REQUIRED: ['Chưa chọn đủ giá trị giữ lại.', 'Mọi trường khác nhau đều cần chọn một giá trị.', 'Chọn đủ rồi bấm Gộp lại.'],
  KEEP_ID_REQUIRED: ['Chưa chọn hồ sơ giữ lại.', 'Gộp cần biết hồ sơ nào được giữ.', 'Chọn hồ sơ A hoặc B rồi bấm Gộp.'],
  CUSTOMER_MERGED: [
    'Cặp này không còn hiệu lực.',
    'Một trong hai hồ sơ đã được gộp ở cặp khác.',
    'Quay về danh sách để chọn cặp khác.',
  ],
};

/** @returns {{what: string, why: string, next: string, ref: string|null}} */
export function describeError(error) {
  const entry = MESSAGES[error?.code];
  if (entry) {
    const [what, why, next] = typeof entry === 'function' ? entry(error) : entry;
    return { what, why, next, ref: null };
  }
  return {
    what: 'Hệ thống đang gặp sự cố.',
    why: 'Có lỗi không lường trước ở máy chủ.',
    next: 'Bấm Thử lại sau ít phút. Nếu vẫn lỗi, báo mã tra cứu bên dưới cho người quản trị.',
    ref: error?.requestId ?? null,
  };
}
