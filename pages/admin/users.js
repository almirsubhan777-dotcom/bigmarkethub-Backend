// pages/admin/users.js
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [adjustAmounts, setAdjustAmounts] = useState({});
  const [pwUserId, setPwUserId] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    const res = await fetch('/api/admin/users?' + params.toString());
    const data = await res.json();
    setUsers(data.users || []);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function post(body) {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function setStatus(userId, status) {
    await post({ user_id: userId, action: 'set_status', status });
    load();
  }

  async function adjustBalance(userId) {
    const amount = Number(adjustAmounts[userId] || 0);
    if (!amount) return;
    await post({ user_id: userId, action: 'adjust_balance', amount });
    setAdjustAmounts((s) => ({ ...s, [userId]: '' }));
    load();
  }

  async function deleteUser(userId, username) {
    if (!confirm(`Permanently delete "${username}" and all their records (deposits, withdrawals, KYC, history)?\n\nThis cannot be undone.`)) return;
    await post({ user_id: userId, action: 'delete' });
    load();
  }

  async function resetPassword() {
    const data = await post({ user_id: pwUserId, action: 'reset_password', new_password: newPw });
    if (data.error) { setNotice(data.error); return; }
    setNotice(`Password updated. Give the customer this password: ${newPw}`);
    setPwUserId(null);
    setNewPw('');
  }

  function clearFilters() {
    setSearch(''); setFromDate(''); setToDate('');
    setTimeout(load, 0);
  }

  return (
    <AdminLayout title="Users">
      <form onSubmit={(e) => { e.preventDefault(); load(); }} style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text" placeholder="Search username, email, or UID..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 240, margin: 0 }}
        />
        <span style={{ fontSize: 11.5, color: '#9aa0aa' }}>Joined between</span>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
          style={{ width: 150, margin: 0, padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.03)', color: '#fff', fontSize: 13 }} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
          style={{ width: 150, margin: 0, padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.03)', color: '#fff', fontSize: 13 }} />
        <button className="btn btn-approve" type="submit">Apply</button>
        <button className="btn btn-neutral" type="button" onClick={clearFilters}>Clear</button>
        <span style={{ fontSize: 12, color: '#9aa0aa', marginLeft: 'auto' }}>{users.length} found</span>
      </form>

      {notice && (
        <div style={{ background: 'rgba(45,212,167,.1)', border: '1px solid rgba(45,212,167,.3)', color: '#2DD4A7', padding: '11px 14px', borderRadius: 9, fontSize: 13, marginBottom: 14, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span>{notice}</span>
          <button onClick={() => setNotice('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {pwUserId && (
        <div style={{ background: '#14161c', border: '1px solid rgba(255,106,0,.3)', borderRadius: 12, padding: 18, marginBottom: 16, maxWidth: 420 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 4 }}>Set a new password</div>
          <div style={{ fontSize: 11.5, color: '#9aa0aa', marginBottom: 12 }}>
            Existing passwords are encrypted and cannot be read back — set a new one and share it with the customer.
          </div>
          <input type="text" placeholder="New password (min 8 characters)" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <button className="btn btn-approve" onClick={resetPassword}>Save Password</button>
          <button className="btn btn-neutral" onClick={() => { setPwUserId(null); setNewPw(''); }}>Cancel</button>
        </div>
      )}

      {users.length === 0 ? (
        <div className="empty-state">No users found.</div>
      ) : (
        <table>
          <thead>
            <tr><th>UID</th><th>Username</th><th>Email</th><th>Balance</th><th>KYC</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.uid}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>${Number(u.balance).toFixed(2)}</td>
                <td><span className={`badge badge-${u.kyc_status === 'verified' ? 'approved' : u.kyc_status === 'pending' ? 'pending' : 'rejected'}`}>{u.kyc_status}</span></td>
                <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  {u.status !== 'active' && <button className="btn btn-approve" onClick={() => setStatus(u.id, 'active')}>Activate</button>}
                  {u.status !== 'suspended' && <button className="btn btn-neutral" onClick={() => setStatus(u.id, 'suspended')}>Suspend</button>}
                  {u.status !== 'banned' && <button className="btn btn-reject" onClick={() => { if (confirm('Ban this user?')) setStatus(u.id, 'banned'); }}>Ban</button>}
                  <button className="btn btn-neutral" onClick={() => { setPwUserId(u.id); setNewPw(''); setNotice(''); }}>Password</button>
                  <button className="btn btn-reject" onClick={() => deleteUser(u.id, u.username)}>Delete</button>
                  <div style={{ display: 'inline-flex', gap: 4, marginLeft: 6 }}>
                    <input
                      type="text" placeholder="e.g. 50 or -20" style={{ width: 100, margin: 0, display: 'inline-block' }}
                      value={adjustAmounts[u.id] || ''}
                      onChange={(e) => setAdjustAmounts((s) => ({ ...s, [u.id]: e.target.value }))}
                    />
                    <button className="btn btn-approve" onClick={() => adjustBalance(u.id)}>Apply</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
