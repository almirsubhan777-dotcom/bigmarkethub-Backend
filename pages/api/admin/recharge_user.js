// pages/api/admin/recharge_user.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { identifier, amount } = req.body || {};
  const amt = Number(amount);

  if (!identifier || !amt || amt <= 0) {
    return res.status(400).json({ error: 'A customer UID/username and a valid amount are required' });
  }

  const role = admin.role || 'admin';

  // Distributors can only spend from their own allocated credit pool.
  if (role === 'distributor' && amt > Number(admin.credit_balance)) {
    return res.status(400).json({ error: `Insufficient credit. Your available pool is $${Number(admin.credit_balance).toFixed(2)}.` });
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, uid, username, balance')
    .or(`uid.eq.${identifier},username.eq.${identifier}`)
    .maybeSingle();

  if (!user) return res.status(404).json({ error: 'No customer found with that UID or username' });

  const newUserBalance = Math.round((Number(user.balance) + amt) * 100) / 100;

  const { error: updateErr } = await supabaseAdmin.from('users').update({ balance: newUserBalance }).eq('id', user.id);
  if (updateErr) return res.status(500).json({ error: 'Could not recharge customer balance' });

  let newCreditBalance = null;
  if (role === 'distributor') {
    newCreditBalance = Math.round((Number(admin.credit_balance) - amt) * 100) / 100;
    await supabaseAdmin.from('admins').update({ credit_balance: newCreditBalance }).eq('id', admin.id);
  }

  await supabaseAdmin.from('records').insert({
    user_id: user.id,
    type: 'admin_adjustment',
    amount: amt,
    status: 'completed',
    description: `Recharged $${amt.toFixed(2)} by ${role === 'distributor' ? 'agent' : 'admin'} "${admin.username}"`,
  });

  return res.status(200).json({
    success: true,
    message: `Successfully recharged ${user.username} (${user.uid}) with $${amt.toFixed(2)}`,
    new_user_balance: newUserBalance,
    new_credit_balance: newCreditBalance,
  });
}
