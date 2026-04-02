import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import api from '../api';
import { useAuth } from '../auth';
import { Factory, MapPin, Link as LinkIcon, Calendar, Users, MessageSquare, Globe } from 'lucide-react';

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, LineElement,
  PointElement, Filler, Tooltip
);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const scoreLabel = (score) => {
  if (score >= 80) return { label: 'Excellent', color: '#1a7f37', bg: '#dafbe1' };
  if (score >= 60) return { label: 'Strong',    color: '#0969da', bg: '#ddf4ff' };
  if (score >= 40) return { label: 'Moderate',  color: '#bf8700', bg: '#fff8c5' };
  return              { label: 'Building',   color: '#57606a', bg: '#f6f8fa' };
};

// ── Full chart options for public profile — matches Analytics page ──
const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 }, color: '#57606a' }
    },
    y: {
      grid: { color: '#eaeef2' },
      ticks: { font: { size: 11 }, color: '#57606a' }
    }
  }
};

const revenueOptions = {
  ...baseOptions,
  plugins: {
    ...baseOptions.plugins,
    tooltip: {
      callbacks: {
        label: (ctx) => ` ₹${Number(ctx.raw).toLocaleString('en-IN')}`
      }
    }
  },
  scales: {
    ...baseOptions.scales,
    y: {
      ...baseOptions.scales.y,
      ticks: {
        font: { size: 11 },
        color: '#57606a',
        stepSize: 100000,                                        // ← one tick every ₹1L
        callback: (val) => `₹${(val / 100000).toFixed(0)}L`     // ← clean label
      }
    }
  }
};

const grossProfitOptions = { ...revenueOptions };

const momOptions = {
  ...baseOptions,
  plugins: {
    ...baseOptions.plugins,
    tooltip: {
      callbacks: {
        label: (ctx) => ctx.raw === null
          ? ' No previous month'
          : ` ${ctx.raw > 0 ? '+' : ''}${ctx.raw}%`
      }
    }
  },
  scales: {
    ...baseOptions.scales,
    y: {
      ...baseOptions.scales.y,
      ticks: {
        ...baseOptions.scales.y.ticks,
        callback: (val) => `${val}%`
      }
    }
  }
};

const clientOptions = {
  ...baseOptions,
  plugins: {
    ...baseOptions.plugins,
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.raw} clients`
      }
    }
  },
  scales: {
    ...baseOptions.scales,
    y: {
      ...baseOptions.scales.y,
      beginAtZero: true,
      ticks: {
        ...baseOptions.scales.y.ticks,
        stepSize: 1,
        callback: (val) => Number.isInteger(val) ? val : ''
      }
    }
  }
};


const Profile = () => {
  const { userId }         = useParams();
  const { user: authUser } = useAuth();
  const navigate           = useNavigate();
  const isOwnProfile       = !userId;

  const [profile,  setProfile]  = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState('');

  const [form, setForm] = useState({
    company_description: '',
    industry:            '',
    location:            '',
    website:             '',
    founded_year:        '',
    employee_count:      ''
  });

  const handleSendMessage = () => {
    navigate('/messages', { state: { openUserId: parseInt(userId), openUserName: profile?.company_name } });
  };

  useEffect(() => { loadProfile(); }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      if (isOwnProfile) {
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await api.put('/profile/update', form);
      setSaveMsg('Success: Profile updated successfully.');
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
    const monthlyData    = analytics?.monthlyData || [];
    const credScore      = analytics?.credibilityScore || {};
    const score          = credScore.total_score || 0;
    const scoreInfo      = scoreLabel(score);
    const hasData        = monthlyData.length > 0;
    
    // Only display 10 months of charted data
    const chartData      = monthlyData.slice(-10);
    const labels         = chartData.map(r => `${MONTHS[r.month - 1]}`);

    // Mini chart datasets
    const revenueData = {
      labels,
      datasets: [{
        data:            chartData.map(r => Number(r.revenue)),
        backgroundColor: '#2563eb',
        borderRadius:    3,
        borderSkipped:   false
      }]
    };

    const grossProfitData = {
      labels,
      datasets: [{
        data:        chartData.map(r => Number(r.gross_profit)),
        borderColor: '#0891b2',
        borderWidth: 2,
        pointRadius: 2,
        tension:     0.4,
        fill:        false
      }]
    };

    const clientData = {
      labels,
      datasets: [{
        data:            chartData.map(r => r.client_count),
        borderColor:     '#7c3aed',
        borderWidth:     2,
        pointRadius:     2,
        tension:         0.4,
        fill:            true,
        backgroundColor: 'rgba(124,58,237,0.1)'
      }]
    };

    const momValues = chartData.map(r => r.mom_growth);
    const momData = {
      labels,
      datasets: [{
        data:            momValues,
        backgroundColor: momValues.map(v => v === null ? '#d0d7de' : v >= 0 ? '#16a34a' : '#dc2626'),
        borderRadius:    3,
        borderSkipped:   false
      }]
    };

    const MiniEmpty = () => (
      <div style={{
        height: '80px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#8c959f', fontSize: '0.75rem'
      }}>
        No data yet
      </div>
    );

    return (
      <div>
        {/* ── Profile Header ── */}
        <div className="business-card" style={{ marginBottom: '1.5rem' }}>
          <div className="business-card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {/* Logo */}
              <div style={{
                width: '72px', height: '72px', borderRadius: '12px', flexShrink: 0,
                background: profile.logo ? 'transparent' : 'linear-gradient(135deg, #0969da, #0550ae)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '1.5rem', fontWeight: 700,
                overflow: 'hidden', border: '1px solid #eaeef2'
              }}>
                {profile.logo
                  ? <img src={profile.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile.company_name?.charAt(0).toUpperCase()
                }
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#0d1117', margin: '0 0 0.375rem' }}>
                  {profile.company_name}
                </h1>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                  {profile.industry && <span style={{ fontSize: '0.875rem', color: '#57606a', display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Factory size={16} /> {profile.industry}</span>}
                  {profile.location && <span style={{ fontSize: '0.875rem', color: '#57606a', display: 'flex', alignItems: 'center', gap: '0.375rem' }}><MapPin size={16} /> {profile.location}</span>}
                  {profile.total_connections > 0 && (
                    <span style={{ fontSize: '0.875rem', color: '#57606a', display: 'flex', alignItems: 'center', gap: '0.375rem' }}><LinkIcon size={16} /> {profile.total_connections} connections</span>
                  )}
                  {profile.founded_year && (
                    <span style={{ fontSize: '0.875rem', color: '#57606a', display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Calendar size={16} /> Est. {profile.founded_year}</span>
                  )}
                  {profile.employee_count > 0 && (
                    <span style={{ fontSize: '0.875rem', color: '#57606a', display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Users size={16} /> {profile.employee_count} employees</span>
                  )}
                </div>
              </div>

              {/* Message button */}
              <button
                className="btn-primary"
                onClick={handleSendMessage}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <MessageSquare size={16} /> Message
              </button>

              {/* Credibility Score Badge */}
              <div style={{
                textAlign: 'center', padding: '1rem 1.5rem',
                background: scoreInfo.bg, borderRadius: '12px', flexShrink: 0
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: scoreInfo.color, lineHeight: 1 }}>
                  {score}
                </div>
                <div style={{ fontSize: '0.6875rem', color: scoreInfo.color, fontWeight: 600, marginTop: '0.25rem' }}>
                  CREDIBILITY
                </div>
                <div style={{ fontSize: '0.75rem', color: scoreInfo.color, fontWeight: 500 }}>
                  {scoreInfo.label}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="business-grid business-grid-2">

          {/* ── About ── */}
          <div className="business-card">
            <div className="business-card-header">
              <h2 className="business-card-title">About</h2>
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.8125rem', color: '#0969da', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Globe size={14} /> Website
                </a>
              )}
            </div>
            <div className="business-card-body">
              <p style={{ fontSize: '0.875rem', color: '#57606a', lineHeight: 1.7, margin: '0 0 1rem' }}>
                {profile.company_description || 'No description provided.'}
              </p>
            </div>
          </div>

          {/* ── Credibility Score Breakdown ── */}
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
                { label: 'Profile Completeness', value: credScore.profile_score   || 0, max: 30 },
                { label: 'Analytics Data',        value: credScore.analytics_score || 0, max: 40 },
                { label: 'Network Size',          value: credScore.network_score   || 0, max: 15 },
                { label: 'Platform Tenure',       value: credScore.tenure_score    || 0, max: 15 }
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

          {/* ── Revenue Trend mini chart ── */}
          <div className="business-card">
            <div className="business-card-header">
              <h2 className="business-card-title">Revenue Trend</h2>
              <span style={badgeStyle('#2563eb')}>Bar</span>
            </div>
            <div className="business-card-body">
              {hasData
                ? <div style={{ height: '200px' }}><Bar data={revenueData} options={revenueOptions} /></div>
                : <MiniEmpty />
              }
            </div>
          </div>

          {/* ── Gross Profit mini chart ── */}
          <div className="business-card">
            <div className="business-card-header">
              <h2 className="business-card-title">Gross Profit Trend</h2>
              <span style={badgeStyle('#0891b2')}>Line</span>
            </div>
            <div className="business-card-body">
              {hasData
                ? <div style={{ height: '200px' }}><Line data={grossProfitData} options={grossProfitOptions} /></div>
                : <MiniEmpty />
              }
            </div>
          </div>

          {/* ── Client Count mini chart ── */}
          <div className="business-card">
            <div className="business-card-header">
              <h2 className="business-card-title">New Clients Per Month</h2>
              <span style={badgeStyle('#7c3aed')}>Area</span>
            </div>
            <div className="business-card-body">
              {hasData
                ? <div style={{ height: '200px' }}><Line data={clientData} options={clientOptions} /></div>
                : <MiniEmpty />
              }
            </div>
          </div>

          {/* ── MoM Growth mini chart ── */}
          <div className="business-card">
            <div className="business-card-header">
              <h2 className="business-card-title">Month-on-Month Growth</h2>
              <span style={badgeStyle('#16a34a')}>Diverging</span>
            </div>
            <div className="business-card-body">
              {hasData
                ? <div style={{ height: '200px' }}><Bar data={momData} options={momOptions} /></div>
                : <MiniEmpty />
              }
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ── OWN PROFILE VIEW — unchanged ──
  return (
    <div>
      {saveMsg && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem',
          background: saveMsg.startsWith('Success') ? '#dafbe1' : '#ffebe9',
          color:      saveMsg.startsWith('Success') ? '#1a7f37'  : '#cf1322'
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
                  { name: 'industry',       label: 'Industry',       type: 'text',   placeholder: 'e.g. Technology' },
                  { name: 'location',       label: 'Location',       type: 'text',   placeholder: 'City, State' },
                  { name: 'website',        label: 'Website',        type: 'url',    placeholder: 'https://yourcompany.com' },
                  { name: 'founded_year',   label: 'Founded Year',   type: 'number', placeholder: 'e.g. 2015' },
                  { name: 'employee_count', label: 'Employee Count', type: 'number', placeholder: 'e.g. 25' }
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
                  { label: 'COMPANY',   value: profile.company_name   },
                  { label: 'EMAIL',     value: profile.email          },
                  { label: 'PHONE',     value: profile.phone          },
                  { label: 'INDUSTRY',  value: profile.industry       },
                  { label: 'LOCATION',  value: profile.location       },
                  { label: 'WEBSITE',   value: profile.website        },
                  { label: 'FOUNDED',   value: profile.founded_year   },
                  { label: 'TEAM SIZE', value: profile.employee_count ? `${profile.employee_count} employees` : null }
                ].map(({ label, value }) => value ? (
                  <div key={label}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#57606a', marginBottom: '0.25rem' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#0d1117' }}>
                      {value}
                    </div>
                  </div>
                ) : null)}
              </div>
            )}
          </div>
        </div>

        {/* Right — Logo + About */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              </label>
              <p style={{ fontSize: '0.75rem', color: '#57606a', marginTop: '0.5rem', marginBottom: 0 }}>
                JPEG, PNG or WEBP — max 5MB
              </p>
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
};

const badgeStyle = (color) => ({
  fontSize: '0.6875rem', fontWeight: 600,
  color, background: `${color}18`,
  padding: '0.125rem 0.5rem',
  borderRadius: '999px',
  border: `1px solid ${color}30`
});

export default Profile;