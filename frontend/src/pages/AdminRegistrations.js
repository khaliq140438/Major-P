import { useEffect, useState } from 'react';
import api from '../api';
import { CheckCircle, Check, X } from 'lucide-react';

const AdminRegistrations = () => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null); // userId being processed

  useEffect(() => { loadPending(); }, []);

  const loadPending = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/registrations/pending');
      setPending(res.data || []);
    } catch (err) {
      console.error('Failed to load pending registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId, action) => {
    setProcessing(userId);
    try {
      const endpoint = action === 'approve'
        ? '/admin/registrations/approve'
        : '/admin/registrations/reject';

      await api.post(endpoint, { userId });

      // Remove from list immediately — no need to reload
      setPending(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} registration.`);
    } finally {
      setProcessing(null);
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
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0d1117', margin: 0 }}>
            Pending Registrations
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#57606a', margin: '0.25rem 0 0' }}>
            Review business credentials and approve or reject registrations.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            background: '#fff8c5', color: '#7d4e00',
            padding: '0.375rem 0.75rem', borderRadius: '999px',
            fontSize: '0.8125rem', fontWeight: 600
          }}>
            {pending.length} pending
          </span>
          <button className="btn-secondary" onClick={loadPending}
            style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Empty State ── */}
      {pending.length === 0 ? (
        <div className="business-card">
          <div className="business-card-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
              <CheckCircle size={40} color="#16a34a" />
            </div>
            <div style={{ fontWeight: 600, color: '#0d1117', marginBottom: '0.375rem' }}>
              All caught up!
            </div>
            <div style={{ fontSize: '0.875rem', color: '#57606a' }}>
              No pending registrations at the moment.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pending.map(user => (
            <div key={user.id} className="business-card">
              <div className="business-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>

                  {/* Left — Company details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0d1117', margin: 0 }}>
                        {user.company_name}
                      </h3>
                      <span style={{
                        background: '#fff8c5', color: '#7d4e00',
                        padding: '0.125rem 0.5rem', borderRadius: '999px',
                        fontSize: '0.6875rem', fontWeight: 600
                      }}>
                        Pending
                      </span>
                    </div>

                    {/* Credentials grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      {[
                        { label: 'Email',    value: user.email     },
                        { label: 'Phone',    value: user.phone     },
                        { label: 'GST No.',  value: user.gst_number },
                        { label: 'CIN No.',  value: user.cin_number },
                        { label: 'Industry', value: user.industry   },
                        { label: 'Location', value: user.location   }
                      ].map(({ label, value }) => value ? (
                        <div key={label}>
                          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#57606a', textTransform: 'uppercase', marginBottom: '0.125rem' }}>
                            {label}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#0d1117', fontFamily: label.includes('No.') ? 'monospace' : 'inherit' }}>
                            {value}
                          </div>
                        </div>
                      ) : null)}
                    </div>

                    {user.company_description && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: '#57606a', lineHeight: 1.5 }}>
                        {user.company_description}
                      </div>
                    )}

                    <div style={{ fontSize: '0.75rem', color: '#8c959f', marginTop: '0.75rem' }}>
                      Registered: {new Date(user.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Right — Action buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '120px' }}>
                    <button
                      className="btn-success"
                      onClick={() => handleAction(user.id, 'approve')}
                      disabled={processing === user.id}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                    >
                      {processing === user.id ? '...' : <><Check size={16} /> Approve</>}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleAction(user.id, 'reject')}
                      disabled={processing === user.id}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: '#cf1322', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                    >
                      {processing === user.id ? '...' : <><X size={16} /> Reject</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminRegistrations;