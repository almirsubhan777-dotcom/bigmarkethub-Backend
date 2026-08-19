// pages/api/admin/withdrawals.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin, logRecord } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    const status = String(req.query.status || 'pending');
    let query = supabaseAdmin
      .from('withdrawals')
      .select('*, users(username, uid)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (status !== 'all') query = query.eq('status', status);
    const { data: withdrawals, error } = await query;
    if (error) return res.status(500).json({ error: 'Could not fetch withdrawals' });
    return res.status(200).json({ success: true, withdrawals });
  }

  if (req.method === 'POST') {
    const { withdrawal_id, decision } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });

    const { data: withdrawal } = await supabaseAdmin.from('withdrawals').select('*').eq('id', withdrawal_id).single();
    if (!withdrawal || withdrawal.status !== 'pending') return res.status(400).json({ error: 'Withdrawal not found or already reviewed' });

    await supabaseAdmin
      .from('withdrawals')
      .update({ status: decision, reviewed_at: new Date().toISOString(), reviewed_by: admin.id })
      .eq('id', withdrawal_id);

    // Funds were held (deducted) when the request was submitted.
    // If rejected, refund the held amount back to the user.
    if (decision === 'rejected') {
      const { data: user } = await supabaseAdmin.from('users').select('balance').eq('id', withdrawal.user_id).single();
      await supabaseAdmin
        .from('users')
        .update({ balance: Number(user.balance) + Number(withdrawal.amount) })
        .eq('id', withdrawal.user_id);
    }

    await logRecord({
      userId: withdrawal.user_id,
      type: 'withdrawal',
      referenceId: withdrawal.id,
      amount: withdrawal.amount,
      status: decision,
      description: `Withdrawal request ${decision} by admin`,
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
