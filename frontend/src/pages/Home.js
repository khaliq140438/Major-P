import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Link as LinkIcon, BarChart2, MessageSquare, ChevronRight, Lock } from 'lucide-react';
import './Login.css';

const Home = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 60%, #0d1117 100%)',
      display: 'flex', flexDirection: 'column'
    }}>

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.25rem 3rem', borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '0.5px' }}>
          Business Connect
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/login" style={{
            padding: '0.5rem 1.25rem', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white', textDecoration: 'none',
            fontSize: '0.9375rem', fontWeight: 500,
            transition: 'all 0.15s'
          }}>
            Sign In
          </Link>
          <Link to="/register" style={{
            padding: '0.5rem 1.25rem', borderRadius: '8px',
            background: 'white', color: '#1e3c72',
            textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 700
          }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '4rem 2rem', textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '999px', padding: '0.375rem 1rem',
          fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)',
          fontWeight: 500, marginBottom: '2rem', letterSpacing: '0.5px'
        }}>
          <Lock size={14} /> Admin-verified businesses only
        </div>

        <h1 style={{
          fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
          fontWeight: 800, color: 'white', lineHeight: 1.15,
          maxWidth: '720px', marginBottom: '1.5rem'
        }}>
          The trusted network for <span style={{ color: '#60a5fa' }}>serious businesses</span>
        </h1>

        <p style={{
          fontSize: '1.125rem', color: 'rgba(255,255,255,0.75)',
          maxWidth: '560px', lineHeight: 1.7, marginBottom: '2.5rem'
        }}>
          Connect with verified businesses, collaborate in real-time, and showcase your
          credibility with data-backed analytics — all in one platform.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/register" style={{
            padding: '0.875rem 2rem', borderRadius: '10px',
            background: 'white', color: '#1e3c72',
            textDecoration: 'none', fontSize: '1rem', fontWeight: 700,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            Register Your Business
          </Link>
          <Link to="/login" style={{
            padding: '0.875rem 2rem', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.4)',
            color: 'white', textDecoration: 'none',
            fontSize: '1rem', fontWeight: 500,
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
          }}>
            Sign In <ChevronRight size={18} />
          </Link>
        </div>

        {/* ── Features ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem', marginTop: '5rem', maxWidth: '900px', width: '100%'
        }}>
          {[
            { icon: <ShieldCheck size={28} color="#60a5fa" />, title: 'Admin Verified',   desc: 'Every business is manually reviewed before joining the platform' },
            { icon: <LinkIcon size={28} color="#34d399" />, title: 'Smart Networking', desc: 'Connect and message businesses in your industry instantly' },
            { icon: <BarChart2 size={28} color="#fcd34d" />, title: 'Credibility Score',desc: 'Showcase your business strength with a transparent analytics score' },
            { icon: <MessageSquare size={28} color="#a78bfa" />, title: 'Real-time Chat',   desc: 'Communicate with partners via live WebSocket messaging' }
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px', padding: '1.5rem',
              textAlign: 'left'
            }}>
              <div style={{ marginBottom: '1rem' }}>{icon}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
                {title}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
                {desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        textAlign: 'center', padding: '1.5rem',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)'
      }}>
        © 2024 Business Connect — B2B Networking Platform
      </div>
    </div>
  );
};

export default Home;