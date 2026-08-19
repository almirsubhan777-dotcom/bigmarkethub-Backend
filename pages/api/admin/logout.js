// pages/api/admin/logout.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  const token = req.cookies?.admin_token;
  if (token) {
    await supabaseAdmin.from('sessions').delete().eq('token', token);
  }
  res.setHeader('Set-Cookie', 'admin_token=; Path=/; HttpOnly; Max-Age=0');
  return res.status(200).json({ success: true });
}
