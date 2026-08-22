// pages/api/support_send.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser, uploadChatAttachment } from '../../lib/auth';

// Attachments (photos, voice notes) can be sizable; raise the body limit for this route only.
export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res, { allowSuspended: true });
  if (!user) return;

  const body = req.body || {};
  const message = String(body.message || '').trim();
  const attachmentDataUrl = body.attachment || null; // base64 data URL: image or short voice recording

  if (!message && !attachmentDataUrl) {
    return res.status(400).json({ error: 'Send a message or attach a photo/voice note' });
  }
  if (message.length > 2000) return res.status(400).json({ error: 'Message is too long' });

  let uploaded = null;
  if (attachmentDataUrl) {
    uploaded = await uploadChatAttachment(attachmentDataUrl, `support_u${user.id}`);
    if (!uploaded) {
      return res.status(400).json({ error: 'Could not attach that file — please try a photo (JPG/PNG) or a short voice note, under 5-8MB.' });
    }
  }

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
    message: message || (uploaded.type === 'image' ? '📷 Photo' : '🎤 Voice message'),
    attachment_url: uploaded?.url || null,
    attachment_type: uploaded?.type || null,
  });
  if (error) return res.status(500).json({ error: 'Could not send message' });

  await supabaseAdmin
    .from('support_tickets')
    .update({ status: 'open', last_message_at: new Date().toISOString() })
    .eq('id', ticket.id);

  return res.status(200).json({ success: true, ticket_id: ticket.id });
}
