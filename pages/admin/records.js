// pages/admin/records.js
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

const TYPES = ['all', 'deposit', 'withdrawal', 'kyc', 'task', 'referral_bonus', 'admin_adjustment'];

export default function Records() {
  const [records, setRecords] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetch('/api/admin/records?type=' + typeFilter)
      .then((r) => r.json())
      .then((data) => setRecords(data.records || []));
  }, [typeFilter]);

  return (
    <AdminLayout title="All Records">
      <div style={{ marginBottom: 16 }}>
        {TYPES.map((t) => (
          <button key={t} className={`btn ${typeFilter === t ? 'btn-approve' : 'btn-neutral'}`} onClick={() => setTypeFilter(t)}>
            {t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {records.length === 0 ? (
        <div className="empty-state">No activity recorded yet.</div>
      ) : (
        <table>
          <thead>
            <tr><th>User</th><th>Type</th><th>Amount</th><th>Status</th><th>Description</th><th>Date</th></tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.users?.username}<br /><small style={{ color: '#9aa0aa' }}>{r.users?.uid}</small></td>
                <td>{r.type}</td>
                <td>{r.amount != 0 ? `$${Number(r.amount).toFixed(2)}` : '—'}</td>
                <td>{r.status ? <span className={`badge badge-${r.status}`}>{r.status}</span> : '—'}</td>
                <td style={{ maxWidth: 320 }}>{r.description}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
