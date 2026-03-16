import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

// Avatar color per business id
const avatarColor = (id) => {
  const colors = ['#2563eb','#16a34a','#7c3aed','#ca8a04','#dc2626','#0891b2'];
  return colors[(id || 0) % colors.length];
};

const Search = () => {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const navigate                = useNavigate();

  useEffect(() => { loadAllBusinesses(); }, []);

  const loadAllBusinesses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/search');
      const unique = Array.from(new Map((res.data || []).map(i => [i.id, i])).values());
      setResults(unique);
    } catch (err) {
      console.error('Failed to load businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) { loadAllBusinesses(); return; }
    setLoading(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
      const unique = Array.from(new Map((res.data || []).map(i => [i.id, i])).values());
      setResults(unique);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e, userId) => {
    e.stopPropagation(); // don't navigate when clicking Connect
    try {
      await api.post('/connections/send', { receiver_id: userId });
      setResults(prev => prev.map(r => r.id === userId ? { ...r, connection_status: 'pending' } : r));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send connection request.');
    }
  };

  return (
    <div>
      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text" value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by company name, industry, or location..."
            style={{
              flex: 1, padding: '0.6875rem 1rem',
              border: '1px solid #d0d7de', borderRadius: '8px',
              fontSize: '0.9375rem', outline: 'none',
              background: 'white'
            }}
          />
          <button type="submit" className="btn-primary"
            disabled={loading} style={{ padding: '0.6875rem 1.5rem' }}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Results count */}
      {!loading && results.length > 0 && (
        <p style={{ fontSize: '0.8125rem', color: '#57606a', marginBottom: '1rem' }}>
          {results.length} business{results.length !== 1 ? 'es' : ''} found
          {query && ` for "${query}"`}
        </p>
      )}

      {/* Results Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : results.length === 0 ? (
        <div className="business-card">
          <div className="business-card-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</div>
            <div style={{ fontWeight: 600, color: '#0d1117', marginBottom: '0.375rem' }}>
              {query ? 'No results found' : 'No businesses available'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#57606a' }}>
              {query ? 'Try different keywords' : 'Check back later'}
            </div>
          </div>
        </div>
      ) : (
        <div className="business-grid business-grid-3">
          {results.map(item => (
            <div
              key={item.id}
              className="business-card"
              onClick={() => navigate(`/profile/${item.id}`)}
              style={{ cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="business-card-body">
                {/* Company Header with Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0,
                    background: item.logo ? 'transparent' : avatarColor(item.id),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '1.125rem', fontWeight: 700,
                    overflow: 'hidden', border: '1px solid #eaeef2'
                  }}>
                    {item.logo
                      ? <img src={item.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : item.company_name?.charAt(0).toUpperCase()
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0d1117', margin: 0 }}>
                      {item.company_name}
                    </h3>
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {item.industry && (
                    <div style={{ fontSize: '0.8125rem', color: '#57606a' }}>
                      🏭 {item.industry}
                    </div>
                  )}
                  {item.location && (
                    <div style={{ fontSize: '0.8125rem', color: '#57606a' }}>
                      📍 {item.location}
                    </div>
                  )}
                  {item.company_description && (
                    <div style={{ fontSize: '0.8125rem', color: '#57606a', lineHeight: 1.5 }}>
                      {item.company_description.substring(0, 80)}
                      {item.company_description.length > 80 ? '...' : ''}
                    </div>
                  )}
                </div>

                {/* View Profile link */}
                <div style={{
                  fontSize: '0.75rem', color: '#2563eb', fontWeight: 500,
                  marginBottom: '0.75rem'
                }}>
                  View profile & analytics →
                </div>

                {/* Connect button */}
                {item.connection_status === 'connected' ? (
                  <div style={{
                    textAlign: 'center', padding: '0.5rem',
                    background: '#dcfce7', color: '#14532d',
                    borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600
                  }}>
                    ✓ Connected
                  </div>
                ) : item.connection_status === 'pending' ? (
                  <div style={{
                    textAlign: 'center', padding: '0.5rem',
                    background: '#fef9c3', color: '#713f12',
                    borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600
                  }}>
                    Request Pending
                  </div>
                ) : item.connection_status === 'received_request' ? (
                  <div style={{
                    textAlign: 'center', padding: '0.5rem',
                    background: '#dbeafe', color: '#1e3a8a',
                    borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600
                  }}>
                    Wants to Connect
                  </div>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={(e) => handleConnect(e, item.id)}
                    style={{ width: '100%', padding: '0.5rem' }}
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Search;