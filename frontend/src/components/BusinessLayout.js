import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useEffect, useState } from 'react';
import api from '../api';
import socket from '../Socket';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import './BusinessLayout.css';

const NAV_ITEMS = [
  { path: '/dashboard',   label: 'Dashboard',   title: 'Dashboard',   subtitle: 'Overview of your business activity' },
  { path: '/profile',     label: 'Profile',      title: 'Profile',     subtitle: 'Manage your business information' },
  { path: '/search',      label: 'Search',       title: 'Search',      subtitle: 'Find new business partners' },
  { path: '/connections', label: 'Connections',  title: 'Connections', subtitle: 'Your business network' },
  { path: '/messages',    label: 'Messages',     title: 'Messages',    subtitle: 'Your conversations' },
  { path: '/analytics',   label: 'Analytics',    title: 'Analytics',   subtitle: 'Your business insights and credibility' },
];

const BusinessLayout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);

  // ── Fetch unread notifications from DB on every page load ──
  // Handles offline case — missed notifications appear on next login
  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data && res.data.length > 0) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  // ── Mark a single notification as read ──
  const markAsRead = async (notification_id) => {
    try {
      await api.post('/notifications/read', { notification_id });
      setNotifications(prev => prev.filter(n => n.id !== notification_id));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  // ── Mark all notifications as read ──
  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read', { notification_id: 'all' });
      setNotifications([]);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // ── Load notifications once on mount ──
  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  // ── Socket listeners — handles online case ──
  // Works on every page since BusinessLayout wraps all pages
  useEffect(() => {
    const handleAccepted = (data) => {
      setNotifications(prev => [...prev, {
        id:      data.notification_id,
        type:    'connection_accepted',
        message: `${data.company_name} accepted your connection request.`
      }]);
    };

    const handleRejected = (data) => {
      setNotifications(prev => [...prev, {
        id:      data.notification_id,
        type:    'connection_rejected',
        message: `${data.company_name} declined your connection request.`
      }]);
    };

    // Register listeners regardless of connection state —
    // Socket.IO queues them and fires when connection is established
    socket.on('connection_accepted', handleAccepted);
    socket.on('connection_rejected', handleRejected);

    // If socket is already connected, join user room immediately
    // If not yet connected, wait for the connect event then join
    const joinRoom = () => {
      if (user?.id) {
        socket.emit('join_user', user.id);
      }
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.on('connect', joinRoom);
    }

    return () => {
      socket.off('connection_accepted', handleAccepted);
      socket.off('connection_rejected', handleRejected);
      socket.off('connect', joinRoom);
    };
  }, [user]);

  // ── Notification style helpers ──
  const notifColor = (type) => {
    if (type === 'connection_accepted') return { bg: '#dafbe1', color: '#1a7f37', border: '#16a34a' };
    if (type === 'connection_rejected') return { bg: '#ffebe9', color: '#cf1322', border: '#dc2626' };
    return { bg: '#dbeafe', color: '#1e3a8a', border: '#2563eb' };
  };

  const notifIcon = (type) => {
    if (type === 'connection_accepted') return <CheckCircle2 size={24} color="#16a34a" />;
    if (type === 'connection_rejected') return <XCircle size={24} color="#dc2626" />;
    return <Info size={24} color="#2563eb" />;
  };

  // Match current route — also handles /profile/:userId
  const isPublicProfile = location.pathname.startsWith('/profile/') && location.pathname !== '/profile';
  const current = isPublicProfile
    ? { title: 'Business Profile', subtitle: 'Viewing business details and analytics' }
    : NAV_ITEMS.find(n => location.pathname === n.path) || {};

  return (
    <div className="business-shell">

      {/* ── Notification Popups ── */}
      {/* Fixed position — shows on top of any page */}
      {notifications.length > 0 && (
        <div style={{
          position:      'fixed',
          top:           '1.5rem',
          right:         '1.5rem',
          zIndex:        9999,
          display:       'flex',
          flexDirection: 'column',
          gap:           '0.75rem',
          width:         '320px'
        }}>
          {notifications.map((notif, index) => {
            const colors = notifColor(notif.type);
            return (
              <div key={notif.id || index} style={{
                background:    colors.bg,
                border:        `1px solid ${colors.border}`,
                borderRadius:  '12px',
                padding:       '1.125rem 1.25rem',
                display:       'flex',
                alignItems:    'flex-start',
                gap:           '0.75rem',
                boxShadow:     '0 8px 24px rgba(0,0,0,0.15)',
                animation:     'slideIn 0.3s ease'
              }}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '0.125rem' }}>
                  {notifIcon(notif.type)}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize:   '0.9375rem',
                    fontWeight: 600,
                    color:      colors.color,
                    lineHeight: 1.5,
                    marginBottom: '0.25rem'
                  }}>
                    {notif.message}
                  </div>
                  <div style={{
                    fontSize: '0.8125rem',
                    color:    colors.color,
                    opacity:  0.75
                  }}>
                    {notif.type === 'connection_accepted' ? 'You are now connected!' : 'You can send them a new request later.'}
                  </div>
                </div>
                <button
                  onClick={() => markAsRead(notif.id)}
                  style={{
                    background: 'transparent',
                    border:     'none',
                    cursor:     'pointer',
                    color:      colors.color,
                    fontSize:   '1.25rem',
                    lineHeight: 1,
                    padding:    '0',
                    flexShrink: 0,
                    opacity:    0.6
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}

          {notifications.length > 1 && (
            <button
              onClick={markAllAsRead}
              style={{
                background:   'white',
                border:       '1px solid #e2e8f0',
                borderRadius: '8px',
                padding:      '0.625rem',
                fontSize:     '0.875rem',
                color:        '#64748b',
                cursor:       'pointer',
                fontWeight:   500,
                textAlign:    'center',
                boxShadow:    '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              Dismiss all
            </button>
          )}
        </div>
      )}

      {/* ── Slide-in animation ── */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>

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