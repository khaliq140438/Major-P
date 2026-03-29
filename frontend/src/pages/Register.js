import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Building } from 'lucide-react';
import './Login.css';

const Register = () => {
  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    gst_number: '',
    cin_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Frontend validations
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    if (formData.gst_number.length !== 15) {
      setError('GST number must be exactly 15 characters.');
      setLoading(false);
      return;
    }

    if (formData.cin_number.length !== 21) {
      setError('CIN number must be exactly 21 characters.');
      setLoading(false);
      return;
    }

    try {
      const api = (await import('../api')).default;
      await api.post('/auth/register', {
        company_name: formData.company_name,
        email:        formData.email,
        password:     formData.password,
        phone:        formData.phone,
        gst_number:   formData.gst_number.toUpperCase(),
        cin_number:   formData.cin_number.toUpperCase()
      });

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    }
  };

  // ── Success screen ──
  if (success) {
    return (
      <div className="login-bg">
        <div className="login-container" style={{ maxWidth: '480px' }}>
          <div className="login-brand">Business Connect</div>
          <div style={{
            background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
            borderRadius: '12px', padding: '2rem',
            textAlign: 'center', marginBottom: '1.5rem'
          }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <CheckCircle size={48} color="#059669" />
            </div>
            <h2 style={{ color: '#065f46', marginBottom: '1rem' }}>Registration Submitted!</h2>
            <p style={{ color: '#047857', margin: 0, lineHeight: 1.6 }}>
              Your registration is under admin review. You will be able to log in
              once your account is approved — typically within 24–48 hours.
            </p>
          </div>
          <Link
            to="/login"
            style={{
              display: 'block', textAlign: 'center',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: 'white', textDecoration: 'none',
              padding: '0.8125rem', borderRadius: '10px',
              fontFamily: 'Sora, sans-serif', fontWeight: 700,
              fontSize: '0.9375rem',
              boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
            }}
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Registration form ──
  return (
    <div className="login-bg">
      <div
        className="login-container"
        style={{ maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="login-brand">Business Connect</div>
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Create Account</h2>
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
            Register your business to join the network
          </p>

          {/* ── Basic Info ── */}
          <div className="login-field">
            <label>Company Name *</label>
            <input
              type="text" name="company_name"
              value={formData.company_name} onChange={handleChange}
              required placeholder="Your registered company name"
            />
          </div>

          <div className="login-field">
            <label>Email *</label>
            <input
              type="email" name="email"
              value={formData.email} onChange={handleChange}
              required placeholder="company@example.com"
            />
          </div>

          <div className="login-field">
            <label>Phone</label>
            <input
              type="tel" name="phone"
              value={formData.phone} onChange={handleChange}
              placeholder="+91 98765 43210"
            />
          </div>

          {/* ── Passwords ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="login-field">
              <label>Password *</label>
              <input
                type="password" name="password"
                value={formData.password} onChange={handleChange}
                required placeholder="Min. 8 characters"
              />
            </div>
            <div className="login-field">
              <label>Confirm Password *</label>
              <input
                type="password" name="confirmPassword"
                value={formData.confirmPassword} onChange={handleChange}
                required placeholder="Re-enter password"
              />
            </div>
          </div>

          {/* ── Business Credentials ── */}
          <div style={{
            background: '#eff6ff', borderRadius: '8px',
            padding: '1rem', marginBottom: '0.5rem'
          }}>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#1e40af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Building size={16} /> Business Credentials — Required for verification
            </p>

            <div className="login-field" style={{ marginBottom: '0.75rem' }}>
              <label>GST Number * <span style={{ fontWeight: 400, color: '#6b7280' }}>(15 characters)</span></label>
              <input
                type="text" name="gst_number"
                value={formData.gst_number} onChange={handleChange}
                required placeholder="e.g. 29ABCDE1234F1Z5"
                maxLength={15}
                style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                {formData.gst_number.length}/15
              </span>
            </div>

            <div className="login-field" style={{ marginBottom: 0 }}>
              <label>CIN Number * <span style={{ fontWeight: 400, color: '#6b7280' }}>(21 characters)</span></label>
              <input
                type="text" name="cin_number"
                value={formData.cin_number} onChange={handleChange}
                required placeholder="e.g. U72200TN2021PTC123456"
                maxLength={21}
                style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                {formData.cin_number.length}/21
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1rem' }}>
            * Industry, location, website and company description can be added after approval from your profile page.
          </p>

          {error && <div className="login-error">{error}</div>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Register'}
          </button>

          <div className="login-links">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;