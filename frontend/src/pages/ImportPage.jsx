import { useState } from 'react';
import { Link } from 'react-router-dom';
import { uploadImport } from '../api/imports.api.js';
import { session } from '../api/client.js';
import DataState from '../components/DataState.jsx';
import {
  RULE_LABELS, SOURCE_LABELS, formatDateTime, formatNumber,
} from '../labels.js';

function Tile({ label, value, tone }) {
  return (
    <div className={`tile ${tone ?? ''}`}>
      <strong>{formatNumber(value)}</strong>
      <span>{label}</span>
    </div>
  );
}

/** Kết quả một lần nhập: con số, lỗi theo mã quy tắc, và lối đi tiếp (xem lỗi, duyệt cặp). */
function ImportResult({ data }) {
  const codes = Object.entries(data.errorsByCode).filter(([, count]) => count > 0);
  return (
    <div className="card result" aria-live="polite">
      <h2>Đã nhập lần {data.importId}</h2>
      <div className="tiles">
        <Tile label="Tổng bản ghi" value={data.totalRecords} />
        <Tile label="Hợp lệ" value={data.validRecords} tone="good" />
        <Tile label="Có lỗi" value={data.errorRecords} tone={data.errorRecords ? 'bad' : ''} />
        <Tile label="Hồ sơ mới tạo" value={data.newCustomers} />
        <Tile label="Gắn vào hồ sơ có sẵn" value={data.attachedRecords} />
        <Tile label="Cặp nghi trùng mới" value={data.newDuplicatePairs} tone={data.newDuplicatePairs ? 'warn' : ''} />
      </div>
      {codes.length > 0 && (
        <ul className="chips" aria-label="Lỗi theo mã quy tắc">
          {codes.map(([code, count]) => (
            <li key={code}>
              <Link to={`/imports/errors?importId=${data.importId}&code=${code}`}>
                {RULE_LABELS[code]} <strong>{formatNumber(count)}</strong>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="actions">
        <Link className="button" to={`/imports/errors?importId=${data.importId}`}>
          Xem bản ghi lỗi ({formatNumber(data.errorRecords)})
        </Link>
        <Link className="button secondary" to="/pairs">
          Duyệt cặp nghi trùng ({formatNumber(data.newDuplicatePairs)} mới)
        </Link>
      </div>
      <p className="source">
        Nguồn {SOURCE_LABELS[data.source]} · file {data.fileName} · nhập bởi {data.importedBy} lúc {formatDateTime(data.importedAt)}
      </p>
    </div>
  );
}

/** MH1 – Nhập file khách hàng (UC1). */
export default function ImportPage() {
  const isStaff = session.user()?.role === 'DATA_STAFF';
  const [source, setSource] = useState('RETAIL');
  const [file, setFile] = useState(null);
  const [state, setState] = useState({ status: 'idle', data: null, error: null });

  async function submit(event) {
    event?.preventDefault();
    if (!file) return;
    setState({ status: 'loading', data: null, error: null });
    try {
      setState({ status: 'ready', data: await uploadImport(file, source), error: null });
    } catch (error) {
      setState({ status: 'error', data: null, error });
    }
  }

  return (
    <section>
      <h1>Nhập file khách hàng</h1>
      <p className="lead">
        Chọn file CSV xuất từ hệ thống bán lẻ hoặc bảo hành. Mỗi dòng được chuẩn hóa và kiểm tra; dòng lỗi không làm hỏng cả file.
      </p>
      {!isStaff && <p className="notice">Chỉ Nhân viên dữ liệu được nhập file. Tài khoản của bạn chỉ xem được kết quả.</p>}
      <form className="card form" onSubmit={submit}>
        <label>
          Nguồn dữ liệu
          <select value={source} onChange={(e) => setSource(e.target.value)} disabled={!isStaff}>
            <option value="RETAIL">{SOURCE_LABELS.RETAIL}</option>
            <option value="WARRANTY">{SOURCE_LABELS.WARRANTY}</option>
          </select>
        </label>
        <label>
          File CSV
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={!isStaff}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <small>Tối đa 5 MB. Cột: ho_ten, so_dien_thoai, email, dia_chi, ngay_sinh, ngay_tao.</small>
        </label>
        <button type="submit" disabled={!isStaff || !file || state.status === 'loading'}>Nhập file</button>
      </form>
      {state.status !== 'idle' && (
        <DataState status={state.status} error={state.error} onRetry={submit} loadingText="Đang nhập và kiểm tra file…">
          <ImportResult data={state.data} />
        </DataState>
      )}
    </section>
  );
}
