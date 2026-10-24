/**
 * Hợp đồng dữ liệu của lần nhập và bản ghi lỗi (docs/api-contract.md, E2, E3, E7).
 *   importId      : mã lần nhập (I003), luôn có
 *   importedAt    : ISO 8601 kèm múi giờ (+07:00), luôn có
 *   errorsByCode  : đủ 6 mã quy tắc, mã không có lỗi ghi 0
 *   original      : giá trị gốc của dòng file, không sửa (BR5), khóa theo tên cột file
 *   normalized    : giá trị sau chuẩn hóa, null nếu trường không hợp lệ (riêng họ tên, SĐT giữ phần đọc được)
 * Lớp trình bày chỉ biết hợp đồng này, không biết tên cột của bảng.
 */
const RULE_CODES = Object.freeze([
  'MISSING_FIELD', 'PHONE_LENGTH', 'PHONE_PREFIX', 'PHONE_CHAR', 'EMAIL_INVALID', 'DATE_INVALID',
]);
// Giờ của máy chủ CSDL, dùng để gắn múi giờ cho DATETIME.
const DB_TZ_OFFSET = process.env.DB_TZ_OFFSET || '+07:00';

/** "2026-10-24 09:15:00" -> "2026-10-24T09:15:00+07:00". */
function toIsoOffset(dbDateTime) {
  return dbDateTime ? `${String(dbDateTime).replace(' ', 'T')}${DB_TZ_OFFSET}` : null;
}

function emptyErrorsByCode() {
  return Object.fromEntries(RULE_CODES.map((code) => [code, 0]));
}

/** Kết quả của E2. newCustomers và attachedRecords là phần bổ sung ngoài hợp đồng BT1. */
function toImportSummaryView({ batch, username, source, fileName, counts }) {
  return {
    importId: batch.code,
    source,
    fileName,
    totalRecords: counts.total,
    validRecords: counts.valid,
    errorRecords: counts.total - counts.valid,
    errorsByCode: counts.byCode,
    newCustomers: counts.newCustomers,
    attachedRecords: counts.attached,
    newDuplicatePairs: counts.newPairs,
    importedBy: username,
    importedAt: toIsoOffset(batch.importedAt),
  };
}

function toImportListItemView(row) {
  return {
    importId: row.import_code,
    source: row.source,
    fileName: row.file_name,
    importedBy: row.username,
    importedAt: toIsoOffset(row.imported_at),
    totalRecords: Number(row.total_records),
    errorRecords: Number(row.error_records),
  };
}

function toErrorRecordView(stg, errors) {
  return {
    recordId: stg.stg_customer_id,
    rowNumber: stg.row_no,
    original: {
      ho_ten: stg.raw_full_name,
      so_dien_thoai: stg.raw_phone,
      email: stg.raw_email,
      dia_chi: stg.raw_address,
      ngay_sinh: stg.raw_birth_date,
      ngay_tao: stg.raw_created_date,
    },
    normalized: {
      fullName: stg.full_name,
      phone: stg.phone,
      email: stg.email,
      address: stg.address,
      birthDate: stg.birth_date,
      createdDate: stg.created_date,
    },
    errors: errors.map((e) => ({ code: e.rule_code, field: e.field_name, message: e.message })),
  };
}

module.exports = {
  RULE_CODES, toIsoOffset, emptyErrorsByCode, toImportSummaryView, toImportListItemView, toErrorRecordView,
};
