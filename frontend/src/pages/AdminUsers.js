import { useEffect, useState } from 'react';
import api from '../api';

const AdminUsers = () => {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users/all');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (userId) => {
    if (!window.confirm("Are you sure you want to suspend this user? They will lose all login access.")) return;
    try {
      await api.post('/admin/users/suspend', { userId });
      loadUsers();
    } catch (err) {
      alert("Failed to suspend user: " + (err.response?.data?.message || err.message));
    }
  };

  const handleUnsuspend = async (userId) => {
    if (!window.confirm("Restore this user's platform access?")) return;
    try {
      await api.post('/admin/users/unsuspend', { userId });
      loadUsers();
    } catch (err) {
      alert("Failed to restore user: " + (err.response?.data?.message || err.message));
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm("CRITICAL WARNING: Are you sure you want to PERMANENTLY delete this user? All their profile data, connections, and analytics will be irrevocably destroyed.")) return;
    if (!window.confirm("FINAL CONFIRMATION: This action CANNOT be undone.")) return;
    
    try {
      await api.delete('/admin/users/remove', { data: { userId } });
      loadUsers();
    } catch (err) {
      alert("Failed to permanently delete user: " + (err.response?.data?.message || err.message));
    }
  };

  const filteredUsers = users.filter(u =>
    u.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const approved = users.filter(u => u.account_status === 'approved').length;
  const pending  = users.filter(u => u.account_status === 'pending').length;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div className="loading-spinner"></div>
    </div>
  );

  return (
    <div>
      {/* Stats */}
      <div className="business-grid business-grid-3" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Businesses', value: users.length,  color: '#2563eb' },
          { label: 'Approved',         value: approved,      color: '#16a34a' },
          { label: 'Pending',          value: pending,       color: '#ca8a04' }
        ].map(({ label, value, color }) => (
          <div key={label} className="business-card">
            <div className="business-card-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color, marginBottom: '0.25rem' }}>
                {value}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#57606a', fontWeight: 500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="business-card">
        <div className="business-card-header">
          <h2 className="business-card-title">All Users</h2>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              style={{
                padding: '0.5rem 0.875rem',
                border: '1px solid #d0d7de',
                borderRadius: '6px',
                fontSize: '0.875rem',
                outline: 'none',
                width: '220px'
              }}
            />
            <button className="btn-secondary" onClick={loadUsers}
              style={{ fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}>
              Refresh
            </button>
          </div>
        </div>
        <div className="business-card-body" style={{ padding: 0 }}>
          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#57606a', fontSize: '0.875rem' }}>
              No users found
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f6f8fa', borderBottom: '1px solid #eaeef2' }}>
                    {['ID', 'Company', 'Email', 'Industry', 'Location', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '0.75rem 1.25rem', textAlign: 'left',
                        fontSize: '0.75rem', fontWeight: 600,
                        color: '#57606a', textTransform: 'uppercase', letterSpacing: '0.5px'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #eaeef2' }}>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8125rem', color: '#57606a', fontFamily: 'monospace' }}>
                        #{user.id}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, color: '#0d1117' }}>
                        {user.company_name}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: '#57606a' }}>
                        {user.email}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: '#57606a' }}>
                        {user.industry || 'N/A'}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: '#57606a' }}>
                        {user.location || 'N/A'}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span style={{
                          background: user.account_status === 'approved' ? '#dcfce7' : user.account_status === 'rejected' ? '#fee2e2' : user.account_status === 'suspended' ? '#f3e8ff' : '#fef9c3',
                          color:      user.account_status === 'approved' ? '#14532d' : user.account_status === 'rejected' ? '#7f1d1d' : user.account_status === 'suspended' ? '#6b21a8' : '#713f12',
                          padding: '0.25rem 0.625rem', borderRadius: '999px',
                          fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize'
                        }}>
                          {user.account_status}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8125rem', color: '#57606a' }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', display: 'flex', gap: '0.5rem' }}>
                        
                        {user.account_status === 'approved' && (
                          <button 
                            onClick={() => handleSuspend(user.id)}
                            style={{
                              background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
                              padding: '0.375rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem',
                              fontWeight: 600, cursor: 'pointer', transition: '0.2s'
                            }}>
                            Suspend
                          </button>
                        )}

                        {user.account_status === 'suspended' && (
                          <button 
                            onClick={() => handleUnsuspend(user.id)}
                            style={{
                              background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0',
                              padding: '0.375rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem',
                              fontWeight: 600, cursor: 'pointer', transition: '0.2s'
                            }}>
                            Unsuspend
                          </button>
                        )}

                        <button 
                          onClick={() => handleRemove(user.id)}
                          style={{
                            background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca',
                            padding: '0.375rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem',
                            fontWeight: 600, cursor: 'pointer', transition: '0.2s'
                          }}>
                          Remove
                        </button>
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

export default AdminUsers;