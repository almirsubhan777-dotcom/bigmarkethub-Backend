// pages/api/wallet_save.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser, validateRequired } from '../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    return res.status(200).json({ success: true, wallet: wallet || null });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { data: existing } = await supabaseAdmin.from('wallets').select('id').eq('user_id', user.id).maybeSingle();
  if (existing) {
    return res.status(409).json({ error: 'A wallet is already on file and cannot be edited. Contact support to change it.' });
  }

  const body = req.body || {};
  const err = validateRequired(body, ['wallet_address', 'holder_name']);
  if (err) return res.status(400).json({ error: err });

  const { error } = await supabaseAdmin.from('wallets').insert({
    user_id: user.id,
    wallet_name: String(body.wallet_name || '').trim(),
    network: 'TRC20',
    wallet_address: String(body.wallet_address).trim(),
    holder_name: String(body.holder_name).trim(),
  });
  if (error) return res.status(500).json({ error: 'Could not save wallet' });

  return res.status(200).json({ success: true, message: 'Wallet saved and locked.' });
}
