// pages/admin/distributors.js
import { useState, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAutoRefresh, RefreshBar } from '../../components/RefreshBar';

export default function Distributors() {
  const [distributors, setDistributors] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', password: '', full_name: '', initial_credit: '' });
  const [creating, setCreating] = useState(false);
  const [creditAmounts, setCreditAmounts] = useState({});

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/distributors');
    const data = await res.json();
    if (data.error) { setError(data.error); return; }
    setDistributors(data.distributors || []);
  }, []);

  const { refreshing, lastUpdated, refreshNow } = useAutoRefresh(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/distributors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({ username: '', password: '', full_name: '', initial_credit: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function addCredit(distributorId) {
    const amount = Number(creditAmounts[distributorId] || 0);
    if (!amount) return;
    await fetch('/api/admin/distributors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_credit', distributor_id: distributorId, amount }),
    });
    setCreditAmounts((s) => ({ ...s, [distributorId]: '' }));
    load();
  }

  async function removeDistributor(distributorId) {
    if (!confirm('Remove this agent account? This cannot be undone.')) return;
    await fetch('/api/admin/distributors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', distributor_id: distributorId }),
    });
    load();
  }

  return (
    <AdminLayout title="Distributors / Agents">
      <RefreshBar refreshing={refreshing} lastUpdated={lastUpdated} onRefresh={refreshNow} />

      {error && <div style={{ background: 'rgba(255,71,71,.12)', border: '1px solid rgba(255,71,71,.3)', color: '#ff6b6b', padding: '10px 14px', borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>{error}</div>}

      <div style={{ background: '#14161c', borderRadius: 12, padding: 20, marginBottom: 24, maxWidth: 480 }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Create New Agent</div>
        <form onSubmit={handleCreate}>
          <input type="text" placeholder="Username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input type="password" placeholder="Password (min 6 chars)" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input type="text" placeholder="Full name (optional)" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input type="text" placeholder="Initial credit pool, e.g. 500" value={form.initial_credit} onChange={(e) => setForm({ ...form, initial_credit: e.target.value })} />
          <button className="btn btn-approve" type="submit" disabled={creating} style={{ width: '100%', padding: '10px', textAlign: 'center' }}>
            {creating ? 'Creating…' : 'Create Agent Account'}
          </button>
        </form>
      </div>

      {distributors.length === 0 ? (
        <div className="empty-state">No agents created yet.</div>
      ) : (
        <table>
          <thead>
            <tr><th>Username</th><th>Full Name</th><th>Credit Pool</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {distributors.map((d) => (
              <tr key={d.id}>
                <td>{d.username}</td>
                <td>{d.full_name || '—'}</td>
                <td style={{ fontWeight: 800, color: '#FF6A00' }}>${Number(d.credit_balance).toFixed(2)}</td>
                <td>{new Date(d.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'inline-flex', gap: 4 }}>
                    <input
                      type="text" placeholder="Add credit" style={{ width: 100, margin: 0 }}
                      value={creditAmounts[d.id] || ''}
                      onChange={(e) => setCreditAmounts((s) => ({ ...s, [d.id]: e.target.value }))}
                    />
                    <button className="btn btn-approve" onClick={() => addCredit(d.id)}>Add</button>
                    <button className="btn btn-reject" onClick={() => removeDistributor(d.id)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ color: '#9aa0aa', fontSize: 12, marginTop: 20 }}>
        Agents log in at the same <code>/admin/login</code> page with their own username/password.
        They can only recharge customer accounts, up to the credit pool you allocate them here —
        they cannot see your full user list, deposits, withdrawals, or other agents.
      </p>
    </AdminLayout>
  );
}
