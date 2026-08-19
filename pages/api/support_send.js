// pages/api/support_send.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser } from '../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res);
  if (!user) return;

  const message = String((req.body || {}).message || '').trim();
  if (!message) return res.status(400).json({ error: 'Message cannot be empty' });
  if (message.length > 2000) return res.status(400).json({ error: 'Message is too long' });

  let { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ticket) {
    const { data: newTicket } = await supabaseAdmin
      .from('support_tickets')
      .insert({ user_id: user.id })
      .select()
      .single();
    ticket = newTicket;
  }

  const { error } = await supabaseAdmin.from('support_messages').insert({
    ticket_id: ticket.id,
    sender_type: 'user',
    sender_id: user.id,
    message,
  });
  if (error) return res.status(500).json({ error: 'Could not send message' });

  await supabaseAdmin
    .from('support_tickets')
    .update({ status: 'open', last_message_at: new Date().toISOString() })
    .eq('id', ticket.id);

  return res.status(200).json({ success: true, ticket_id: ticket.id });
}
