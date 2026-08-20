// pages/api/my_withdrawals.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser } from '../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req, res);
  if (!user) return;

  const { data: withdrawals, error } = await supabaseAdmin
    .from('withdrawals')
    .select('id, amount, network, wallet_address, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: 'Could not fetch withdrawal records' });

  return res.status(200).json({ success: true, withdrawals: withdrawals || [] });
}
