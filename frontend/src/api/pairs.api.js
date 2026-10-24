import { request, withQuery } from './client.js';

/**
 * Hợp đồng E4: GET /api/duplicate-pairs?status&page&size
 *   -> { page, size, total, items: [{ pairId, matchedBy, similarity (0..1), status,
 *        customerA: { customerId, fullName, phone (đã che), source }, customerB: {...} }] }
 */
export function listPairs({ status, page, size } = {}) {
  return request(withQuery('/api/duplicate-pairs', { status, page, size }));
}

/**
 * Hợp đồng E5: GET /api/duplicate-pairs/{pairId}
 *   -> như E4 nhưng customerA/B có thêm email, address, birthDate; kèm differentFields: [tên trường khác nhau]
 */
export function getPair(pairId) {
  return request(`/api/duplicate-pairs/${encodeURIComponent(pairId)}`);
}

/**
 * Hợp đồng E6: POST /api/duplicate-pairs/{pairId}/decision
 *   { action: 'MERGE', keepCustomerId, fieldChoices: { <trường>: customerId } } hoặc { action: 'KEEP_SEPARATE' }
 *   -> MERGE: { pairId, status, survivingCustomerId, mergedCustomerId, result, decidedBy, decidedAt }
 * Cặp đã có người quyết định trước: 409 PAIR_ALREADY_DECIDED (BR4).
 */
export function decidePair(pairId, body) {
  return request(`/api/duplicate-pairs/${encodeURIComponent(pairId)}/decision`, { method: 'POST', json: body });
}
