import { useEffect, useState } from 'react';
import api from '../api';

const AdminDashboard = () => {
  const [stats,        setStats]        = useState(null);
  const [recentUsers,  setRecentUsers]  = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, recentRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users/recent')
      ]);
      setStats(statsRes.data.stats || {});
      setRecentUsers(recentRes.data || []);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* ── KPI Cards ── */}
      <div className="business-grid business-grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { icon: '🏢', value: stats?.approved_businesses  || 0, label: 'Approved Businesses', color: '#1a7f37' },
          { icon: '⏳', value: stats?.pending_registrations || 0, label: 'Pending Approvals',   color: '#bf8700' },
          { icon: '🔗', value: stats?.total_connections     || 0, label: 'Total Connections',   color: '#8250df' },
          { icon: '👥', value: stats?.total_businesses      || 0, label: 'Total Registered',    color: '#0969da' }
        ].map(({ icon, value, label, color }) => (
          <div key={label} className="business-card">
            <div className="business-card-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color, marginBottom: '0.25rem' }}>{value}</div>
              <div style={{ fontSize: '0.8125rem', color: '#57606a', fontWeight: 500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pending Alert ── */}
      {stats?.pending_registrations > 0 && (
        <div style={{
          background: '#fff8c5', border: '1px solid #d4a72c',
          borderRadius: '6px', padding: '1rem 1.25rem',
          marginBottom: '1.5rem', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontWeight: 600, color: '#7d4e00', fontSize: '0.875rem' }}>
              {stats.pending_registrations} registration{stats.pending_registrations > 1 ? 's' : ''} waiting for approval
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#9a6700', marginTop: '0.25rem' }}>
              Go to Registrations page to review and approve.
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Registrations Table ── */}
      <div className="business-card">
        <div className="business-card-header">
          <h2 className="business-card-title">Recently Registered</h2>
          <button className="btn-secondary" onClick={loadData}
            style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}>
            Refresh
          </button>
        </div>
        <div className="business-card-body" style={{ padding: 0 }}>
          {recentUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#57606a', fontSize: '0.875rem' }}>
              No users registered yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f6f8fa', borderBottom: '1px solid #eaeef2' }}>
                    {['Company', 'Industry', 'Location', 'Status', 'Joined'].map(h => (
                      <th key={h} style={{
                        padding: '0.75rem 1.5rem', textAlign: 'left',
                        fontSize: '0.75rem', fontWeight: 600,
                        color: '#57606a', textTransform: 'uppercase'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #eaeef2' }}>
                      <td style={{ padding: '0.875rem 1.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#0d1117' }}>
                        {user.company_name}
                      </td>
                      <td style={{ padding: '0.875rem 1.5rem', fontSize: '0.875rem', color: '#57606a' }}>
                        {user.industry || 'N/A'}
                      </td>
                      <td style={{ padding: '0.875rem 1.5rem', fontSize: '0.875rem', color: '#57606a' }}>
                        {user.location || 'N/A'}
                      </td>
                      <td style={{ padding: '0.875rem 1.5rem' }}>
                        <span style={{
                          background: user.account_status === 'approved' ? '#dafbe1' : user.account_status === 'rejected' ? '#ffebe9' : '#fff8c5',
                          color:      user.account_status === 'approved' ? '#1a7f37' : user.account_status === 'rejected' ? '#cf1322' : '#7d4e00',
                          padding: '0.25rem 0.625rem', borderRadius: '999px',
                          fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize'
                        }}>
                          {user.account_status}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1.5rem', fontSize: '0.8125rem', color: '#57606a' }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;