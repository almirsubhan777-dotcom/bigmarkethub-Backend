// pages/api/admin/deposits.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin, logRecord } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if ((admin.role || 'admin') !== 'admin') { return res.status(403).json({ error: 'Agents do not have access to this section.' }); }

  if (req.method === 'GET') {
    const status = String(req.query.status || 'pending');
    let query = supabaseAdmin
      .from('deposits')
      .select('*, users(username, uid)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (status !== 'all') query = query.eq('status', status);
    const { data: deposits, error } = await query;
    if (error) return res.status(500).json({ error: 'Could not fetch deposits' });
    return res.status(200).json({ success: true, deposits });
  }

  if (req.method === 'POST') {
    const { deposit_id, decision } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });

    const { data: deposit } = await supabaseAdmin.from('deposits').select('*').eq('id', deposit_id).single();
    if (!deposit || deposit.status !== 'pending') return res.status(400).json({ error: 'Deposit not found or already reviewed' });

    await supabaseAdmin
      .from('deposits')
      .update({ status: decision, reviewed_at: new Date().toISOString(), reviewed_by: admin.id })
      .eq('id', deposit_id);

    if (decision === 'approved') {
      const { data: user } = await supabaseAdmin.from('users').select('balance').eq('id', deposit.user_id).single();
      await supabaseAdmin
        .from('users')
        .update({ balance: Number(user.balance) + Number(deposit.amount) })
        .eq('id', deposit.user_id);
    }

    await logRecord({
      userId: deposit.user_id,
      type: 'deposit',
      referenceId: deposit.id,
      amount: deposit.amount,
      status: decision,
      description: `Deposit request ${decision} by admin`,
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
