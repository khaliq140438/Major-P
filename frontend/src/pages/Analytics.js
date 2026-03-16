import { useEffect, useState } from 'react';
import api from '../api';

// ── Month name helper ──
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Credibility score label ──
const scoreLabel = (score) => {
  if (score >= 80) return { label: 'Excellent', color: '#1a7f37', bg: '#dafbe1' };
  if (score >= 60) return { label: 'Strong',    color: '#0969da', bg: '#ddf4ff' };
  if (score >= 40) return { label: 'Moderate',  color: '#bf8700', bg: '#fff8c5' };
  return              { label: 'Building',   color: '#57606a', bg: '#f6f8fa' };
};

const Analytics = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');
  const [showForm, setShowForm] = useState(false);

  // Single form state for all 3 manual modules
  const [form, setForm] = useState({
    // Revenue
    month:   new Date().getMonth() + 1,
    year:    new Date().getFullYear(),
    revenue: '',
    // Business Info
    founded_year:    '',
    employee_count:  '',
    business_type:   '',
    annual_turnover: '',
    // Clients
    total_clients:         '',
    repeat_client_percent: '',
    industries_served:     '',
    top_client_location:   ''
  });

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics');
      setData(res.data);

      // Pre-fill form with existing data
      const { businessInfo, clients } = res.data;
      setForm(prev => ({
        ...prev,
        founded_year:          businessInfo?.founded_year    || '',
        employee_count:        businessInfo?.employee_count  || '',
        business_type:         businessInfo?.business_type   || '',
        annual_turnover:       businessInfo?.annual_turnover || '',
        total_clients:         clients?.total_clients           || '',
        repeat_client_percent: clients?.repeat_client_percent   || '',
        industries_served:     clients?.industries_served        || '',
        top_client_location:   clients?.top_client_location      || ''
      }));
    } catch (err) {
      console.error('Failed to load analytics:', err);
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
    setMsg('');

    try {
      // Save all 3 modules in parallel
      await Promise.all([
        form.revenue !== '' && api.post('/analytics/revenue', {
          month:   parseInt(form.month),
          year:    parseInt(form.year),
          revenue: parseFloat(form.revenue)
        }),
        api.post('/analytics/business-info', {
          founded_year:    form.founded_year    || null,
          employee_count:  form.employee_count  || null,
          business_type:   form.business_type   || null,
          annual_turnover: form.annual_turnover  || null
        }),
        api.post('/analytics/clients', {
          total_clients:         parseInt(form.total_clients)         || 0,
          repeat_client_percent: parseFloat(form.repeat_client_percent) || 0,
          industries_served:     form.industries_served   || null,
          top_client_location:   form.top_client_location || null
        })
      ].filter(Boolean));

      setMsg('✅ Analytics saved successfully.');
      setShowForm(false);
      await loadAnalytics();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.message || 'Failed to save. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const { revenue = [], businessInfo = {}, clients = {}, credibilityScore = {} } = data || {};
  const maxRevenue = Math.max(...revenue.map(r => r.revenue), 1);
  const score      = credibilityScore.total_score || 0;
  const scoreInfo  = scoreLabel(score);

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0d1117', margin: 0 }}>
            Business Analytics
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#57606a', margin: '0.25rem 0 0' }}>
            Fill in your business data to build credibility with potential partners.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          {showForm ? 'Cancel' : '✏️ Edit Analytics'}
        </button>
      </div>

      {msg && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem',
          background: msg.startsWith('✅') ? '#dafbe1' : '#ffebe9',
          color:      msg.startsWith('✅') ? '#1a7f37'  : '#cf1322'
        }}>
          {msg}
        </div>
      )}

      {/* ── Edit Form ── */}
      {showForm && (
        <div className="business-card" style={{ marginBottom: '1.5rem' }}>
          <div className="business-card-header">
            <h2 className="business-card-title">Update Your Analytics</h2>
          </div>
          <div className="business-card-body">
            <form onSubmit={handleSave}>

              {/* Revenue Section */}
              <p style={{ fontWeight: 600, color: '#0d1117', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                📈 Revenue — Add monthly revenue entry
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Month</label>
                  <select name="month" value={form.month} onChange={handleChange} style={inputStyle}>
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Year</label>
                  <input type="number" name="year" value={form.year} onChange={handleChange}
                    style={inputStyle} min="2000" max="2099" />
                </div>
                <div>
                  <label style={labelStyle}>Revenue (₹)</label>
                  <input type="number" name="revenue" value={form.revenue} onChange={handleChange}
                    style={inputStyle} placeholder="e.g. 500000" min="0" />
                </div>
              </div>

              {/* Business Info Section */}
              <p style={{ fontWeight: 600, color: '#0d1117', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                🏢 Business Info
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Founded Year</label>
                  <input type="number" name="founded_year" value={form.founded_year}
                    onChange={handleChange} style={inputStyle} placeholder="e.g. 2015" min="1900" max="2099" />
                </div>
                <div>
                  <label style={labelStyle}>Employee Count</label>
                  <input type="number" name="employee_count" value={form.employee_count}
                    onChange={handleChange} style={inputStyle} placeholder="e.g. 25" min="0" />
                </div>
                <div>
                  <label style={labelStyle}>Business Type</label>
                  <select name="business_type" value={form.business_type} onChange={handleChange} style={inputStyle}>
                    <option value="">Select type</option>
                    <option value="Startup">Startup</option>
                    <option value="SME">SME</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Annual Turnover</label>
                  <select name="annual_turnover" value={form.annual_turnover} onChange={handleChange} style={inputStyle}>
                    <option value="">Select range</option>
                    <option value="Below 10L">Below ₹10L</option>
                    <option value="10L-50L">₹10L – ₹50L</option>
                    <option value="50L-1Cr">₹50L – ₹1Cr</option>
                    <option value="1Cr-10Cr">₹1Cr – ₹10Cr</option>
                    <option value="Above 10Cr">Above ₹10Cr</option>
                  </select>
                </div>
              </div>

              {/* Clients Section */}
              <p style={{ fontWeight: 600, color: '#0d1117', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                🤝 Client Base
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Total Clients</label>
                  <input type="number" name="total_clients" value={form.total_clients}
                    onChange={handleChange} style={inputStyle} placeholder="e.g. 40" min="0" />
                </div>
                <div>
                  <label style={labelStyle}>Repeat Client % </label>
                  <input type="number" name="repeat_client_percent" value={form.repeat_client_percent}
                    onChange={handleChange} style={inputStyle} placeholder="e.g. 65" min="0" max="100" />
                </div>
                <div>
                  <label style={labelStyle}>Industries Served</label>
                  <input type="text" name="industries_served" value={form.industries_served}
                    onChange={handleChange} style={inputStyle} placeholder="e.g. Retail, Finance, IT" />
                </div>
                <div>
                  <label style={labelStyle}>Top Client Location</label>
                  <input type="text" name="top_client_location" value={form.top_client_location}
                    onChange={handleChange} style={inputStyle} placeholder="e.g. Mumbai" />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={saving}
                style={{ width: '100%', padding: '0.75rem' }}>
                {saving ? 'Saving...' : 'Save All Analytics'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Module 4: Credibility Score ── */}
      <div className="business-card" style={{ marginBottom: '1.5rem' }}>
        <div className="business-card-header">
          <h2 className="business-card-title">Credibility Score</h2>
          <span style={{
            background: scoreInfo.bg, color: scoreInfo.color,
            padding: '0.25rem 0.75rem', borderRadius: '999px',
            fontSize: '0.8125rem', fontWeight: 600
          }}>
            {scoreInfo.label}
          </span>
        </div>
        <div className="business-card-body">
          {/* Big score */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3.5rem', fontWeight: 700, color: scoreInfo.color, lineHeight: 1 }}>
              {score}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#57606a', marginTop: '0.25rem' }}>out of 100</div>
            {/* Score bar */}
            <div style={{ margin: '1rem auto 0', maxWidth: '300px', background: '#eaeef2', borderRadius: '999px', height: '8px' }}>
              <div style={{
                width: `${score}%`, height: '100%', borderRadius: '999px',
                background: scoreInfo.color, transition: 'width 0.5s ease'
              }} />
            </div>
          </div>

          {/* 4 component scores */}
          <div className="business-grid business-grid-4">
            {[
              { label: 'Profile',     value: credibilityScore.profile_score    || 0, max: 25 },
              { label: 'Connections', value: credibilityScore.connection_score  || 0, max: 25 },
              { label: 'Activity',    value: credibilityScore.activity_score    || 0, max: 25 },
              { label: 'Tenure',      value: credibilityScore.tenure_score      || 0, max: 25 }
            ].map(({ label, value, max }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0d1117' }}>{value}</div>
                <div style={{ fontSize: '0.75rem', color: '#57606a' }}>{label} / {max}</div>
                <div style={{ marginTop: '0.375rem', background: '#eaeef2', borderRadius: '999px', height: '4px' }}>
                  <div style={{
                    width: `${(value / max) * 100}%`, height: '100%',
                    background: '#0969da', borderRadius: '999px'
                  }} />
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '0.75rem', color: '#57606a', textAlign: 'center', marginTop: '1rem', marginBottom: 0 }}>
            Score is computed automatically by the platform based on your profile, connections, activity and time on platform.
          </p>
        </div>
      </div>

      {/* ── Bottom Grid: Revenue + Business Info + Clients ── */}
      <div className="business-grid business-grid-2">

        {/* Module 1: Revenue Chart */}
        <div className="business-card">
          <div className="business-card-header">
            <h2 className="business-card-title">Revenue Trend</h2>
          </div>
          <div className="business-card-body">
            {revenue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#57606a', fontSize: '0.875rem' }}>
                No revenue data yet. Click Edit Analytics to add.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.375rem', height: '160px' }}>
                {revenue.map((item, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
                    <div style={{ fontSize: '0.625rem', fontWeight: 600, color: '#0d1117' }}>
                      ₹{(item.revenue / 100000).toFixed(1)}L
                    </div>
                    <div style={{
                      width: '100%',
                      // Cap bar at 110px max so single-entry charts don't fill the whole space
                      height: `${Math.min((item.revenue / maxRevenue) * 110, 110)}px`,
                      background: 'linear-gradient(180deg, #2563eb, #1d4ed8)',
                      borderRadius: '4px 4px 0 0', minHeight: '8px'
                    }} />
                    <div style={{ fontSize: '0.6rem', color: '#57606a' }}>
                      {MONTHS[item.month - 1]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Module 2: Business Info */}
        <div className="business-card">
          <div className="business-card-header">
            <h2 className="business-card-title">Business Info</h2>
          </div>
          <div className="business-card-body">
            {[
              { label: 'Founded',        value: businessInfo.founded_year    },
              { label: 'Employees',      value: businessInfo.employee_count  },
              { label: 'Business Type',  value: businessInfo.business_type   },
              { label: 'Annual Turnover',value: businessInfo.annual_turnover }
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '0.625rem 0', borderBottom: '1px solid #eaeef2'
              }}>
                <span style={{ fontSize: '0.8125rem', color: '#57606a' }}>{label}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0d1117' }}>
                  {value || <span style={{ color: '#d0d7de' }}>—</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Module 3: Client Base */}
        <div className="business-card">
          <div className="business-card-header">
            <h2 className="business-card-title">Client Base</h2>
          </div>
          <div className="business-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#f6f8fa', borderRadius: '6px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0969da' }}>
                  {clients.total_clients || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#57606a' }}>Total Clients</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#f6f8fa', borderRadius: '6px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1a7f37' }}>
                  {clients.repeat_client_percent ? `${parseFloat(clients.repeat_client_percent).toFixed(0)}%` : '0%'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#57606a' }}>Repeat Clients</div>
              </div>
            </div>
            {[
              { label: 'Industries Served',  value: clients.industries_served    },
              { label: 'Top Client Location',value: clients.top_client_location  }
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '0.625rem 0', borderBottom: '1px solid #eaeef2'
              }}>
                <span style={{ fontSize: '0.8125rem', color: '#57606a' }}>{label}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0d1117' }}>
                  {value || <span style={{ color: '#d0d7de' }}>—</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

// ── Shared style helpers ──
const labelStyle = {
  display: 'block', fontSize: '0.75rem',
  fontWeight: 600, color: '#57606a',
  marginBottom: '0.375rem'
};

const inputStyle = {
  width: '100%', padding: '0.5rem 0.75rem',
  border: '1px solid #d0d7de', borderRadius: '6px',
  fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box'
};

export default Analytics;