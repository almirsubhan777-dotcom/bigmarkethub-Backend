// pages/admin/login.js
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      router.push('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0d12', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: 340, background: '#14161c', borderRadius: 16, padding: 32, color: '#fff' }}>
        <h1 style={{ fontSize: 18, margin: '0 0 4px' }}>Admin Panel</h1>
        <p style={{ color: '#9aa0aa', fontSize: 12.5, margin: '0 0 20px' }}>Big Market Hub — sign in to manage the platform.</p>
        {error && (
          <div style={{ background: 'rgba(255,71,71,.12)', border: '1px solid rgba(255,71,71,.3)', color: '#ff6b6b', padding: '10px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, color: '#9aa0aa', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Username</label>
          <input
            type="text" required autoFocus value={username} onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.03)', color: '#fff', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
          />
          <label style={{ fontSize: 11, color: '#9aa0aa', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Password</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.03)', color: '#fff', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
          />
          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#FF6A00,#FFA23A)', color: '#fff', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
