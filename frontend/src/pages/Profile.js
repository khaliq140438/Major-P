import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const scoreLabel = (score) => {
  if (score >= 80) return { label: 'Excellent', color: '#1a7f37', bg: '#dafbe1' };
  if (score >= 60) return { label: 'Strong',    color: '#0969da', bg: '#ddf4ff' };
  if (score >= 40) return { label: 'Moderate',  color: '#bf8700', bg: '#fff8c5' };
  return              { label: 'Building',   color: '#57606a', bg: '#f6f8fa' };
};

const Profile = () => {
  const { userId }          = useParams();
  const { user: authUser }  = useAuth();
  const navigate            = useNavigate();
  const isOwnProfile        = !userId;

  const [profile,   setProfile]   = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [editMode,  setEditMode]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState('');

  const handleSendMessage = async () => {
    try {
      // Create conversation by sending an empty opener — backend handles it
      // We use a zero-width space so the message exists but appears empty
      // Actually just navigate to messages and let user type first message
      navigate('/messages', { state: { openUserId: parseInt(userId), openUserName: profile?.company_name } });
    } catch (err) {
      navigate('/messages');
    }
  };

  const [form, setForm] = useState({
    company_description: '',
    industry:            '',
    location:            '',
    website:             '',
    founded_year:        '',
    employee_count:      ''
  });

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      if (isOwnProfile) {
        // Own profile — use /profile/me
        const res = await api.get('/profile/me');
        setProfile(res.data);
        setForm({
          company_description: res.data.company_description || '',
          industry:            res.data.industry            || '',
          location:            res.data.location            || '',
          website:             res.data.website             || '',
          founded_year:        res.data.founded_year        || '',
          employee_count:      res.data.employee_count      || ''
        });
      } else {
        // Public profile — use /profile/:userId (includes analytics)
        const res = await api.get(`/profile/${userId}`);
        setProfile(res.data.profile);
        setAnalytics(res.data.analytics);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await api.put('/profile/update', form);
      setSaveMsg('✅ Profile updated successfully.');
      setEditMode(false);
      await loadProfile();
    } catch (err) {
      setSaveMsg('❌ ' + (err.response?.data?.message || 'Failed to save.'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await api.post('/profile/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(prev => ({ ...prev, logo: res.data.logo }));
    } catch (err) {
      alert(err.response?.data?.message || 'Logo upload failed.');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div className="loading-spinner"></div>
    </div>
  );

  if (error) return (
    <div style={{ background: '#ffebe9', border: '1px solid #ffccc7', borderRadius: '6px', padding: '1rem', color: '#cf1322' }}>
      {error}
    </div>
  );

  if (!profile) return null;

  // ── PUBLIC PROFILE VIEW ──
  if (!isOwnProfile) {
    const score     = analytics?.credibilityScore?.total_score || 0;
    const scoreInfo = scoreLabel(score);
    const revenue   = analytics?.revenue || [];
    const maxRev    = Math.max(...revenue.map(r => r.revenue), 1);

    return (
      <div>
        {/* Profile Header */}
        <div className="business-card" style={{ marginBottom: '1.5rem' }}>
          <div className="business-card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              {/* Logo / Avatar */}
              <div style={{
                width: '72px', height: '72px', borderRadius: '12px',
                background: profile.logo ? 'transparent' : 'linear-gradient(135deg, #0969da, #0550ae)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '1.5rem', fontWeight: 700,
                overflow: 'hidden', flexShrink: 0,
                border: '1px solid #eaeef2'
              }}>
                {profile.logo
                  ? <img src={profile.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile.company_name?.charAt(0).toUpperCase()
                }
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#0d1117', margin: '0 0 0.375rem' }}>
                  {profile.company_name}
                </h1>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                  {profile.industry && <span style={{ fontSize: '0.875rem', color: '#57606a' }}>🏭 {profile.industry}</span>}
                  {profile.location && <span style={{ fontSize: '0.875rem', color: '#57606a' }}>📍 {profile.location}</span>}
                  {profile.total_connections > 0 && <span style={{ fontSize: '0.875rem', color: '#57606a' }}>🔗 {profile.total_connections} connections</span>}
                </div>
              </div>
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.625rem', flexShrink: 0 }}>
                <button
                  className="btn-primary"
                  onClick={() => handleSendMessage()}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                  💬 Message
                </button>
              </div>
              {/* Credibility Score Badge */}
              <div style={{ textAlign: 'center', padding: '1rem 1.5rem', background: scoreInfo.bg, borderRadius: '12px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: scoreInfo.color, lineHeight: 1 }}>{score}</div>
                <div style={{ fontSize: '0.6875rem', color: scoreInfo.color, fontWeight: 600, marginTop: '0.25rem' }}>CREDIBILITY</div>
                <div style={{ fontSize: '0.75rem', color: scoreInfo.color, fontWeight: 500 }}>{scoreInfo.label}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="business-grid business-grid-2">
          {/* About */}
          <div className="business-card">
            <div className="business-card-header">
              <h2 className="business-card-title">About</h2>
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.8125rem', color: '#0969da', textDecoration: 'none' }}>
                  🌐 Website
                </a>
              )}
            </div>
            <div className="business-card-body">
              <p style={{ fontSize: '0.875rem', color: '#57606a', lineHeight: 1.7, margin: '0 0 1rem' }}>
                {profile.company_description || 'No description provided.'}
              </p>
              {[
                { label: 'Founded',    value: analytics?.businessInfo?.founded_year   },
                { label: 'Employees',  value: analytics?.businessInfo?.employee_count },
                { label: 'Type',       value: analytics?.businessInfo?.business_type  },
                { label: 'Turnover',   value: analytics?.businessInfo?.annual_turnover}
              ].map(({ label, value }) => value ? (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0'
                }}>
                  <span style={{ fontSize: '0.8125rem', color: '#57606a' }}>{label}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0d1117' }}>{value}</span>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Client Base */}
          <div className="business-card">
            <div className="business-card-header">
              <h2 className="business-card-title">Client Base</h2>
            </div>
            <div className="business-card-body">
              {analytics?.clients?.total_clients ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ textAlign: 'center', padding: '0.875rem', background: '#f6f8fa', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0969da' }}>
                        {analytics.clients.total_clients}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#57606a' }}>Total Clients</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.875rem', background: '#f6f8fa', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a7f37' }}>
                        {analytics.clients.repeat_client_percent ? `${parseFloat(analytics.clients.repeat_client_percent).toFixed(0)}%` : '0%'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#57606a' }}>Repeat Clients</div>
                    </div>
                  </div>
                  {analytics.clients.industries_served && (
                    <div style={{ fontSize: '0.8125rem', color: '#57606a' }}>
                      <strong style={{ color: '#0d1117' }}>Industries: </strong>
                      {analytics.clients.industries_served}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#57606a', fontSize: '0.875rem' }}>
                  No client data provided yet.
                </div>
              )}
            </div>
          </div>

          {/* Revenue Chart */}
          {revenue.length > 0 && (
            <div className="business-card">
              <div className="business-card-header">
                <h2 className="business-card-title">Revenue Trend</h2>
              </div>
              <div className="business-card-body">
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.375rem', height: '140px' }}>
                  {revenue.map((item, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
                      <div style={{ fontSize: '0.5625rem', fontWeight: 600, color: '#0d1117' }}>
                        ₹{(item.revenue / 100000).toFixed(1)}L
                      </div>
                      <div style={{
                        width: '100%', minHeight: '4px',
                        height: `${(item.revenue / maxRev) * 100}px`,
                        background: 'linear-gradient(180deg, #0969da, #0550ae)',
                        borderRadius: '3px 3px 0 0'
                      }} />
                      <div style={{ fontSize: '0.5625rem', color: '#57606a' }}>
                        {MONTHS[item.month - 1]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Credibility Breakdown */}
          <div className="business-card">
            <div className="business-card-header">
              <h2 className="business-card-title">Credibility Score</h2>
              <span style={{
                background: scoreInfo.bg, color: scoreInfo.color,
                padding: '0.25rem 0.625rem', borderRadius: '999px',
                fontSize: '0.75rem', fontWeight: 600
              }}>
                {score}/100
              </span>
            </div>
            <div className="business-card-body">
              {[
                { label: 'Profile Completeness', value: analytics?.credibilityScore?.profile_score    || 0, max: 25 },
                { label: 'Network Size',          value: analytics?.credibilityScore?.connection_score || 0, max: 25 },
                { label: 'Platform Activity',     value: analytics?.credibilityScore?.activity_score  || 0, max: 25 },
                { label: 'Platform Tenure',       value: analytics?.credibilityScore?.tenure_score    || 0, max: 25 }
              ].map(({ label, value, max }) => (
                <div key={label} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#57606a' }}>{label}</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0d1117' }}>{value}/{max}</span>
                  </div>
                  <div style={{ background: '#eaeef2', borderRadius: '999px', height: '6px' }}>
                    <div style={{
                      width: `${(value / max) * 100}%`, height: '100%',
                      background: scoreInfo.color, borderRadius: '999px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── OWN PROFILE VIEW ──
  return (
    <div>
      {saveMsg && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem',
          background: saveMsg.startsWith('✅') ? '#dafbe1' : '#ffebe9',
          color:      saveMsg.startsWith('✅') ? '#1a7f37'  : '#cf1322'
        }}>
          {saveMsg}
        </div>
      )}

      <div className="business-grid business-grid-2">
        {/* Left — Profile Info */}
        <div className="business-card">
          <div className="business-card-header">
            <h2 className="business-card-title">Profile Information</h2>
            <button
              className={editMode ? 'btn-secondary' : 'btn-primary'}
              onClick={() => { setEditMode(!editMode); setSaveMsg(''); }}
              style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
            >
              {editMode ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
          <div className="business-card-body">
            {editMode ? (
              <form onSubmit={handleSave}>
                {[
                  { name: 'industry',            label: 'Industry',            type: 'text',   placeholder: 'e.g. Technology' },
                  { name: 'location',            label: 'Location',            type: 'text',   placeholder: 'City, State' },
                  { name: 'website',             label: 'Website',             type: 'url',    placeholder: 'https://yourcompany.com' },
                  { name: 'founded_year',        label: 'Founded Year',        type: 'number', placeholder: 'e.g. 2015' },
                  { name: 'employee_count',      label: 'Employee Count',      type: 'number', placeholder: 'e.g. 25' }
                ].map(({ name, label, type, placeholder }) => (
                  <div key={name} style={{ marginBottom: '0.875rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#57606a', marginBottom: '0.375rem' }}>
                      {label}
                    </label>
                    <input
                      type={type} name={name}
                      value={form[name]} onChange={handleChange}
                      placeholder={placeholder}
                      style={{
                        width: '100%', padding: '0.5rem 0.75rem',
                        border: '1px solid #d0d7de', borderRadius: '6px',
                        fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                ))}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#57606a', marginBottom: '0.375rem' }}>
                    Company Description
                  </label>
                  <textarea
                    name="company_description"
                    value={form.company_description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe your business..."
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem',
                      border: '1px solid #d0d7de', borderRadius: '6px',
                      fontSize: '0.875rem', outline: 'none',
                      resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={saving}
                  style={{ width: '100%', padding: '0.625rem' }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { label: 'COMPANY',       value: profile.company_name  },
                  { label: 'EMAIL',         value: profile.email         },
                  { label: 'PHONE',         value: profile.phone         },
                  { label: 'INDUSTRY',      value: profile.industry      },
                  { label: 'LOCATION',      value: profile.location      },
                  { label: 'WEBSITE',       value: profile.website       },
                  { label: 'FOUNDED',       value: profile.founded_year  },
                  { label: 'TEAM SIZE',     value: profile.employee_count ? `${profile.employee_count} employees` : null }
                ].map(({ label, value }) => value ? (
                  <div key={label}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#57606a', marginBottom: '0.25rem' }}>
                      {label}
                    </div>
                    <div style={{
                      fontSize: '0.875rem', color: '#0d1117',
                      fontFamily: ['GST NUMBER','CIN NUMBER'].includes(label) ? 'monospace' : 'inherit'
                    }}>
                      {label === 'STATUS' ? (
                        <span style={{
                          background: '#dafbe1', color: '#1a7f37',
                          padding: '0.125rem 0.5rem', borderRadius: '999px',
                          fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize'
                        }}>
                          {value}
                        </span>
                      ) : value}
                    </div>
                  </div>
                ) : null)}
              </div>
            )}
          </div>
        </div>

        {/* Right — About + Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* About */}
          <div className="business-card">
            <div className="business-card-header">
              <h2 className="business-card-title">About</h2>
            </div>
            <div className="business-card-body">
              <p style={{ fontSize: '0.875rem', color: '#57606a', lineHeight: 1.7, margin: 0 }}>
                {profile.company_description || 'No description yet. Click Edit Profile to add one.'}
              </p>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="business-card">
            <div className="business-card-header">
              <h2 className="business-card-title">Company Logo</h2>
            </div>
            <div className="business-card-body" style={{ textAlign: 'center' }}>
              {profile.logo ? (
                <img
                  src={profile.logo} alt="Company Logo"
                  style={{ maxHeight: '80px', maxWidth: '200px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #eaeef2' }}
                />
              ) : (
                <div style={{
                  width: '80px', height: '80px', borderRadius: '12px', margin: '0 auto 1rem',
                  background: 'linear-gradient(135deg, #0969da, #0550ae)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '1.75rem', fontWeight: 700
                }}>
                  {profile.company_name?.charAt(0).toUpperCase()}
                </div>
              )}
              <label style={{
                display: 'inline-block', padding: '0.5rem 1rem',
                background: '#f6f8fa', border: '1px solid #d0d7de',
                borderRadius: '6px', fontSize: '0.8125rem', cursor: 'pointer',
                color: '#0d1117', fontWeight: 500
              }}>
                {profile.logo ? 'Change Logo' : 'Upload Logo'}
                <input type="file" accept="image/*" onChange={handleLogoUpload}
                  style={{ display: 'none' }} />
              </label>
              <p style={{ fontSize: '0.75rem', color: '#57606a', marginTop: '0.5rem', marginBottom: 0 }}>
                JPEG, PNG or WEBP — max 5MB
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;