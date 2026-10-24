/**
 * Lớp client DUY NHẤT gọi fetch. Các trang chỉ gọi hàm trong *.api.js, không tự gọi fetch.
 *
 * Hợp đồng lỗi (docs/api-contract.md): { error: { code, message, details?, requestId? } }.
 * Giao diện rẽ nhánh theo error.code, không dựa vào câu chữ của message.
 */
const BASE_URL = import.meta.env.VITE_API_BASE ?? '';
const TOKEN_KEY = 'mekong.token';
const USER_KEY = 'mekong.user';

/** sessionStorage có thể bị chặn (chế độ riêng tư): luôn bọc try/catch, mất phiên thì phải đăng nhập lại. */
function safeStorage(key) {
  return {
    get() {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(value) {
      try {
        sessionStorage.setItem(key, value);
      } catch {
        // Không lưu được thì thôi, phiên chỉ sống đến khi tải lại trang.
      }
    },
    clear() {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Không làm gì.
      }
    },
  };
}

const tokenSlot = safeStorage(TOKEN_KEY);
const userSlot = safeStorage(USER_KEY);

export const session = {
  token: () => tokenSlot.get(),
  user() {
    try {
      return JSON.parse(userSlot.get());
    } catch {
      return null;
    }
  },
  start(token, user) {
    tokenSlot.set(token);
    userSlot.set(JSON.stringify(user));
  },
  end() {
    tokenSlot.clear();
    userSlot.clear();
  },
};

export class ApiError extends Error {
  constructor({ status, code, message, details, requestId }) {
    super(message || code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

let unauthorizedHandler = () => {};

/** Đăng ký hàm chạy khi nhận 401 (App chuyển về trang đăng nhập). Trả về hàm hủy đăng ký. */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
  return () => { unauthorizedHandler = () => {}; };
}

/** Ghép query string, bỏ qua giá trị rỗng. */
export function withQuery(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

/**
 * @param {string} path đường dẫn API, ví dụ '/api/imports'
 * @param {{method?: string, json?: object, form?: FormData, auth?: boolean}} options
 * @returns dữ liệu JSON của phản hồi
 * @throws {ApiError} status 0 và code NETWORK_ERROR khi không kết nối được; 401 thì xóa phiên và gọi handler
 */
export async function request(path, { method = 'GET', json, form, auth = true } = {}) {
  const headers = {};
  const token = session.token();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form; // trình duyệt tự đặt Content-Type multipart kèm boundary
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { method, headers, body });
  } catch {
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Không kết nối được tới máy chủ.' });
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error ?? {};
    if (response.status === 401 && auth) {
      session.end();
      unauthorizedHandler();
    }
    throw new ApiError({
      status: response.status,
      code: error.code ?? `HTTP_${response.status}`,
      message: error.message,
      details: error.details,
      requestId: error.requestId,
    });
  }
  return data;
}
