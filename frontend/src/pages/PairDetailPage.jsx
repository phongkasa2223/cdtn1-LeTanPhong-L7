import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { decidePair, getPair } from '../api/pairs.api.js';
import { session } from '../api/client.js';
import DataState from '../components/DataState.jsx';
import { useAsync } from '../hooks/useAsync.js';
import {
  FIELD_LABELS, MATCH_LABELS, SOURCE_LABELS, STATUS_LABELS, formatPercent, orDash,
} from '../labels.js';

// Lỗi mà bấm Thử lại không giúp gì: đưa người dùng về danh sách.
const NOT_RETRYABLE = ['PAIR_ALREADY_DECIDED', 'PAIR_NOT_FOUND', 'CUSTOMER_MERGED', 'FIELD_CHOICE_REQUIRED', 'KEEP_ID_REQUIRED'];

function DecisionResult({ data }) {
  return (
    <div className="card result" aria-live="polite">
      {data.status === 'MERGED' ? (
        <h2>Đã gộp: giữ {data.survivingCustomerId}, {data.mergedCustomerId} đánh dấu “đã gộp vào”</h2>
      ) : (
        <h2>Đã giữ riêng hai hồ sơ</h2>
      )}
      <p>Quyết định bởi {data.decidedBy}. Hồ sơ không bị xóa, lịch sử được giữ nguyên.</p>
      <div className="actions">
        <Link className="button" to="/pairs">Duyệt cặp tiếp theo</Link>
      </div>
    </div>
  );
}

/** MH3 – Chi tiết một cặp: hai hồ sơ cạnh nhau, tô trường khác nhau, chọn Gộp hoặc Giữ riêng (UC5, bước 3–7). */
export default function PairDetailPage() {
  const { pairId } = useParams();
  const canDecide = session.user()?.role === 'DATA_STAFF';
  const pair = useAsync(() => getPair(pairId), [pairId]);
  const [keep, setKeep] = useState('');
  const [choices, setChoices] = useState({});
  const [decision, setDecision] = useState({ status: 'idle', data: null, error: null, action: null });

  async function decide(action) {
    setDecision({ status: 'loading', data: null, error: null, action });
    try {
      const body = action === 'MERGE'
        ? { action, keepCustomerId: keep, fieldChoices: choices }
        : { action };
      setDecision({ status: 'ready', data: await decidePair(pairId, body), error: null, action });
    } catch (error) {
      setDecision({ status: 'error', data: null, error, action });
    }
  }

  const data = pair.data;
  return (
    <section>
      <p className="crumb"><Link to="/pairs">← Danh sách cặp nghi trùng</Link></p>
      <h1>Cặp {pairId}</h1>
      <DataState status={pair.status} error={pair.error} onRetry={pair.reload} loadingText="Đang tải chi tiết cặp…">
        {data && (
          <>
            <p className="lead">
              {MATCH_LABELS[data.matchedBy]} · giống nhau {formatPercent(data.similarity)} · trạng thái <strong>{STATUS_LABELS[data.status]}</strong>
            </p>
            <div className="table-wrap">
              <table className="compare">
                <caption className="sr-only">So sánh hai hồ sơ</caption>
                <thead>
                  <tr>
                    <th scope="col">Trường</th>
                    <th scope="col">Hồ sơ A · {data.customerA.customerId}</th>
                    <th scope="col">Hồ sơ B · {data.customerB.customerId}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(FIELD_LABELS).map(([field, label]) => {
                    const differs = data.differentFields.includes(field);
                    const pickable = differs && canDecide && data.status === 'PENDING' && decision.status !== 'ready';
                    return (
                      <tr key={field} className={differs ? 'differs' : ''}>
                        <th scope="row">{label}{differs && <span className="tag">khác nhau</span>}</th>
                        {[data.customerA, data.customerB].map((customer) => (
                          <td key={customer.customerId}>
                            {pickable ? (
                              <label className="pick">
                                <input
                                  type="radio"
                                  name={field}
                                  checked={choices[field] === customer.customerId}
                                  onChange={() => setChoices({ ...choices, [field]: customer.customerId })}
                                />
                                <span>{orDash(customer[field])}</span>
                              </label>
                            ) : orDash(customer[field])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  <tr>
                    <th scope="row">Nguồn</th>
                    <td>{orDash(SOURCE_LABELS[data.customerA.source])}</td>
                    <td>{orDash(SOURCE_LABELS[data.customerB.source])}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {data.status !== 'PENDING' && decision.status !== 'ready' && (
              <p className="notice">Cặp này đã {STATUS_LABELS[data.status].toLowerCase()}, không thể quyết định lại.</p>
            )}
            {!canDecide && data.status === 'PENDING' && (
              <p className="notice">Chỉ Nhân viên dữ liệu được duyệt cặp. Tài khoản của bạn chỉ xem được.</p>
            )}

            {canDecide && data.status === 'PENDING' && decision.status !== 'ready' && (
              <div className="card decide">
                <fieldset>
                  <legend>Hồ sơ giữ lại</legend>
                  {[data.customerA, data.customerB].map((customer) => (
                    <label key={customer.customerId} className="pick">
                      <input type="radio" name="keep" checked={keep === customer.customerId} onChange={() => setKeep(customer.customerId)} />
                      <span>{customer.customerId} · {customer.fullName}</span>
                    </label>
                  ))}
                </fieldset>
                <p className="hint">
                  Với mỗi trường khác nhau, chọn giá trị muốn giữ trong bảng trên. Trường còn trống của hồ sơ giữ lại sẽ được bổ sung từ hồ sơ kia.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    disabled={!keep || !data.differentFields.every((field) => choices[field]) || decision.status === 'loading'}
                    onClick={() => decide('MERGE')}
                  >
                    Gộp
                  </button>
                  <button type="button" className="secondary" disabled={decision.status === 'loading'} onClick={() => decide('KEEP_SEPARATE')}>
                    Giữ riêng
                  </button>
                </div>
              </div>
            )}

            {decision.status !== 'idle' && (
              <DataState
                status={decision.status}
                error={decision.error}
                onRetry={decision.error && !NOT_RETRYABLE.includes(decision.error.code) ? () => decide(decision.action) : undefined}
                loadingText="Đang ghi quyết định…"
              >
                <DecisionResult data={decision.data} />
              </DataState>
            )}
            {decision.status === 'error' && NOT_RETRYABLE.includes(decision.error.code) && (
              <p><Link className="button" to="/pairs">Về danh sách</Link></p>
            )}
          </>
        )}
      </DataState>
    </section>
  );
}
