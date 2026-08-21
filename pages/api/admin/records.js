// pages/api/admin/records.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if ((admin.role || 'admin') !== 'admin') { return res.status(403).json({ error: 'Agents do not have access to this section.' }); }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const type = String(req.query.type || 'all');
  const from = String(req.query.from || '').trim();
  const to = String(req.query.to || '').trim();

  let query = supabaseAdmin
    .from('records')
    .select('*, users(username, uid)')
    .order('created_at', { ascending: false })
    .limit(500);

  if (type !== 'all') query = query.eq('type', type);
  if (from) query = query.gte('created_at', new Date(from + 'T00:00:00Z').toISOString());
  if (to) query = query.lte('created_at', new Date(to + 'T23:59:59Z').toISOString());

  const { data: records, error } = await query;
  if (error) return res.status(500).json({ error: 'Could not fetch records' });

  return res.status(200).json({ success: true, records });
}
