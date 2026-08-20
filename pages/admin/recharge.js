// pages/admin/recharge.js
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function Recharge() {
  const [adminInfo, setAdminInfo] = useState(null);
  const [identifier, setIdentifier] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message }
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);

  function loadMe() {
    fetch('/api/admin/me').then((r) => r.json()).then((data) => { if (data.admin) setAdminInfo(data.admin); });
  }

  useEffect(() => { loadMe(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/recharge_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus({ type: 'success', message: data.message });
      setHistory((h) => [{ identifier, amount: Number(amount), time: new Date().toLocaleTimeString() }, ...h].slice(0, 10));
      setIdentifier('');
      setAmount('');
      loadMe(); // refresh credit pool display
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const isDistributor = adminInfo?.role === 'distributor';

  return (
    <AdminLayout title="Recharge Customer">
      {isDistributor && adminInfo && (
        <div style={{ background: 'linear-gradient(90deg, rgba(255,106,0,.12), rgba(255,162,58,.06))', border: '1px solid rgba(255,106,0,.3)', borderRadius: 12, padding: 18, marginBottom: 22, maxWidth: 480 }}>
          <div style={{ fontSize: 11, color: '#9aa0aa', textTransform: 'uppercase', marginBottom: 6 }}>Your Available Credit Pool</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#FF6A00' }}>${Number(adminInfo.credit_balance).toFixed(2)}</div>
          <div style={{ fontSize: 11.5, color: '#9aa0aa', marginTop: 6 }}>Every recharge you send is deducted from this pool. Contact the super admin to top it up.</div>
        </div>
      )}

      <div style={{ background: '#14161c', borderRadius: 12, padding: 22, maxWidth: 460 }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Add Funds to a Customer</div>
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, color: '#9aa0aa', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Customer UID or Username</label>
          <input type="text" placeholder="e.g. GT-4821-XK9P or johndoe" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          <label style={{ fontSize: 11, color: '#9aa0aa', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Amount (USDT)</label>
          <input type="number" step="0.01" min="0.01" placeholder="e.g. 50.00" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button className="btn btn-approve" type="submit" disabled={submitting} style={{ width: '100%', padding: '11px', textAlign: 'center', marginTop: 6 }}>
            {submitting ? 'Processing…' : 'Recharge Customer'}
          </button>
        </form>
      </div>

      {status && (
        <div style={{
          marginTop: 16, maxWidth: 460, padding: '12px 16px', borderRadius: 10, fontSize: 13,
          background: status.type === 'success' ? 'rgba(45,212,167,.1)' : 'rgba(255,71,71,.1)',
          border: `1px solid ${status.type === 'success' ? 'rgba(45,212,167,.3)' : 'rgba(255,71,71,.3)'}`,
          color: status.type === 'success' ? '#2DD4A7' : '#ff6b6b',
        }}>
          {status.message}
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 26, maxWidth: 460 }}>
          <div style={{ fontSize: 12, color: '#9aa0aa', marginBottom: 8, textTransform: 'uppercase' }}>Recent (this session)</div>
          {history.map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.06)', fontSize: 12.5 }}>
              <span>{h.identifier}</span>
              <span style={{ color: '#2DD4A7', fontWeight: 700 }}>+${h.amount.toFixed(2)}</span>
              <span style={{ color: '#9aa0aa' }}>{h.time}</span>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
