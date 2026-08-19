// pages/admin/withdrawals.js
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');

  async function load(status) {
    const res = await fetch('/api/admin/withdrawals?status=' + status);
    const data = await res.json();
    setWithdrawals(data.withdrawals || []);
  }

  useEffect(() => { load(statusFilter); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function decide(withdrawalId, decision) {
    if (decision === 'approved' && !confirm('Confirm: funds have been sent manually to this wallet address?')) return;
    await fetch('/api/admin/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ withdrawal_id: withdrawalId, decision }),
    });
    load(statusFilter);
  }

  return (
    <AdminLayout title="Withdrawal Requests">
      <div style={{ marginBottom: 16 }}>
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button key={s} className={`btn ${statusFilter === s ? 'btn-approve' : 'btn-neutral'}`} onClick={() => setStatusFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {withdrawals.length === 0 ? (
        <div className="empty-state">No withdrawal requests here.</div>
      ) : (
        <table>
          <thead>
            <tr><th>User</th><th>Amount</th><th>Network</th><th>Wallet Address</th><th>Status</th><th>Requested</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {withdrawals.map((w) => (
              <tr key={w.id}>
                <td>{w.users?.username}<br /><small style={{ color: '#9aa0aa' }}>{w.users?.uid}</small></td>
                <td>${Number(w.amount).toFixed(2)}</td>
                <td>{w.network}</td>
                <td style={{ maxWidth: 200, wordBreak: 'break-all', fontSize: 11 }}>{w.wallet_address}</td>
                <td><span className={`badge badge-${w.status}`}>{w.status}</span></td>
                <td>{new Date(w.created_at).toLocaleString()}</td>
                <td>
                  {w.status === 'pending' ? (
                    <>
                      <button className="btn btn-approve" onClick={() => decide(w.id, 'approved')}>Approve (Paid)</button>
                      <button className="btn btn-reject" onClick={() => decide(w.id, 'rejected')}>Reject (Refund)</button>
                    </>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ color: '#9aa0aa', fontSize: 12, marginTop: 16 }}>
        Note: &quot;Approve&quot; means <b>you have manually sent the crypto</b> to the user&apos;s wallet address
        outside this system, then marked it approved for record-keeping. This system does not move real funds automatically.
      </p>
    </AdminLayout>
  );
}
