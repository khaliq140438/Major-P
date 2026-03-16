import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import './AdminLayout.css';

const NAV_ITEMS = [
  { path: '/admin/dashboard',       label: 'Dashboard',      title: 'Dashboard',         subtitle: 'Platform overview and statistics' },
  { path: '/admin/registrations',   label: 'Registrations',  title: 'Registrations',     subtitle: 'Review and approve pending businesses' },
  { path: '/admin/users',           label: 'All Users',      title: 'User Management',   subtitle: 'View and manage all users' },
];

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const current = NAV_ITEMS.find(n => location.pathname === n.path) || {};

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div className="admin-sidebar-logo-text">
            <div className="admin-sidebar-logo-title">Business Connect</div>
            <span className="admin-badge">Admin</span>
          </div>
        </div>

        <ul className="admin-sidebar-nav">
          {NAV_ITEMS.map(({ path, label }) => (
            <li key={path}>
              <Link
                to={path}
                className={`admin-sidebar-link${location.pathname === path ? ' admin-sidebar-link-active' : ''}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {user && (
          <div className="admin-sidebar-footer">
            <div className="admin-sidebar-footer-main">
              <div className="admin-sidebar-footer-name">{user.company_name || 'Admin'}</div>
              <div className="admin-sidebar-footer-role">Administrator</div>
            </div>
            <button
              type="button"
              className="admin-sidebar-logout-btn"
              onClick={() => { logout(); window.location.href = '/login'; }}
            >
              Sign out
            </button>
          </div>
        )}
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-content">
            <div className="admin-header-left">
              <h1 className="admin-header-title">{current.title}</h1>
              <p className="admin-header-subtitle">{current.subtitle}</p>
            </div>
          </div>
        </header>
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;