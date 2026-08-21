// pages/admin/settings.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';

export default function Settings() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/change_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus({ type: 'success', message: 'Password changed. Redirecting to login…' });
      setTimeout(() => router.push('/admin/login'), 1800);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Settings">
      <div style={{ background: '#14161c', borderRadius: 12, padding: 22, maxWidth: 420 }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Change Your Password</div>
        <div style={{ fontSize: 11.5, color: '#9aa0aa', marginBottom: 16 }}>
          You&apos;ll be signed out of all devices afterwards and will need to log in again.
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, color: '#9aa0aa', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Current Password</label>
          <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <label style={{ fontSize: 11, color: '#9aa0aa', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>New Password</label>
          <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
          <label style={{ fontSize: 11, color: '#9aa0aa', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Confirm New Password</label>
          <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <button className="btn btn-approve" type="submit" disabled={saving} style={{ width: '100%', padding: 11, textAlign: 'center', marginTop: 6 }}>
            {saving ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>

      {status && (
        <div style={{
          marginTop: 16, maxWidth: 420, padding: '12px 16px', borderRadius: 10, fontSize: 13,
          background: status.type === 'success' ? 'rgba(45,212,167,.1)' : 'rgba(255,71,71,.1)',
          border: `1px solid ${status.type === 'success' ? 'rgba(45,212,167,.3)' : 'rgba(255,71,71,.3)'}`,
          color: status.type === 'success' ? '#2DD4A7' : '#ff6b6b',
        }}>
          {status.message}
        </div>
      )}

      <div style={{ background: '#14161c', borderRadius: 12, padding: 20, maxWidth: 560, marginTop: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>About customer passwords</div>
        <div style={{ fontSize: 12, color: '#9aa0aa', lineHeight: 1.7 }}>
          Customer passwords are stored encrypted (hashed) and cannot be viewed by anyone — including you.
          This is deliberate: even if the database were ever exposed, nobody could read them.
          <br /><br />
          If a customer forgets their password, open <b>Users</b>, click <b>Password</b> next to their account,
          set a new one, and share it with them. They can change it themselves afterwards.
        </div>
      </div>
    </AdminLayout>
  );
}
