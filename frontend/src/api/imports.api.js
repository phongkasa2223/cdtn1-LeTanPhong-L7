import { request, withQuery } from './client.js';

/**
 * Hợp đồng E2: POST /api/imports (multipart: source = RETAIL | WARRANTY, file = CSV)
 *   -> { importId, source, fileName, totalRecords, validRecords, errorRecords,
 *        errorsByCode: { <mã lỗi>: số }, newCustomers, attachedRecords, newDuplicatePairs, importedBy, importedAt }
 */
export function uploadImport(file, source) {
  const form = new FormData();
  form.append('source', source);
  form.append('file', file);
  return request('/api/imports', { method: 'POST', form });
}

/**
 * Hợp đồng E7: GET /api/imports?page&size
 *   -> { page, size, total, items: [{ importId, source, fileName, importedBy, importedAt, totalRecords, errorRecords }] }
 */
export function listImports({ page, size } = {}) {
  return request(withQuery('/api/imports', { page, size }));
}

/**
 * Hợp đồng E3: GET /api/imports/{importId}/errors?code&page&size
 *   -> { importId, code, page, size, total,
 *        items: [{ recordId, rowNumber, original: { ho_ten, so_dien_thoai, email, dia_chi, ngay_sinh, ngay_tao },
 *                  normalized: {...}, errors: [{ code, field, message }] }] }
 */
export function listErrors(importId, { code, page, size } = {}) {
  return request(withQuery(`/api/imports/${encodeURIComponent(importId)}/errors`, { code, page, size }));
}
