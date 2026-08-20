// pages/api/admin/support.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if ((admin.role || 'admin') !== 'admin') { return res.status(403).json({ error: 'Agents do not have access to this section.' }); }

  if (req.method === 'GET') {
    if (req.query.ticket_id) {
      const ticketId = Number(req.query.ticket_id);
      const { data: messages } = await supabaseAdmin
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      // Mark user messages as read now that admin opened the thread.
      await supabaseAdmin
        .from('support_messages')
        .update({ is_read: true })
        .eq('ticket_id', ticketId)
        .eq('sender_type', 'user');

      return res.status(200).json({ success: true, messages: messages || [] });
    }

    const { data: tickets } = await supabaseAdmin
      .from('support_tickets')
      .select('*, users(username, uid)')
      .order('last_message_at', { ascending: false })
      .limit(100);

    // Attach an unread-count per ticket.
    const withUnread = await Promise.all(
      (tickets || []).map(async (t) => {
        const { count } = await supabaseAdmin
          .from('support_messages')
          .select('*', { count: 'exact', head: true })
          .eq('ticket_id', t.id)
          .eq('sender_type', 'user')
          .eq('is_read', false);
        return { ...t, unread: count || 0 };
      })
    );

    return res.status(200).json({ success: true, tickets: withUnread });
  }

  if (req.method === 'POST') {
    const { ticket_id, message, action } = req.body || {};
    const ticketId = Number(ticket_id);

    if (action === 'close') {
      await supabaseAdmin.from('support_tickets').update({ status: 'closed' }).eq('id', ticketId);
      return res.status(200).json({ success: true });
    }

    const msg = String(message || '').trim();
    if (!ticketId || !msg) return res.status(400).json({ error: 'ticket_id and message are required' });

    const { error } = await supabaseAdmin.from('support_messages').insert({
      ticket_id: ticketId,
      sender_type: 'admin',
      sender_id: admin.id,
      message: msg,
    });
    if (error) return res.status(500).json({ error: 'Could not send reply' });

    await supabaseAdmin
      .from('support_tickets')
      .update({ status: 'answered', last_message_at: new Date().toISOString() })
      .eq('id', ticketId);

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
