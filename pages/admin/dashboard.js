// pages/admin/dashboard.js
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '../../components/AdminLayout';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setErr(data.error); return; }
        setStats(data.stats);
      })
      .catch(() => setErr('Could not load dashboard'));
  }, []);

  const cardStyle = { background: '#14161c', borderRadius: 12, padding: 18, textDecoration: 'none', color: '#fff', display: 'block' };
  const labelStyle = { fontSize: 11, color: '#9aa0aa', textTransform: 'uppercase', marginBottom: 8 };
  const valueStyle = { fontSize: 24, fontWeight: 800, color: '#FF6A00' };

  return (
    <AdminLayout title="Dashboard">
      {err && <div className="empty-state">{err} — make sure you're logged in.</div>}
      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginBottom: 24 }}>
            <Link href="/admin/users" style={cardStyle}>
              <div style={labelStyle}>Total Users</div>
              <div style={{ ...valueStyle, color: '#fff' }}>{stats.totalUsers}</div>
            </Link>
            <Link href="/admin/deposits" style={cardStyle}>
              <div style={labelStyle}>Pending Deposits</div>
              <div style={valueStyle}>{stats.pendingDeposits}</div>
            </Link>
            <Link href="/admin/withdrawals" style={cardStyle}>
              <div style={labelStyle}>Pending Withdrawals</div>
              <div style={valueStyle}>{stats.pendingWithdrawals}</div>
            </Link>
            <Link href="/admin/kyc" style={cardStyle}>
              <div style={labelStyle}>Pending KYC</div>
              <div style={valueStyle}>{stats.pendingKyc}</div>
            </Link>
            <Link href="/admin/support" style={cardStyle}>
              <div style={labelStyle}>Open Support Tickets</div>
              <div style={valueStyle}>{stats.openTickets}</div>
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={cardStyle}>
              <div style={labelStyle}>Total Approved Deposits</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>${stats.totalApprovedDeposits.toFixed(2)}</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Total Approved Withdrawals</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>${stats.totalApprovedWithdrawals.toFixed(2)}</div>
            </div>
          </div>
        </>
      )}
      <p style={{ color: '#9aa0aa', fontSize: 12.5, marginTop: 20 }}>
        Use the sidebar to manage users, review deposit/withdrawal requests, approve KYC, and reply to support chats.
      </p>
    </AdminLayout>
  );
}
