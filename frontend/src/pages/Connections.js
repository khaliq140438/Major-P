import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const avatarColor = (id) => {
  const colors = ['#2563eb','#16a34a','#7c3aed','#ca8a04','#dc2626','#0891b2'];
  return colors[(id || 0) % colors.length];
};

const BusinessAvatar = ({ name, logo, id, size = 44 }) => (
  <div style={{
    width: size, height: size, borderRadius: '10px', flexShrink: 0,
    background: logo ? 'transparent' : avatarColor(id),
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontSize: size * 0.35, fontWeight: 700,
    overflow: 'hidden', border: '1px solid #e2e8f0'
  }}>
    {logo
      ? <img src={logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      : name?.charAt(0).toUpperCase()
    }
  </div>
);

const Connections = () => {
  const [connections,     setConnections]     = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [connRes, pendingRes] = await Promise.all([
        api.get('/connections'),
        api.get('/connections/pending')
      ]);
      setConnections(connRes.data || []);
      setPendingRequests(pendingRes.data || []);
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      await api.post('/connections/accept', { connection_id: id });
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept connection.');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.post('/connections/reject', { connection_id: id });
      setPendingRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject connection.');
    }
  };

  const handleMessage = (receiverId) => {
    navigate('/messages', { state: { openUserId: receiverId } });
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div className="loading-spinner"></div>
    </div>
  );

  return (
    <div className="business-grid business-grid-2">

      {/* ── Active Connections ── */}
      <div className="business-card">
        <div className="business-card-header">
          <h2 className="business-card-title">Active Connections</h2>
          <span style={{
            background: '#dbeafe', color: '#1e3a8a',
            padding: '0.25rem 0.625rem', borderRadius: '999px',
            fontSize: '0.75rem', fontWeight: 600
          }}>
            {connections.length}
          </span>
        </div>
        <div className="business-card-body">
          {connections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔗</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.375rem' }}>
                No connections yet
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
                Start searching for businesses to connect with
              </div>
              <button className="btn-primary" onClick={() => navigate('/search')}
                style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}>
                Find Businesses
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {connections.map(conn => (
                <div
                  key={conn.connection_id}
                  onClick={() => navigate(`/profile/${conn.connected_user_id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    padding: '0.875rem', background: '#f8fafc',
                    borderRadius: '10px', border: '1px solid #e2e8f0',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <BusinessAvatar
                    name={conn.company_name}
                    logo={conn.logo}
                    id={conn.connected_user_id}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9375rem', marginBottom: '0.125rem' }}>
                      {conn.company_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {[conn.industry, conn.location].filter(Boolean).join(' · ') || 'No details yet'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      className="btn-primary"
                      onClick={(e) => { e.stopPropagation(); handleMessage(conn.connected_user_id); }}
                      style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
                    >
                      💬
                    </button>
                    <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 500 }}>
                      View →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Pending Requests ── */}
      <div className="business-card">
        <div className="business-card-header">
          <h2 className="business-card-title">Pending Requests</h2>
          <span style={{
            background: pendingRequests.length > 0 ? '#fef9c3' : '#f6f8fa',
            color:      pendingRequests.length > 0 ? '#713f12' : '#64748b',
            padding: '0.25rem 0.625rem', borderRadius: '999px',
            fontSize: '0.75rem', fontWeight: 600
          }}>
            {pendingRequests.length}
          </span>
        </div>
        <div className="business-card-body">
          {pendingRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✅</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.375rem' }}>
                All caught up!
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                No pending connection requests
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {pendingRequests.map(req => (
                <div key={req.id} style={{
                  padding: '1rem', background: '#f8fafc',
                  borderRadius: '10px', border: '1px solid #e2e8f0'
                }}>
                  {/* Business info */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.875rem', cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${req.sender_id || req.user_id}`)}
                  >
                    <BusinessAvatar
                      name={req.company_name}
                      logo={req.logo}
                      id={req.sender_id || req.user_id}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9375rem', marginBottom: '0.125rem' }}>
                        {req.company_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {[req.industry, req.location].filter(Boolean).join(' · ') || 'Wants to connect with you'}
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="btn-success"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.8125rem' }}
                    >
                      ✓ Accept
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.8125rem', color: '#dc2626' }}
                    >
                      ✗ Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Connections;