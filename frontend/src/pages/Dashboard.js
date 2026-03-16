import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Dashboard = () => {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [data,      setData]      = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (user && user.role === 'business') {
      Promise.all([
        api.get('/dashboard'),
        api.get('/profile/me')
      ]).then(([dashRes, profileRes]) => {
        setData(dashRes.data);
        setProfile(profileRes.data);
      }).catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const getProfileCompleteness = () => {
    if (!profile) return 0;
    const fields = ['company_name', 'industry', 'location', 'logo', 'company_description', 'website'];
    const filled = fields.filter(f => profile[f] && profile[f] !== '').length;
    return Math.round((filled / fields.length) * 100);
  };

  if (!user) return <div>Please log in.</div>;
  if (user.role === 'admin') return <div>Welcome, Admin!</div>;
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div className="loading-spinner"></div>
    </div>
  );
  if (!data || !profile) return (
    <div style={{ padding: '1rem', color: '#57606a' }}>Unable to load dashboard data.</div>
  );

  const completeness = getProfileCompleteness();

  return (
    <div>
      {/* ── KPI Cards ── */}
      <div className="business-grid business-grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Connections', value: data.total_connections,  color: '#2563eb' },
          { label: 'Pending Sent',      value: data.pending_sent,       color: '#ca8a04' },
          { label: 'Pending Received',  value: data.pending_received,   color: '#7c3aed' },
          { label: 'Unread Messages',   value: data.unread_messages || 0, color: '#0891b2' }
        ].map(({ label, value, color }) => (
          <div key={label} className="business-card">
            <div className="business-card-body" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#57606a', fontWeight: 500, marginBottom: '0.5rem' }}>
                {label}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color }}>
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Profile Completeness Alert ── */}
      {completeness < 100 && (
        <div style={{
          background: '#fefce8', border: '1px solid #fde047',
          borderRadius: '10px', padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
        }}>
          <div>
            <div style={{ fontWeight: 600, color: '#713f12', marginBottom: '0.25rem', fontSize: '0.9375rem' }}>
              Complete your profile — {completeness}% done
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#92400e' }}>
              A complete profile increases your credibility score and visibility to other businesses.
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate('/profile')}
            style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem', fontSize: '0.8125rem' }}
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="business-grid business-grid-2">

        {/* Company Profile Card */}
        <div className="business-card">
          <div className="business-card-header">
            <h2 className="business-card-title">Company Profile</h2>
            <button
              className="btn-secondary"
              onClick={() => navigate('/profile')}
              style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
            >
              Edit
            </button>
          </div>
          <div className="business-card-body">
            {/* Avatar + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '12px', flexShrink: 0,
                background: profile.logo ? 'transparent' : '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '1.375rem', fontWeight: 700,
                overflow: 'hidden', border: '1px solid #e2e8f0'
              }}>
                {profile.logo
                  ? <img src={profile.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile.company_name?.charAt(0).toUpperCase()
                }
              </div>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                  {data.company_name}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  {profile.industry || 'Industry not set'} {profile.location ? `· ${profile.location}` : ''}
                </div>
              </div>
            </div>

            {/* Profile completeness bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                  PROFILE COMPLETENESS
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                  {completeness}%
                </span>
              </div>
              <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                <div style={{
                  width: `${completeness}%`,
                  height: '100%',
                  background: completeness === 100 ? '#16a34a' : '#2563eb',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* About snippet */}
            {profile.company_description && (
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, marginTop: '1rem', marginBottom: 0 }}>
                {profile.company_description.substring(0, 120)}
                {profile.company_description.length > 120 ? '...' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Network Summary */}
        <div className="business-card">
          <div className="business-card-header">
            <h2 className="business-card-title">Network Summary</h2>
            <button
              className="btn-secondary"
              onClick={() => navigate('/search')}
              style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
            >
              Find Businesses
            </button>
          </div>
          <div className="business-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'Active Connections', value: data.total_connections,  action: () => navigate('/connections'), actionLabel: 'View All' },
                { label: 'Requests Sent',      value: data.pending_sent,       action: null, actionLabel: null },
                { label: 'Requests Received',  value: data.pending_received,   action: () => navigate('/connections'), actionLabel: 'Review' },
                { label: 'Unread Messages',    value: data.unread_messages || 0, action: () => navigate('/messages'),   actionLabel: 'Open' }
              ].map(({ label, value, action, actionLabel }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem', background: '#f8fafc',
                  borderRadius: '8px', border: '1px solid #e2e8f0'
                }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.125rem' }}>{label}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{value}</div>
                  </div>
                  {action && value > 0 && (
                    <button
                      onClick={action}
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
                    >
                      {actionLabel}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;