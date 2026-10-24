import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout } from '../api/auth.api.js';
import { session } from '../api/client.js';
import { ROLE_LABELS } from '../labels.js';

/** Khung chung: thanh điều hướng, người đăng nhập, nút đăng xuất. */
export default function Layout() {
  const navigate = useNavigate();
  const user = session.user();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const link = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">DQ</span>
          <span>Chất lượng dữ liệu khách hàng</span>
        </div>
        <nav aria-label="Chức năng chính">
          {user?.role === 'DATA_STAFF' && <NavLink to="/imports/new" className={link}>Nhập file</NavLink>}
          <NavLink to="/imports/errors" className={link}>Bản ghi lỗi</NavLink>
          <NavLink to="/pairs" className={link}>Cặp nghi trùng</NavLink>
        </nav>
        <div className="who">
          <span>
            {user?.fullName}
            <small>{ROLE_LABELS[user?.role] ?? ''}</small>
          </span>
          <button type="button" className="ghost" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
