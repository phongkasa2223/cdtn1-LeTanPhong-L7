/** Nhãn tiếng Việt cho các mã của API. Màn hình dùng đúng thuật ngữ trong bảng thuật ngữ SRS mục 1.4. */
export const RULE_LABELS = {
  MISSING_FIELD: 'Thiếu trường bắt buộc',
  PHONE_LENGTH: 'SĐT không đủ 10 chữ số',
  PHONE_PREFIX: 'Đầu số không thuộc danh mục',
  PHONE_CHAR: 'SĐT chứa ký tự lạ',
  EMAIL_INVALID: 'Email sai định dạng',
  DATE_INVALID: 'Ngày sai định dạng hoặc ở tương lai',
};

export const FIELD_LABELS = {
  fullName: 'Họ tên',
  phone: 'Số điện thoại',
  email: 'Email',
  address: 'Địa chỉ',
  birthDate: 'Ngày sinh',
};

export const MATCH_LABELS = { EMAIL: 'Cùng email', NAME_BIRTHDATE: 'Cùng họ tên và ngày sinh' };
export const SOURCE_LABELS = { RETAIL: 'Bán lẻ', WARRANTY: 'Bảo hành' };
export const STATUS_LABELS = { PENDING: 'Chờ duyệt', MERGED: 'Đã gộp', KEEP_SEPARATE: 'Giữ riêng' };
export const ROLE_LABELS = { DATA_STAFF: 'Nhân viên dữ liệu', DATA_MANAGER: 'Quản lý dữ liệu' };

/** Số kiểu Việt Nam: 2.610 */
export const formatNumber = (n) => new Intl.NumberFormat('vi-VN').format(n);

/** 0.93 -> "93%" */
export const formatPercent = (ratio) => `${Math.round(ratio * 100)}%`;

/** "2026-10-24T10:38:05+07:00" -> "24/10/2026 10:38" */
export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Giá trị rỗng hiện dấu gạch để không nhầm với "chưa tải". */
export const orDash = (value) => (value === null || value === undefined || value === '' ? '—' : value);
