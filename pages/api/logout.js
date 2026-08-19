// pages/api/logout.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { getBearerToken } from '../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = getBearerToken(req);
  if (token) {
    await supabaseAdmin.from('sessions').delete().eq('token', token);
  }
  return res.status(200).json({ success: true });
}
