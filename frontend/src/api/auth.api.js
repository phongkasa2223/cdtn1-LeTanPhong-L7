import { request, session } from './client.js';

/**
 * Hợp đồng E1: POST /api/auth/login { username, password }
 *   -> { accessToken, expiresIn (giây), user: { username, fullName, role } }
 * Sai tên hoặc mật khẩu: 401 INVALID_CREDENTIALS.
 */
export async function login(username, password) {
  const result = await request('/api/auth/login', { method: 'POST', json: { username, password }, auth: false });
  session.start(result.accessToken, result.user);
  return result.user;
}

export function logout() {
  session.end();
}
