import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import './BusinessLayout.css';

const NAV_ITEMS = [
  { path: '/dashboard',   label: 'Dashboard',    title: 'Dashboard',   subtitle: 'Overview of your business activity' },
  { path: '/profile',     label: 'Profile',      title: 'Profile',     subtitle: 'Manage your business information' },
  { path: '/search',      label: 'Search',       title: 'Search',      subtitle: 'Find new business partners' },
  { path: '/connections', label: 'Connections',  title: 'Connections', subtitle: 'Your business network' },
  { path: '/messages',    label: 'Messages',     title: 'Messages',    subtitle: 'Your conversations' },
  { path: '/analytics',   label: 'Analytics',    title: 'Analytics',   subtitle: 'Your business insights and credibility' },
];

const BusinessLayout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  // Match current route — also handles /profile/:userId
  const isPublicProfile = location.pathname.startsWith('/profile/') && location.pathname !== '/profile';
  const current = isPublicProfile
    ? { title: 'Business Profile', subtitle: 'Viewing business details and analytics' }
    : NAV_ITEMS.find(n => location.pathname === n.path) || {};

  return (
    <div className="business-shell">
      <aside className="business-sidebar">
        <div className="business-sidebar-logo">
          <div className="business-sidebar-logo-text">
            <div className="business-sidebar-logo-title">Business Connect</div>
            <span className="business-badge">Portal</span>
          </div>
        </div>

        <ul className="business-sidebar-nav">
          {NAV_ITEMS.map(({ path, label }) => (
            <li key={path}>
              <Link
                to={path}
                className={`business-sidebar-link${
                  !isPublicProfile && location.pathname === path ? ' business-sidebar-link-active' : ''
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {user && (
          <div className="business-sidebar-footer">
            <div className="business-sidebar-footer-main">
              <div className="business-sidebar-footer-name">{user.company_name || 'Business'}</div>
              <div className="business-sidebar-footer-role">Business Account</div>
            </div>
            <button
              type="button"
              className="business-sidebar-logout-btn"
              onClick={() => { logout(); window.location.href = '/login'; }}
            >
              Sign out
            </button>
          </div>
        )}
      </aside>

      <main className="business-main">
        <header className="business-header">
          <div className="business-header-content">
            <div className="business-header-left">
              <h1 className="business-header-title">{current.title}</h1>
              <p className="business-header-subtitle">{current.subtitle}</p>
            </div>
          </div>
        </header>
        <div className="business-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default BusinessLayout;