import { Link, useSearchParams } from 'react-router-dom';
import { listPairs } from '../api/pairs.api.js';
import DataState from '../components/DataState.jsx';
import { useAsync } from '../hooks/useAsync.js';
import {
  MATCH_LABELS, SOURCE_LABELS, STATUS_LABELS, formatNumber, formatPercent, orDash,
} from '../labels.js';

const PAGE_SIZE = 20;

function Person({ customer }) {
  return (
    <>
      <strong>{customer.fullName}</strong>
      <span className="sub">{customer.customerId} · {customer.phone} · {orDash(SOURCE_LABELS[customer.source])}</span>
    </>
  );
}

/** Danh sách cặp hồ sơ nghi trùng, điểm tương đồng cao trước (UC5, bước 1–2). */
export default function PairsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'PENDING';
  const page = Number(params.get('page') ?? 1) || 1;

  function update(changes) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next);
  }

  const pairs = useAsync(() => listPairs({ status, page, size: PAGE_SIZE }), [status, page]);
  const data = pairs.data;
  let view = pairs.status;
  if (pairs.status === 'ready' && data.items.length === 0) view = 'empty';
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <section>
      <h1>Cặp hồ sơ nghi trùng</h1>
      <p className="lead">Hai hồ sơ khác số điện thoại nhưng cùng email, hoặc cùng họ tên và ngày sinh. Hệ thống không tự gộp: cần nhân viên duyệt.</p>
      <div className="toolbar">
        <label>
          Trạng thái
          <select value={status} onChange={(e) => update({ status: e.target.value === 'PENDING' ? '' : e.target.value, page: '' })}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <DataState
        status={view}
        error={pairs.error}
        onRetry={pairs.reload}
        loadingText="Đang tải cặp nghi trùng…"
        emptyTitle={status === 'PENDING' ? 'Không có cặp nghi trùng cần duyệt' : `Chưa có cặp nào ở trạng thái “${STATUS_LABELS[status]}”`}
        emptyHint={status === 'PENDING' ? 'Nhập thêm file khách hàng để hệ thống tìm cặp mới.' : 'Chọn trạng thái khác để xem.'}
        emptyAction={status !== 'PENDING' && <button type="button" onClick={() => update({ status: '', page: '' })}>Xem cặp chờ duyệt</button>}
      >
        {data && (
          <>
            <div className="table-wrap">
              <table>
                <caption className="sr-only">Cặp hồ sơ nghi trùng</caption>
                <thead>
                  <tr>
                    <th scope="col">Cặp</th>
                    <th scope="col">Khớp theo</th>
                    <th scope="col">Giống nhau</th>
                    <th scope="col">Hồ sơ A</th>
                    <th scope="col">Hồ sơ B</th>
                    <th scope="col"><span className="sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((pair) => (
                    <tr key={pair.pairId}>
                      <td className="mono">{pair.pairId}</td>
                      <td>{MATCH_LABELS[pair.matchedBy]}</td>
                      <td className="num">{formatPercent(pair.similarity)}</td>
                      <td><Person customer={pair.customerA} /></td>
                      <td><Person customer={pair.customerB} /></td>
                      <td><Link className="button small" to={`/pairs/${pair.pairId}`}>Xem chi tiết</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Trang trước</button>
              <span>Trang {page} / {totalPages} · {formatNumber(data.total)} cặp</span>
              <button type="button" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>Trang sau</button>
            </div>
          </>
        )}
      </DataState>
    </section>
  );
}
