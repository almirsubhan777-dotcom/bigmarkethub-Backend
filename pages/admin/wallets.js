// pages/admin/wallets.js
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function Wallets() {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    fetch('/api/admin/wallets')
      .then((r) => r.json())
      .then((data) => setWallets(data.wallets || []));
  }, []);

  return (
    <AdminLayout title="Customer Saved Wallets">
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
