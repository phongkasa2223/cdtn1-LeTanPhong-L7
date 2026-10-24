import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth.api.js';
import DataState from '../components/DataState.jsx';

/** Đăng nhập (E1). Sai mật khẩu hiện thông báo ba phần; mất kết nối có nút Thử lại. */
export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState({ status: 'idle', error: null });

  async function submit(event) {
    event?.preventDefault();
    setState({ status: 'loading', error: null });
    try {
      const user = await login(username.trim(), password);
      navigate(user.role === 'DATA_MANAGER' ? '/imports/errors' : '/imports/new', { replace: true });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <h1>Đăng nhập</h1>
        <p className="lead">Ứng dụng kiểm tra và hợp nhất hồ sơ khách hàng – Mekong Mobile</p>
        <label>
          Tên đăng nhập
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" disabled={state.status === 'loading'}>Đăng nhập</button>
        {state.status !== 'idle' && (
          <DataState status={state.status} error={state.error} onRetry={submit} loadingText="Đang đăng nhập…">{null}</DataState>
        )}
      </form>
    </div>
  );
}
