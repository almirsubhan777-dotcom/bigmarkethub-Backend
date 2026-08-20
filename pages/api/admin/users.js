// pages/api/admin/users.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin, logRecord } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if ((admin.role || 'admin') !== 'admin') { return res.status(403).json({ error: 'Agents do not have access to this section.' }); }

  if (req.method === 'GET') {
    const search = String(req.query.q || '').trim();
    let query = supabaseAdmin.from('users').select('*').order('created_at', { ascending: false }).limit(200);
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%,uid.ilike.%${search}%`);
    }
    const { data: users, error } = await query;
    if (error) return res.status(500).json({ error: 'Could not fetch users' });
    return res.status(200).json({ success: true, users });
  }

  if (req.method === 'POST') {
    const { user_id, action, status, amount } = req.body || {};
    const userId = Number(user_id);
    if (!userId) return res.status(400).json({ error: 'user_id is required' });

    if (action === 'set_status') {
      if (!['active', 'suspended', 'banned'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const { error } = await supabaseAdmin.from('users').update({ status }).eq('id', userId);
      if (error) return res.status(500).json({ error: 'Could not update status' });
      return res.status(200).json({ success: true });
    }

    if (action === 'adjust_balance') {
      const amt = Number(amount);
      if (!amt) return res.status(400).json({ error: 'amount is required' });
      const { data: user } = await supabaseAdmin.from('users').select('balance').eq('id', userId).single();
      const newBalance = Number(user.balance) + amt;
      const { error } = await supabaseAdmin.from('users').update({ balance: newBalance }).eq('id', userId);
      if (error) return res.status(500).json({ error: 'Could not adjust balance' });
      await logRecord({
        userId,
        type: 'admin_adjustment',
        amount: amt,
        status: 'completed',
        description: `Manual balance adjustment by admin (${admin.username})`,
      });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
