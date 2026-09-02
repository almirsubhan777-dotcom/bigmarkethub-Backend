// pages/admin/support.js
import { useEffect, useState, useCallback, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState(null); // { dataUrl, type }
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);

  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recTimerRef = useRef(null);

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/support');
      if (!res.ok) return; // transient server/network hiccup — just skip this poll cycle
      const data = await res.json();
      const list = Array.isArray(data?.tickets) ? data.tickets : [];
      setTickets(list);
      if (!activeId && list.length > 0) setActiveId(list[0].id);
    } catch (e) {
      // Network drop, timeout, or a non-JSON error page — never let this bubble
      // up and disrupt the page. The next poll cycle (a few seconds later) will
      // simply try again.
    }
  }, [activeId]);

  const loadMessages = useCallback(async (ticketId) => {
    if (!ticketId) return;
    try {
      const res = await fetch('/api/admin/support?ticket_id=' + ticketId);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (e) {
      // Same as above — a dropped poll is invisible and harmless; the next one recovers it.
    }
  }, []);

  async function handleManualRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([loadTickets(), loadMessages(activeId)]);
    } catch (e) {
      /* individual loaders already guard themselves; nothing more to do here */
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { loadTickets(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadMessages(activeId); }, [activeId, loadMessages]);

  // Keep the ticket list (and unread counts) current while this page is open.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadTickets();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  // Keep the CURRENTLY OPEN conversation's messages current too — this is what
  // makes replies show up within seconds instead of only after switching tickets.
  useEffect(() => {
    if (!activeId) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadMessages(activeId);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeId, loadMessages]);

  function selectTicket(id) {
    setActiveId(id);
    setShowChatOnMobile(true);
    setPendingAttachment(null);
  }

  async function handleImagePick(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Please choose an image under 5MB.'); return; }
    try {
      const dataUrl = await fileToDataUrl(file);
      setPendingAttachment({ dataUrl, type: 'image' });
    } catch (err) {
      alert('Could not read that image — please try a different file.');
    }
    e.target.value = '';
  }

  async function handleDocPick(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Please choose a PDF document.'); return; }
    if (file.size > 8 * 1024 * 1024) { alert('Please choose a PDF under 8MB.'); return; }
    try {
      const dataUrl = await fileToDataUrl(file);
      setPendingAttachment({ dataUrl, type: 'document' });
    } catch (err) {
      alert('Could not read that file — please try a different PDF.');
    }
    e.target.value = '';
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start();
      mediaRecorderRef.current = recorder;

      setIsRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => {
        setRecSeconds((s) => {
          if (s + 1 >= 120) { stopRecording(true); return s; } // 2 min safety cap
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      alert('Please allow microphone access to record a voice note.');
    }
  }

  async function stopRecording(keep) {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    clearInterval(recTimerRef.current);
    setIsRecording(false);

    await new Promise((resolve) => {
      recorder.onstop = resolve;
      recorder.stop();
    });
    recorder.stream.getTracks().forEach((t) => t.stop());

    if (keep && chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const dataUrl = await fileToDataUrl(blob);
      setPendingAttachment({ dataUrl, type: 'audio' });
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim() && !pendingAttachment) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: activeId,
          message: reply,
          attachment: pendingAttachment ? pendingAttachment.dataUrl : null,
        }),
      });
      if (!res.ok) throw new Error('Send failed');
      setReply('');
      setPendingAttachment(null);
      await loadMessages(activeId);
      await loadTickets();
    } catch (e) {
      alert('Could not send that message — please check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  async function closeTicket() {
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: activeId, action: 'close' }),
      });
      if (!res.ok) throw new Error('Close failed');
      await loadTickets();
    } catch (e) {
      alert('Could not close the ticket — please check your connection and try again.');
    }
  }

  const activeTicket = tickets.find((t) => t.id === activeId);

  return (
    <AdminLayout title="Support Chat">
      <style>{`
        .support-shell{ display:flex; gap:16px; height:70vh; }
        .support-list{ width:280px; flex-shrink:0; background:#14161c; border-radius:12px; overflow-y:auto; display:flex; flex-direction:column; }
        .support-chat{ flex:1; min-width:0; display:flex; flex-direction:column; background:#14161c; border-radius:12px; overflow:hidden; }
        .support-back-btn{ display:none; }
        .support-attach-btn{
          width:36px; height:36px; border-radius:50%; flex-shrink:0;
          background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#9aa0aa;
          display:flex; align-items:center; justify-content:center; cursor:pointer;
        }
        .support-attach-btn:hover{ color:#2DD4A7; border-color:#2DD4A7; }
        .support-attach-btn.active{ background:rgba(255,71,71,.15); border-color:#FF4747; color:#ff6b6b; }
        @keyframes spin{ from{ transform:rotate(0deg); } to{ transform:rotate(360deg); } }
        @keyframes pulseDot{ 0%,100%{ opacity:1; } 50%{ opacity:.3; } }
        @media (max-width: 768px){
          .support-shell{ height: calc(100vh - 150px); }
          .support-list{ width:100%; }
          .support-list.hide-on-mobile{ display:none; }
          .support-chat.hide-on-mobile{ display:none; }
          .support-back-btn{ display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,.08); border:none; color:#fff; padding:6px 10px; border-radius:7px; font-size:12px; font-weight:700; cursor:pointer; }
        }
      `}</style>

      <div className="support-shell">
        <div className={`support-list${showChatOnMobile ? ' hide-on-mobile' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: 11.5, color: '#9aa0aa', fontWeight: 700, textTransform: 'uppercase' }}>Conversations</span>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="btn btn-neutral"
              style={{ margin: 0, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
              title="Refresh"
            >
              <svg
                viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}
              >
                <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" />
              </svg>
              Refresh
            </button>
          </div>
          {tickets.length === 0 && <div className="empty-state">No conversations yet.</div>}
          {tickets.map((t) => (
            <div
              key={t.id}
              onClick={() => selectTicket(t.id)}
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

        <div className={`support-chat${!showChatOnMobile ? ' hide-on-mobile' : ''}`}>
          {!activeTicket ? (
            <div className="empty-state">Select a conversation to view it.</div>
          ) : (
            <>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <button className="support-back-btn" onClick={() => setShowChatOnMobile(false)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                    Back
                  </button>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <b>{activeTicket.users?.username}</b> <span style={{ color: '#9aa0aa', fontSize: 12 }}>({activeTicket.users?.uid})</span>
                  </div>
                </div>
                <button className="btn btn-neutral" onClick={closeTicket} style={{ flexShrink: 0 }}>Close Ticket</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && <div className="empty-state">No messages yet.</div>}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      maxWidth: '80%',
                      alignSelf: m.sender_type === 'admin' ? 'flex-end' : 'flex-start',
                      background: m.sender_type === 'admin' ? 'linear-gradient(90deg,#FF6A00,#FFA23A)' : 'rgba(255,255,255,.06)',
                      padding: '10px 14px', borderRadius: 12, fontSize: 13,
                    }}
                  >
                    {m.message}
                    {m.attachment_url && m.attachment_type === 'image' && (
                      <div style={{ marginTop: 6 }}>
                        <img
                          src={m.attachment_url} alt="Attachment"
                          style={{ maxWidth: 220, borderRadius: 10, display: 'block', cursor: 'pointer' }}
                          onClick={() => window.open(m.attachment_url, '_blank')}
                        />
                      </div>
                    )}
                    {m.attachment_url && m.attachment_type === 'audio' && (
                      <audio controls src={m.attachment_url} style={{ marginTop: 6, maxWidth: 220, height: 34, display: 'block' }} />
                    )}
                    {m.attachment_url && m.attachment_type === 'document' && (
                      <a
                        href={m.attachment_url} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, background: 'rgba(255,255,255,.15)', padding: '6px 10px', borderRadius: 8, color: 'inherit', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}
                      >
                        📄 View Document
                      </a>
                    )}
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {pendingAttachment && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderTop: '1px solid rgba(255,255,255,.08)', background: 'rgba(45,212,167,.05)' }}>
                  {pendingAttachment.type === 'image' && <img src={pendingAttachment.dataUrl} alt="Preview" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
                  {pendingAttachment.type === 'audio' && <span style={{ fontSize: 12.5, color: '#2DD4A7', fontWeight: 700 }}>🎤 Voice note ready</span>}
                  {pendingAttachment.type === 'document' && <span style={{ fontSize: 12.5, color: '#2DD4A7', fontWeight: 700 }}>📄 Document ready</span>}
                  <button
                    type="button" onClick={() => setPendingAttachment(null)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9aa0aa', fontSize: 18, cursor: 'pointer' }}
                  >×</button>
                </div>
              )}

              {isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderTop: '1px solid rgba(255,71,71,.2)', background: 'rgba(255,71,71,.06)', fontSize: 12.5, color: '#ff6b6b', fontWeight: 700 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF4747', animation: 'pulseDot 1.1s ease-in-out infinite' }} />
                  Recording… {Math.floor(recSeconds / 60)}:{String(recSeconds % 60).padStart(2, '0')}
                  <button type="button" onClick={() => stopRecording(true)} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>Stop &amp; Preview</button>
                  <button type="button" onClick={() => stopRecording(false)} style={{ background: 'transparent', border: 'none', color: '#9aa0aa', fontSize: 11.5, cursor: 'pointer' }}>Cancel</button>
                </div>
              )}

              <form onSubmit={sendReply} style={{ display: 'flex', gap: 8, padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,.08)', alignItems: 'center' }}>
                <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImagePick} style={{ display: 'none' }} />
                <input type="file" accept="application/pdf" ref={docInputRef} onChange={handleDocPick} style={{ display: 'none' }} />

                <button type="button" className="support-attach-btn" title="Attach photo" onClick={() => imageInputRef.current.click()}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </button>
                <button type="button" className="support-attach-btn" title="Attach PDF document" onClick={() => docInputRef.current.click()}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                </button>
                <button
                  type="button" className={`support-attach-btn${isRecording ? ' active' : ''}`} title="Record voice note"
                  onClick={() => (isRecording ? stopRecording(true) : startRecording())}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4"/></svg>
                </button>

                <input
                  type="text" placeholder="Type a reply..." value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  style={{ flex: 1, minWidth: 0, margin: 0 }}
                />
                <button className="btn btn-approve" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send'}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
