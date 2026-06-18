// src/App.jsx — routes + auth/role guards
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Venues from './pages/Venues.jsx';
import Bookings from './pages/Bookings.jsx';
import Events from './pages/Events.jsx';
import Tasks from './pages/Tasks.jsx';
import Budget from './pages/Budget.jsx';
import Vendors from './pages/Vendors.jsx';
import Sourcing from './pages/Sourcing.jsx';
import Invoices from './pages/Invoices.jsx';
import Guests from './pages/Guests.jsx';
import Invitations from './pages/Invitations.jsx';
import MyEvents from './pages/MyEvents.jsx';
import Feedback from './pages/Feedback.jsx';
import Reports from './pages/Reports.jsx';

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-wrap"><div className="muted">Loading…</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/venues" element={<Protected roles={['organizer', 'venue_owner']}><Venues /></Protected>} />
      <Route path="/bookings" element={<Protected roles={['organizer', 'venue_owner']}><Bookings /></Protected>} />
      <Route path="/events" element={<Protected roles={['organizer']}><Events /></Protected>} />
      <Route path="/tasks" element={<Protected roles={['organizer', 'staff']}><Tasks /></Protected>} />
      <Route path="/my-events" element={<Protected roles={['staff']}><MyEvents /></Protected>} />
      <Route path="/budget" element={<Protected roles={['organizer']}><Budget /></Protected>} />
      <Route path="/vendors" element={<Protected roles={['organizer']}><Vendors /></Protected>} />
      <Route path="/sourcing" element={<Protected roles={['organizer', 'vendor', 'staff']}><Sourcing /></Protected>} />
      <Route path="/invoices" element={<Protected roles={['organizer', 'vendor']}><Invoices /></Protected>} />
      <Route path="/guests" element={<Protected roles={['organizer', 'staff']}><Guests /></Protected>} />
      <Route path="/invitations" element={<Protected roles={['guest']}><Invitations /></Protected>} />
      <Route path="/feedback" element={<Protected roles={['organizer', 'guest']}><Feedback /></Protected>} />
      <Route path="/reports" element={<Protected roles={['organizer']}><Reports /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
