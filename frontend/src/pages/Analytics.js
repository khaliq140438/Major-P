import { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import api from '../api';
import { useAuth } from '../auth';
import { Download, Plus, Trash2, CheckCircle2, TrendingUp, DollarSign, Users, Briefcase } from 'lucide-react';

// ── Register Chart.js components ──
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const scoreLabel = (score) => {
  if (score >= 80) return { label: 'Excellent', color: '#1a7f37', bg: '#dafbe1' };
  if (score >= 60) return { label: 'Strong',    color: '#0969da', bg: '#ddf4ff' };
  if (score >= 40) return { label: 'Moderate',  color: '#bf8700', bg: '#fff8c5' };
  return              { label: 'Building',   color: '#57606a', bg: '#f6f8fa' };
};

// ── Shared chart options base ──
const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
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

const Analytics = () => {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    month:               new Date().getMonth() + 1,
    year:                new Date().getFullYear(),
    revenue:             '',
    gross_profit_margin: '',
    client_count:        ''
  });

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics');
      setData(res.data);
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
      await api.post('/analytics/monthly', {
        month:               parseInt(form.month),
        year:                parseInt(form.year),
        revenue:             parseFloat(form.revenue),
        gross_profit_margin: parseFloat(form.gross_profit_margin),
        client_count:        parseInt(form.client_count)
      });

      setMsg('Success: Monthly data saved successfully.');
      setShowForm(false);
      // Reset only the value fields, keep month/year as-is for convenience
      setForm(prev => ({ ...prev, revenue: '', gross_profit_margin: '', client_count: '' }));
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

  const { monthlyData = [], credibilityScore = {} } = data || {};
  const score     = credibilityScore.total_score || 0;
  const scoreInfo = scoreLabel(score);

  // ── Render Charts using only the latest 10 months ──
  const chartData = monthlyData.slice(-10);

  // ── Build chart labels (e.g. "Jan 24") ──
  const labels = chartData.map(r => `${MONTHS[r.month - 1]} ${String(r.year).slice(2)}`);

  // ── Chart 1: Revenue — Bar chart ──
  const revenueChartData = {
    labels,
    datasets: [{
      data:            chartData.map(r => Number(r.revenue)),
      backgroundColor: '#2563eb',
      borderRadius:    6,
      borderSkipped:   false,
    }]
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

  // ── Chart 2: Gross Profit — Line chart ──
  const grossProfitChartData = {
    labels,
    datasets: [{
      data:        chartData.map(r => Number(r.gross_profit)),
      borderColor: '#0891b2',
      borderWidth: 2.5,
      pointBackgroundColor: '#0891b2',
      pointRadius:  4,
      tension:      0.4,
      fill:         false,
    }]
  };

  const grossProfitOptions = {
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

  // ── Chart 3: MoM Growth — Diverging bar chart ──
  // Bars above zero = green (growth), below zero = red (decline)
  const momValues = chartData.map(r => r.mom_growth);

  const momChartData = {
    labels,
    datasets: [{
      data:            momValues,
      backgroundColor: momValues.map(v =>
        v === null ? '#d0d7de' : v >= 0 ? '#16a34a' : '#dc2626'
      ),
      borderRadius: 4,
      borderSkipped: false,
    }]
  };

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

  // ── Chart 4: Client Count — Area chart ──
  const clientChartData = {
    labels,
    datasets: [{
      data:            chartData.map(r => r.client_count),
      borderColor:     '#7c3aed',
      borderWidth:     2.5,
      pointBackgroundColor: '#7c3aed',
      pointRadius:     4,
      tension:         0.4,
      fill:            true,
      backgroundColor: 'rgba(124, 58, 237, 0.12)',
    }]
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

  // ── Empty state for charts ──
  const EmptyChart = ({ message }) => (
    <div style={{
      height: '180px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#57606a',
      fontSize: '0.875rem', textAlign: 'center'
    }}>
      {message}
    </div>
  );

  const hasData = monthlyData.length > 0;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0d1117', margin: 0 }}>
            Business Analytics
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#57606a', margin: '0.25rem 0 0' }}>
            Enter your monthly data to track performance and build your credibility score.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { setShowForm(!showForm); setMsg(''); }}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          {showForm ? 'Cancel' : '+ Add Monthly Data'}
        </button>
      </div>

      {msg && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '6px',
          marginBottom: '1rem', fontSize: '0.875rem',
          background: msg.startsWith('Success') ? '#dafbe1' : '#ffebe9',
          color:      msg.startsWith('Success') ? '#1a7f37'  : '#cf1322'
        }}>
          {msg}
        </div>
      )}

      {/* ── Monthly Entry Form ── */}
      {showForm && (
        <div className="business-card" style={{ marginBottom: '1.5rem' }}>
          <div className="business-card-header">
            <h2 className="business-card-title">Add / Edit Monthly Entry</h2>
            <span style={{ fontSize: '0.75rem', color: '#57606a' }}>
              Submitting an existing month will update it
            </span>
          </div>
          <div className="business-card-body">
            <form onSubmit={handleSave}>

              {/* Row 1: Month + Year */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
                  <input
                    type="number" name="year" value={form.year}
                    onChange={handleChange} style={inputStyle}
                    min="2000" max={new Date().getFullYear()}
                    required
                  />
                </div>
              </div>

              {/* Row 2: Revenue + Margin + Clients */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Monthly Revenue (₹)</label>
                  <input
                    type="number" name="revenue" value={form.revenue}
                    onChange={handleChange} style={inputStyle}
                    placeholder="e.g. 500000" min="0" step="any" required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Gross Profit Margin (%)</label>
                  <input
                    type="number" name="gross_profit_margin" value={form.gross_profit_margin}
                    onChange={handleChange} style={inputStyle}
                    placeholder="e.g. 42.5" min="0" max="100" step="any" required
                  />
                </div>
                <div>
                  <label style={labelStyle}>New Clients This Month</label>
                  <input
                    type="number" name="client_count" value={form.client_count}
                    onChange={handleChange} style={inputStyle}
                    placeholder="e.g. 8" min="0" required
                  />
                </div>
              </div>

              {/* Info note */}
              <p style={{
                fontSize: '0.75rem', color: '#57606a',
                background: '#f6f8fa', borderRadius: '6px',
                padding: '0.625rem 0.875rem', marginBottom: '1rem'
              }}>
                Gross profit will be calculated automatically as Revenue × Margin % and shown in the chart.
                You can enter up to 11 months of data.
              </p>

              <button type="submit" className="btn-primary" disabled={saving}
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.9375rem' }}>
                {saving ? 'Saving...' : 'Save Monthly Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Credibility Score Card ── */}
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

          {/* Big score + bar */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3.5rem', fontWeight: 700, color: scoreInfo.color, lineHeight: 1 }}>
              {score}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#57606a', marginTop: '0.25rem' }}>out of 100</div>
            <div style={{ margin: '1rem auto 0', maxWidth: '320px', background: '#eaeef2', borderRadius: '999px', height: '8px' }}>
              <div style={{
                width: `${score}%`, height: '100%',
                borderRadius: '999px', background: scoreInfo.color,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>

          {/* 4 component scores */}
          <div className="business-grid business-grid-4">
            {[
              { label: 'Profile',   value: credibilityScore.profile_score   || 0, max: 30,
                tip: 'Complete your profile fields' },
              { label: 'Analytics', value: credibilityScore.analytics_score || 0, max: 40,
                tip: '4 pts per month entered, max 10 months' },
              { label: 'Network',   value: credibilityScore.network_score   || 0, max: 15,
                tip: '3 pts per connection, max 5' },
              { label: 'Tenure',    value: credibilityScore.tenure_score    || 0, max: 15,
                tip: '1 pt per 15 days on platform' }
            ].map(({ label, value, max, tip }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0d1117' }}>{value}</div>
                <div style={{ fontSize: '0.75rem', color: '#57606a', fontWeight: 600 }}>{label} / {max}</div>
                <div style={{ marginTop: '0.375rem', background: '#eaeef2', borderRadius: '999px', height: '4px' }}>
                  <div style={{
                    width: `${(value / max) * 100}%`, height: '100%',
                    background: scoreInfo.color, borderRadius: '999px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#8c959f', marginTop: '0.375rem', lineHeight: 1.3 }}>
                  {tip}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Charts grid ── */}
      <div className="business-grid business-grid-2">

        {/* Chart 1: Revenue Trend — Bar */}
        <div className="business-card">
          <div className="business-card-header">
            <h2 className="business-card-title">Revenue Trend</h2>
            <span style={chartBadgeStyle('#2563eb')}>Bar chart</span>
          </div>
          <div className="business-card-body">
            {hasData ? (
              <div style={{ height: '200px' }}>
                <Bar data={revenueChartData} options={revenueOptions} />
              </div>
            ) : (
              <EmptyChart message="No data yet — add your first monthly entry above." />
            )}
          </div>
        </div>

        {/* Chart 2: Gross Profit Trend — Line */}
        <div className="business-card">
          <div className="business-card-header">
            <h2 className="business-card-title">Gross Profit Trend</h2>
            <span style={chartBadgeStyle('#0891b2')}>Line chart</span>
          </div>
          <div className="business-card-body">
            {hasData ? (
              <div style={{ height: '200px' }}>
                <Line data={grossProfitChartData} options={grossProfitOptions} />
              </div>
            ) : (
              <EmptyChart message="Gross profit is calculated from your revenue × margin." />
            )}
          </div>
        </div>

        {/* Chart 3: Month-on-Month Growth — Diverging Bar */}
        <div className="business-card">
          <div className="business-card-header">
            <h2 className="business-card-title">Month-on-Month Growth</h2>
            <span style={chartBadgeStyle('#16a34a')}>Diverging bar</span>
          </div>
          <div className="business-card-body">
            {hasData ? (
              <div style={{ height: '200px' }}>
                <Bar data={momChartData} options={momOptions} />
              </div>
            ) : (
              <EmptyChart message="Growth % is shown once you have 2 or more months of data." />
            )}
          </div>
        </div>

        {/* Chart 4: Client Count — Area */}
        <div className="business-card">
          <div className="business-card-header">
            <h2 className="business-card-title">New Clients Per Month</h2>
            <span style={chartBadgeStyle('#7c3aed')}>Area chart</span>
          </div>
          <div className="business-card-body">
            {hasData ? (
              <div style={{ height: '200px' }}>
                <Line data={clientChartData} options={clientOptions} />
              </div>
            ) : (
              <EmptyChart message="Client count shows how many new clients you acquired each month." />
            )}
          </div>
        </div>

      </div>

      {/* ── Data table — shows raw entries so user knows what's been entered ── */}
      {hasData && (
        <div className="business-card" style={{ marginTop: '1.5rem' }}>
          <div className="business-card-header">
            <h2 className="business-card-title">Monthly Data Entries</h2>
            <span style={{ fontSize: '0.75rem', color: '#57606a' }}>
              {monthlyData.length} / 11 months entered
            </span>
          </div>
          <div className="business-card-body" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f6f8fa', borderBottom: '1px solid #eaeef2' }}>
                    {['Month', 'Revenue', 'Gross Profit Margin', 'Gross Profit', 'Clients', 'MoM Growth'].map(h => (
                      <th key={h} style={{
                        padding: '0.75rem 1.25rem', textAlign: 'left',
                        fontSize: '0.75rem', fontWeight: 600,
                        color: '#57606a', textTransform: 'uppercase'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eaeef2' }}>
                      <td style={tdStyle}>{MONTHS[row.month - 1]} {row.year}</td>
                      <td style={tdStyle}>₹{Number(row.revenue).toLocaleString('en-IN')}</td>
                      <td style={tdStyle}>{row.gross_profit_margin}%</td>
                      <td style={tdStyle}>₹{Number(row.gross_profit).toLocaleString('en-IN')}</td>
                      <td style={tdStyle}>{row.client_count}</td>
                      <td style={tdStyle}>
                        {row.mom_growth === null ? (
                          <span style={{ color: '#8c959f', fontSize: '0.8125rem' }}>—</span>
                        ) : (
                          <span style={{
                            color: row.mom_growth >= 0 ? '#1a7f37' : '#cf1322',
                            fontWeight: 600, fontSize: '0.875rem'
                          }}>
                            {row.mom_growth >= 0 ? '+' : ''}{row.mom_growth}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ── Style helpers ──
const labelStyle = {
  display: 'block', fontSize: '0.75rem',
  fontWeight: 600, color: '#57606a',
  marginBottom: '0.375rem'
};

const inputStyle = {
  width: '100%', padding: '0.5rem 0.75rem',
  border: '1px solid #d0d7de', borderRadius: '6px',
  fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box', background: 'white'
};

const tdStyle = {
  padding: '0.875rem 1.25rem',
  fontSize: '0.875rem',
  color: '#0d1117'
};

const chartBadgeStyle = (color) => ({
  fontSize: '0.6875rem', fontWeight: 600,
  color: color, background: `${color}18`,
  padding: '0.125rem 0.5rem',
  borderRadius: '999px',
  border: `1px solid ${color}30`
});

export default Analytics;