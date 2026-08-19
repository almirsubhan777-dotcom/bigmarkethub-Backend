// pages/admin/support.js
import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');

  const loadTickets = useCallback(async () => {
    const res = await fetch('/api/admin/support');
    const data = await res.json();
    const list = data.tickets || [];
    setTickets(list);
    if (!activeId && list.length > 0) setActiveId(list[0].id);
  }, [activeId]);

  const loadMessages = useCallback(async (ticketId) => {
    if (!ticketId) return;
    const res = await fetch('/api/admin/support?ticket_id=' + ticketId);
    const data = await res.json();
    setMessages(data.messages || []);
  }, []);

  useEffect(() => { loadTickets(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadMessages(activeId); }, [activeId, loadMessages]);

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    await fetch('/api/admin/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: activeId, message: reply }),
    });
    setReply('');
    loadMessages(activeId);
    loadTickets();
  }

  async function closeTicket() {
    await fetch('/api/admin/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: activeId, action: 'close' }),
    });
    loadTickets();
  }

  const activeTicket = tickets.find((t) => t.id === activeId);

  return (
    <AdminLayout title="Support Chat">
      <div style={{ display: 'flex', gap: 16, height: '70vh' }}>
        <div style={{ width: 280, flexShrink: 0, background: '#14161c', borderRadius: 12, overflowY: 'auto' }}>
          {tickets.length === 0 && <div className="empty-state">No conversations yet.</div>}
          {tickets.map((t) => (
            <div
              key={t.id}
              onClick={() => setActiveId(t.id)}
              style={{
                padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.06)', cursor: 'pointer',
                background: t.id === activeId ? 'rgba(255,106,0,.1)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: 13 }}>{t.users?.username}</b>
                {t.unread > 0 && <span className="badge badge-pending">{t.unread} new</span>}
              </div>
              <div style={{ fontSize: 11, color: '#9aa0aa', marginTop: 3 }}>
                {t.users?.uid} · <span className={`badge badge-${t.status === 'open' ? 'pending' : t.status === 'answered' ? 'approved' : 'rejected'}`}>{t.status}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#14161c', borderRadius: 12, overflow: 'hidden' }}>
          {!activeTicket ? (
            <div className="empty-state">Select a conversation to view it.</div>
          ) : (
            <>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><b>{activeTicket.users?.username}</b> <span style={{ color: '#9aa0aa', fontSize: 12 }}>({activeTicket.users?.uid})</span></div>
                <button className="btn btn-neutral" onClick={closeTicket}>Close Ticket</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && <div className="empty-state">No messages yet.</div>}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      maxWidth: '70%',
                      alignSelf: m.sender_type === 'admin' ? 'flex-end' : 'flex-start',
                      background: m.sender_type === 'admin' ? 'linear-gradient(90deg,#FF6A00,#FFA23A)' : 'rgba(255,255,255,.06)',
                      padding: '10px 14px', borderRadius: 12, fontSize: 13,
                    }}
                  >
                    {m.message}
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendReply} style={{ display: 'flex', gap: 8, padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
                <input
                  type="text" placeholder="Type a reply..." value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  style={{ flex: 1, margin: 0 }}
                />
                <button className="btn btn-approve" type="submit">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
