// pages/admin/kyc.js
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function Kyc() {
  const [kycs, setKycs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [notes, setNotes] = useState({});

  async function load() {
    const params = new URLSearchParams({ status: statusFilter });
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    const res = await fetch('/api/admin/kyc?' + params.toString());
    const data = await res.json();
    setKycs(data.kycs || []);
  }

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function decide(kycId, decision) {
    await fetch('/api/admin/kyc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kyc_id: kycId, decision, notes: notes[kycId] || '' }),
    });
    load();
  }

  async function deleteKyc(kycId, username) {
    if (!confirm(`Delete ${username}'s verification record and remove their uploaded ID images from storage?\n\nThis cannot be undone.`)) return;
    await fetch('/api/admin/kyc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kyc_id: kycId, action: 'delete' }),
    });
    load();
  }

  return (
    <AdminLayout title="Identity Verification (KYC)">
      <div style={{ marginBottom: 14 }}>
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button key={s} className={`btn ${statusFilter === s ? 'btn-approve' : 'btn-neutral'}`} onClick={() => setStatusFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 18, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, color: '#9aa0aa' }}>Submitted between</span>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
          style={{ width: 150, margin: 0, padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.03)', color: '#fff', fontSize: 13 }} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
          style={{ width: 150, margin: 0, padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.03)', color: '#fff', fontSize: 13 }} />
        <button className="btn btn-approve" onClick={load}>Apply</button>
        <button className="btn btn-neutral" onClick={() => { setFromDate(''); setToDate(''); setTimeout(load, 0); }}>Clear</button>
        <span style={{ fontSize: 12, color: '#9aa0aa', marginLeft: 'auto' }}>{kycs.length} found</span>
      </div>

      {kycs.length === 0 ? (
        <div className="empty-state">No verification requests here.</div>
      ) : (
        kycs.map((k) => (
          <div key={k.id} style={{ background: '#14161c', borderRadius: 12, padding: 18, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
              <div>
                <b>{k.users?.username}</b>
                <span style={{ color: '#9aa0aa', fontSize: 12 }}> — {k.users?.uid} — {k.users?.email}</span><br />
                <span style={{ fontSize: 12, color: '#9aa0aa' }}>Document: {k.document_type} · Submitted: {new Date(k.submitted_at).toLocaleString()}</span><br />
                <span style={{ fontSize: 12, color: '#9aa0aa' }}>Address: {k.address}</span>
              </div>
              <span className={`badge badge-${k.status}`}>{k.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <a href={k.front_id_url} target="_blank" rel="noreferrer" className="btn btn-neutral">Front ID</a>
              <a href={k.back_id_url} target="_blank" rel="noreferrer" className="btn btn-neutral">Back ID</a>
              <a href={k.selfie_url} target="_blank" rel="noreferrer" className="btn btn-neutral">Selfie</a>
            </div>
            {k.status === 'pending' ? (
              <div>
                <textarea
                  placeholder="Optional admin notes..." rows={2}
                  value={notes[k.id] || ''}
                  onChange={(e) => setNotes((s) => ({ ...s, [k.id]: e.target.value }))}
                />
                <button className="btn btn-approve" onClick={() => decide(k.id, 'approved')}>Approve</button>
                <button className="btn btn-reject" onClick={() => decide(k.id, 'rejected')}>Reject</button>
                <button className="btn btn-neutral" onClick={() => deleteKyc(k.id, k.users?.username)}>Delete</button>
              </div>
            ) : (
              <div>
                {k.admin_notes && <div style={{ fontSize: 12, color: '#9aa0aa', marginBottom: 10 }}>Notes: {k.admin_notes}</div>}
                <button className="btn btn-reject" onClick={() => deleteKyc(k.id, k.users?.username)}>Delete Record &amp; Images</button>
              </div>
            )}
          </div>
        ))
      )}

      <p style={{ color: '#9aa0aa', fontSize: 12, marginTop: 16 }}>
        Deleting a record also removes the customer&apos;s uploaded ID images from storage — useful for keeping only
        as much identity data as you actually need.
      </p>
    </AdminLayout>
  );
}
