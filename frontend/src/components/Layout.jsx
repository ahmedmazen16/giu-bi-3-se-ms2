// src/components/Layout.jsx — sidebar shell with role-aware navigation.
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

// Which nav items each role sees.
const NAV = {
  organizer: [
    ['/', 'Dashboard', '◆'],
    ['/events', 'Events', '✦'],
    ['/venues', 'Venues', '⌂'],
    ['/bookings', 'Bookings', '✉'],
    ['/tasks', 'Tasks', '✓'],
    ['/budget', 'Budget', '$'],
    ['/vendors', 'Vendors', '⚑'],
    ['/sourcing', 'Sourcing', '⇄'],
    ['/invoices', 'Invoices', '▤'],
    ['/guests', 'Guests', '☺'],
    ['/feedback', 'Feedback', '★'],
    ['/reports', 'Reports', '◷'],
  ],
  staff: [
    ['/', 'Dashboard', '◆'],
    ['/my-events', 'My Events', '✦'],
    ['/tasks', 'My Tasks', '✓'],
    ['/guests', 'Check-In', '☺'],
    ['/sourcing', 'Vendor Arrivals', '⇄'],
  ],
  vendor: [
    ['/', 'Dashboard', '◆'],
    ['/sourcing', 'Requests', '⇄'],
    ['/invoices', 'Invoices', '▤'],
  ],
  venue_owner: [
    ['/', 'Dashboard', '◆'],
    ['/venues', 'My Venues', '⌂'],
    ['/bookings', 'Requests', '✉'],
  ],
  guest: [
    ['/', 'Dashboard', '◆'],
    ['/invitations', 'Invitations', '✉'],
    ['/feedback', 'Feedback', '★'],
  ],
};

const ROLE_LABEL = {
  organizer: 'Event Organizer',
  staff: 'Team Member',
  vendor: 'Vendor',
  venue_owner: 'Venue Owner',
  guest: 'Guest',
};

const SIDEBAR_KEY = 'popeyez_sidebar_collapsed';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const items = NAV[user.role] || NAV.guest;

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapse() {
    setCollapsed((c) => {
      localStorage.setItem(SIDEBAR_KEY, c ? '0' : '1');
      return !c;
    });
  }

  const themeIcon = theme === 'dark' ? '☀' : '☾';
  const themeLabel = theme === 'dark' ? 'Light mode' : 'Dark mode';

  return (
    <div className={`app${collapsed ? ' collapsed' : ''}`}>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">☰</button>
        <div className="brand">Pop<span>Eyez</span></div>
        <button className="theme-toggle" onClick={toggle} aria-label="Toggle dark mode">{themeIcon}</button>
      </div>

      {mobileOpen && <div className="backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
        <button className="collapse-btn" onClick={toggleCollapse} aria-label="Collapse sidebar" title="Collapse / expand">
          {collapsed ? '»' : '«'}
        </button>
        <div className="brand">Pop<span>Eyez</span></div>
        <div className="brand-sub">Café Events</div>
        <nav className="nav">
          {items.map(([to, label, ico]) => (
            <NavLink key={to} to={to} end={to === '/'} title={label} onClick={() => setMobileOpen(false)}>
              <span className="ico">{ico}</span><span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="theme-row" onClick={toggle} title={themeLabel}>
            <span className="ico">{themeIcon}</span><span className="nav-label">{themeLabel}</span>
          </button>
          <div className="whoami">
            <b>{user.name}</b>
            <span className="role-chip">{ROLE_LABEL[user.role]}</span>
          </div>
          <button className="btn ghost small logout-btn" onClick={logout} title="Log out">
            <span className="ico">⎋</span><span className="nav-label">Log out</span>
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
