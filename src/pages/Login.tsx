import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

function ShamrockIcon() {
  return (
    <svg width="52" height="60" viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="22" r="21" fill="#9b6ab2" />
      <circle cx="27" cy="52" r="21" fill="#9b6ab2" />
      <circle cx="73" cy="52" r="21" fill="#9b6ab2" />
      <ellipse cx="50" cy="42" rx="15" ry="15" fill="#9b6ab2" />
      <path d="M50 62 Q48 78 44 94" stroke="#9b6ab2" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const res = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      localStorage.setItem('token', res.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <ShamrockIcon />
          <h2 style={{ marginTop: '1rem', fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(135deg, #c4aaf0, #9b6ab2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.9rem' }}>Sign in to continue tracking.</p>
        </div>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn" style={{ width: '100%', marginTop: '1rem' }}>
            Sign In
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}<Link to="/register" style={{ color: '#c4aaf0', textDecoration: 'none', fontWeight: 500 }}>Register here</Link>
        </p>
      </div>
    </div>
  );
}
