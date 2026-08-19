// pages/api/admin/records.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const type = String(req.query.type || 'all');
  let query = supabaseAdmin
    .from('records')
    .select('*, users(username, uid)')
    .order('created_at', { ascending: false })
    .limit(300);
  if (type !== 'all') query = query.eq('type', type);

  const { data: records, error } = await query;
  if (error) return res.status(500).json({ error: 'Could not fetch records' });

  return res.status(200).json({ success: true, records });
}
