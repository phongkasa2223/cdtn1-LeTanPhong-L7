import { describeError } from '../api/messages.js';

/**
 * Bọc mỗi màn hình để luôn xử lý đủ ba trạng thái:
 *   loading : khung xương giữ bố cục, người dùng biết hệ thống đang làm việc (không để màn hình trắng)
 *   empty   : nói rõ vì sao rỗng và đưa một hành động tiếp theo
 *   error   : chuyện gì, vì sao, làm gì tiếp, kèm nút Thử lại (và mã tra cứu nếu là lỗi hệ thống)
 * status = 'ready' thì hiển thị children.
 */
export default function DataState({
  status, error, onRetry, loadingText = 'Đang tải dữ liệu…', emptyTitle, emptyHint, emptyAction, children,
}) {
  if (status === 'loading') {
    return (
      <div className="state state-loading" role="status" aria-live="polite" aria-busy="true">
        <p>{loadingText}</p>
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton short" />
      </div>
    );
  }
  if (status === 'error') {
    const message = describeError(error);
    return (
      <div className="state state-error" role="alert">
        <h3>{message.what}</h3>
        <p>{message.why}</p>
        <p>{message.next}</p>
        {message.ref && <p className="ref">Mã tra cứu: <strong>{message.ref}</strong></p>}
        {onRetry && <button type="button" onClick={onRetry}>Thử lại</button>}
      </div>
    );
  }
  if (status === 'empty') {
    return (
      <div className="state state-empty">
        <h3>{emptyTitle}</h3>
        {emptyHint && <p>{emptyHint}</p>}
        {emptyAction}
      </div>
    );
  }
  return children;
}
