import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { onUnauthorized, session } from './api/client.js';
import Layout from './components/Layout.jsx';
import ErrorsPage from './pages/ErrorsPage.jsx';
import ImportPage from './pages/ImportPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import PairDetailPage from './pages/PairDetailPage.jsx';
import PairsPage from './pages/PairsPage.jsx';

/** Chưa đăng nhập thì về trang đăng nhập. */
function RequireAuth({ children }) {
  return session.token() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const navigate = useNavigate();

  // Nhận 401 từ bất kỳ API nào: client đã xóa phiên, ở đây đưa người dùng về trang đăng nhập.
  useEffect(() => onUnauthorized(() => navigate('/login', { replace: true })), [navigate]);

  const home = session.user()?.role === 'DATA_MANAGER' ? '/imports/errors' : '/imports/new';
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={<Navigate to={home} replace />} />
        <Route path="/imports/new" element={<ImportPage />} />
        <Route path="/imports/errors" element={<ErrorsPage />} />
        <Route path="/pairs" element={<PairsPage />} />
        <Route path="/pairs/:pairId" element={<PairDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
