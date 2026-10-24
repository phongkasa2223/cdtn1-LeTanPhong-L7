import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listErrors, listImports } from '../api/imports.api.js';
import { session } from '../api/client.js';
import DataState from '../components/DataState.jsx';
import { useAsync } from '../hooks/useAsync.js';
import {
  RULE_LABELS, SOURCE_LABELS, formatDateTime, formatNumber, orDash,
} from '../labels.js';

const PAGE_SIZE = 50;

/** MH2 – Danh sách bản ghi lỗi của một lần nhập, lọc theo mã quy tắc, phân trang (UC3). */
export default function ErrorsPage() {
  const [params, setParams] = useSearchParams();
  const importId = params.get('importId') ?? '';
  const code = params.get('code') ?? '';
  const page = Number(params.get('page') ?? 1) || 1;
  const isStaff = session.user()?.role === 'DATA_STAFF';

  /** Đổi tham số trên URL (giữ bộ lọc khi chia sẻ link); giá trị rỗng thì bỏ khỏi URL. */
  function update(changes, replace = false) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next, { replace });
  }

  const batches = useAsync(() => listImports({ size: 100 }), []);
  const errors = useAsync(
    () => (importId ? listErrors(importId, { code, page, size: PAGE_SIZE }) : Promise.resolve(null)),
    [importId, code, page],
  );

  // Chưa chọn lần nhập thì lấy lần mới nhất.
  useEffect(() => {
    if (!importId && batches.status === 'ready' && batches.data.items.length > 0) {
      update({ importId: batches.data.items[0].importId }, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importId, batches.status, batches.data]);

  const noBatches = batches.status === 'ready' && batches.data.items.length === 0;
  let outer = batches.status;
  if (noBatches) outer = 'empty';
  else if (batches.status === 'ready' && !importId) outer = 'loading';

  let inner = errors.status;
  if (errors.status === 'ready' && errors.data && errors.data.items.length === 0) inner = 'empty';

  const data = errors.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const selected = batches.data?.items.find((item) => item.importId === importId);

  return (
    <section>
      <h1>Bản ghi lỗi</h1>
      <p className="lead">Các bản ghi chưa vào danh sách khách hàng vì còn lỗi. Giá trị gốc được giữ nguyên để đối chiếu.</p>
      <DataState
        status={outer}
        error={batches.error}
        onRetry={batches.reload}
        emptyTitle="Chưa có lần nhập nào"
        emptyHint="Nhập một file khách hàng để hệ thống kiểm tra và liệt kê bản ghi lỗi."
        emptyAction={isStaff && <Link className="button" to="/imports/new">Nhập file</Link>}
      >
        <div className="toolbar">
          <label>
            Lần nhập
            <select value={importId} onChange={(e) => update({ importId: e.target.value, code: '', page: '' })}>
              {batches.data?.items.map((item) => (
                <option key={item.importId} value={item.importId}>
                  {item.importId} · {SOURCE_LABELS[item.source]} · {formatNumber(item.errorRecords)} lỗi
                </option>
              ))}
            </select>
          </label>
          <label>
            Loại lỗi
            <select value={code} onChange={(e) => update({ code: e.target.value, page: '' })}>
              <option value="">Tất cả loại lỗi</option>
              {Object.entries(RULE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <DataState
          status={inner}
          error={errors.error}
          onRetry={errors.reload}
          loadingText="Đang tải bản ghi lỗi…"
          emptyTitle={code ? `Không có bản ghi nào lỗi “${RULE_LABELS[code]}”` : 'Lần nhập này không có bản ghi lỗi'}
          emptyHint={code ? 'Bỏ bộ lọc để xem tất cả lỗi của lần nhập.' : 'Dữ liệu của lần nhập đã sạch, không cần sửa gì.'}
          emptyAction={code && <button type="button" onClick={() => update({ code: '', page: '' })}>Bỏ bộ lọc</button>}
        >
          {data && (
            <>
              <div className="table-wrap">
                <table>
                  <caption className="sr-only">Bản ghi lỗi của lần nhập {data.importId}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Dòng</th>
                      <th scope="col">Họ tên (gốc)</th>
                      <th scope="col">SĐT (gốc)</th>
                      <th scope="col">Email</th>
                      <th scope="col">Ngày tạo</th>
                      <th scope="col">Lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.recordId}>
                        <td className="num">{item.rowNumber}</td>
                        <td>{orDash(item.original.ho_ten)}</td>
                        <td className="mono">{orDash(item.original.so_dien_thoai)}</td>
                        <td>{orDash(item.original.email)}</td>
                        <td className="nowrap">{orDash(item.original.ngay_tao)}</td>
                        <td>
                          <ul className="error-list">
                            {item.errors.map((error) => (
                              <li key={`${error.code}-${error.field}`}>
                                <span className="tag">{RULE_LABELS[error.code]}</span> {error.message}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pager">
                <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Trang trước</button>
                <span>Trang {page} / {totalPages} · {formatNumber(data.total)} bản ghi lỗi</span>
                <button type="button" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>Trang sau</button>
              </div>
              {selected && (
                <p className="source">
                  Lần nhập {selected.importId} · {SOURCE_LABELS[selected.source]} · file {selected.fileName} · nhập bởi {selected.importedBy} lúc {formatDateTime(selected.importedAt)}. Chỉ hiển thị lỗi chưa khắc phục.
                </p>
              )}
            </>
          )}
        </DataState>
      </DataState>
    </section>
  );
}
