// pages/admin/wallets.js
import { useState, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAutoRefresh, RefreshBar } from '../../components/RefreshBar';

export default function Wallets() {
  const [wallets, setWallets] = useState([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/wallets');
    const data = await res.json();
    setWallets(data.wallets || []);
  }, []);

  const { refreshing, lastUpdated, refreshNow } = useAutoRefresh(load, []);

  return (
    <AdminLayout title="Customer Saved Wallets">
      <RefreshBar refreshing={refreshing} lastUpdated={lastUpdated} onRefresh={refreshNow} />

      {wallets.length === 0 ? (
        <div className="empty-state">No wallets saved by customers yet.</div>
      ) : (
        <table>
          <thead>
            <tr><th>User</th><th>Wallet Name</th><th>Network</th><th>Address</th><th>Holder Name</th><th>Saved</th></tr>
          </thead>
          <tbody>
            {wallets.map((w) => (
              <tr key={w.id}>
                <td>{w.users?.username}<br /><small style={{ color: '#9aa0aa' }}>{w.users?.uid}</small></td>
                <td>{w.wallet_name || '—'}</td>
                <td>{w.network}</td>
                <td style={{ maxWidth: 220, wordBreak: 'break-all', fontSize: 11 }}>{w.wallet_address}</td>
                <td>{w.holder_name}</td>
                <td>{new Date(w.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
