// pages/admin/kyc.js
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function Kyc() {
  const [kycs, setKycs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [notes, setNotes] = useState({});

  async function load(status) {
    const res = await fetch('/api/admin/kyc?status=' + status);
    const data = await res.json();
    setKycs(data.kycs || []);
  }

  useEffect(() => { load(statusFilter); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function decide(kycId, decision) {
    await fetch('/api/admin/kyc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kyc_id: kycId, decision, notes: notes[kycId] || '' }),
    });
    load(statusFilter);
  }

  return (
    <AdminLayout title="Identity Verification (KYC)">
      <div style={{ marginBottom: 16 }}>
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button key={s} className={`btn ${statusFilter === s ? 'btn-approve' : 'btn-neutral'}`} onClick={() => setStatusFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {kycs.length === 0 ? (
        <div className="empty-state">No verification requests here.</div>
      ) : (
        kycs.map((k) => (
          <div key={k.id} style={{ background: '#14161c', borderRadius: 12, padding: 18, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
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
              </div>
            ) : k.admin_notes ? (
              <div style={{ fontSize: 12, color: '#9aa0aa' }}>Notes: {k.admin_notes}</div>
            ) : null}
          </div>
        ))
      )}
    </AdminLayout>
  );
}
