// pages/api/support_messages.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser } from '../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req, res, { allowSuspended: true });
  if (!user) return;

  let { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  let messages = [];
  if (!ticket) {
    const { data: newTicket } = await supabaseAdmin
      .from('support_tickets')
      .insert({ user_id: user.id })
      .select()
      .single();
    ticket = newTicket;
  } else {
    const { data: msgs } = await supabaseAdmin
      .from('support_messages')
      .select('id, sender_type, message, created_at')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    messages = msgs || [];

    // Mark admin messages as read now that the user opened the thread.
    await supabaseAdmin
      .from('support_messages')
      .update({ is_read: true })
      .eq('ticket_id', ticket.id)
      .eq('sender_type', 'admin');
  }

  return res.status(200).json({
    success: true,
    ticket_id: ticket.id,
    status: ticket.status,
    messages,
  });
}
