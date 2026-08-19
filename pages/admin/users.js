// pages/admin/users.js
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [adjustAmounts, setAdjustAmounts] = useState({});

  async function load() {
    const res = await fetch('/api/admin/users?q=' + encodeURIComponent(search));
    const data = await res.json();
    setUsers(data.users || []);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(userId, status) {
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, action: 'set_status', status }),
    });
    load();
  }

  async function adjustBalance(userId) {
    const amount = Number(adjustAmounts[userId] || 0);
    if (!amount) return;
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, action: 'adjust_balance', amount }),
    });
    setAdjustAmounts((s) => ({ ...s, [userId]: '' }));
    load();
  }

  return (
    <AdminLayout title="Users">
      <form onSubmit={(e) => { e.preventDefault(); load(); }} style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <input
          type="text" placeholder="Search by username, email, or UID..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320, margin: 0 }}
        />
        <button className="btn btn-neutral" type="submit">Search</button>
      </form>

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
