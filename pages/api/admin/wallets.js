// pages/api/admin/wallets.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if ((admin.role || 'admin') !== 'admin') { return res.status(403).json({ error: 'Agents do not have access to this section.' }); }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data: wallets, error } = await supabaseAdmin
    .from('wallets')
    .select('*, users(username, uid, email)')
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) return res.status(500).json({ error: 'Could not fetch wallets' });

  return res.status(200).json({ success: true, wallets: wallets || [] });
}
