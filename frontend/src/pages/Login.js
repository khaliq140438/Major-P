import React, { useState } from 'react';
import { useAuth } from '../auth';
import { useNavigate } from 'react-router-dom'; // ← ADD
import './Login.css';

const Login = () => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const { login: authLogin } = useAuth();
  const navigate = useNavigate(); // ← ADD

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const api = (await import('../api')).default;
      const res = await api.post('/auth/login', { email, password });

      const user = res.data.user;
      authLogin(user);

      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }

    } catch (err) {
      setError(
        err.response?.data?.message || 'Invalid credentials'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-container">
        <div className="login-brand">Business Connect</div>
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Sign In</h2>
          <div className="login-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="login-links">
            <a href="/register">Register your business</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;