// pages/admin/records.js
import { useState, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAutoRefresh, RefreshBar } from '../../components/RefreshBar';

const TYPES = ['all', 'signup', 'deposit', 'withdrawal', 'admin_adjustment', 'task', 'referral_bonus', 'kyc'];

const TYPE_LABELS = {
  all: 'All',
  signup: 'Signups',
  deposit: 'Deposits',
  withdrawal: 'Withdrawals',
  admin_adjustment: 'Recharges',
  task: 'Tasks',
  referral_bonus: 'Referrals',
  kyc: 'KYC',
};

export default function Records() {
  const [records, setRecords] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams({ type: typeFilter });
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    const res = await fetch('/api/admin/records?' + params.toString());
    const data = await res.json();
    setRecords(data.records || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, fromDate, toDate]);

  const { refreshing, lastUpdated, refreshNow } = useAutoRefresh(load, [typeFilter, fromDate, toDate]);

  function thisMonth() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    setFromDate(first.toISOString().slice(0, 10));
    setToDate(now.toISOString().slice(0, 10));
  }

  const total = records.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <AdminLayout title="All Records">
      <RefreshBar refreshing={refreshing} lastUpdated={lastUpdated} onRefresh={refreshNow} />

      <div style={{ marginBottom: 14 }}>
        {TYPES.map((t) => (
          <button key={t} className={`btn ${typeFilter === t ? 'btn-approve' : 'btn-neutral'}`} onClick={() => setTypeFilter(t)}>
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 18, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, color: '#9aa0aa' }}>Between</span>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
          style={{ width: 150, margin: 0, padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.03)', color: '#fff', fontSize: 13 }} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
          style={{ width: 150, margin: 0, padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.03)', color: '#fff', fontSize: 13 }} />
        <button className="btn btn-approve" onClick={load}>Apply</button>
        <button className="btn btn-neutral" onClick={thisMonth}>This Month</button>
        <button className="btn btn-neutral" onClick={() => { setFromDate(''); setToDate(''); setTimeout(load, 0); }}>Clear</button>
        <span style={{ fontSize: 12, color: '#9aa0aa', marginLeft: 'auto' }}>
          {records.length} found{total > 0 ? ` · $${total.toFixed(2)} total` : ''}
        </span>
      </div>

      {records.length === 0 ? (
        <div className="empty-state">No activity recorded for this filter.</div>
      ) : (
        <table>
          <thead>
            <tr><th>User</th><th>Type</th><th>Amount</th><th>Status</th><th>Description</th><th>Date</th></tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.users?.username}<br /><small style={{ color: '#9aa0aa' }}>{r.users?.uid}</small></td>
                <td>{TYPE_LABELS[r.type] || r.type}</td>
                <td>{Number(r.amount) !== 0 ? `$${Number(r.amount).toFixed(2)}` : '—'}</td>
                <td>{r.status ? <span className={`badge badge-${r.status === 'completed' ? 'approved' : r.status}`}>{r.status}</span> : '—'}</td>
                <td style={{ maxWidth: 320, whiteSpace: 'normal' }}>{r.description}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
