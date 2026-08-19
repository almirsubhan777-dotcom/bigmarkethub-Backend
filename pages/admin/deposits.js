// pages/admin/deposits.js
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function Deposits() {
  const [deposits, setDeposits] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');

  async function load(status) {
    const res = await fetch('/api/admin/deposits?status=' + status);
    const data = await res.json();
    setDeposits(data.deposits || []);
  }

  useEffect(() => { load(statusFilter); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function decide(depositId, decision) {
    await fetch('/api/admin/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deposit_id: depositId, decision }),
    });
    load(statusFilter);
  }

  return (
    <AdminLayout title="Deposit Requests">
      <div style={{ marginBottom: 16 }}>
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button key={s} className={`btn ${statusFilter === s ? 'btn-approve' : 'btn-neutral'}`} onClick={() => setStatusFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {deposits.length === 0 ? (
        <div className="empty-state">No deposit requests here.</div>
      ) : (
        <table>
          <thead>
            <tr><th>User</th><th>Amount</th><th>Network</th><th>Address</th><th>Proof</th><th>Status</th><th>Requested</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {deposits.map((d) => (
              <tr key={d.id}>
                <td>{d.users?.username}<br /><small style={{ color: '#9aa0aa' }}>{d.users?.uid}</small></td>
                <td>${Number(d.amount).toFixed(2)}</td>
                <td>{d.network}</td>
                <td style={{ maxWidth: 180, wordBreak: 'break-all', fontSize: 11 }}>{d.deposit_address}</td>
                <td>{d.proof_screenshot_url ? <a href={d.proof_screenshot_url} target="_blank" rel="noreferrer">View</a> : '—'}</td>
                <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                <td>{new Date(d.created_at).toLocaleString()}</td>
                <td>
                  {d.status === 'pending' ? (
                    <>
                      <button className="btn btn-approve" onClick={() => decide(d.id, 'approved')}>Approve</button>
                      <button className="btn btn-reject" onClick={() => decide(d.id, 'rejected')}>Reject</button>
                    </>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
