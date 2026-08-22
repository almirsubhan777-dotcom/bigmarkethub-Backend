// pages/api/withdraw_request.js
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser, validateRequired, logRecord } from '../../lib/auth';

// Flat platform withdrawal fee — applies equally to every customer, every withdrawal.
// This must match the percentage shown on the Withdraw page and in Compliance & Terms.
const WITHDRAWAL_FEE_PCT = 0.30;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res);
  if (!user) return;

  const body = req.body || {};
  const err = validateRequired(body, ['amount', 'password']);
  if (err) return res.status(400).json({ error: err });

  const amount = Number(body.amount);
  const password = String(body.password);

  if (!(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Incorrect password. Withdrawal not authorized.' });
  }
  if (amount < 10) return res.status(400).json({ error: 'Minimum withdrawal is 10 USDT' });
  if (amount > Number(user.balance)) return res.status(400).json({ error: 'Insufficient balance' });

  const feeAmount = Math.round(amount * WITHDRAWAL_FEE_PCT * 100) / 100;
  const netAmount = Math.round((amount - feeAmount) * 100) / 100;

  const { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!wallet) {
    return res.status(400).json({ error: 'No withdrawal wallet on file. Please add one in the Wallet page first.' });
  }

  const { data: withdrawal, error: wErr } = await supabaseAdmin
    .from('withdrawals')
    .insert({
      user_id: user.id,
      amount,          // gross amount deducted from balance
      network: wallet.network,
      wallet_address: wallet.wallet_address,
    })
    .select()
    .single();
  if (wErr) return res.status(500).json({ error: 'Could not process withdrawal request' });

  // Hold the full requested amount immediately so it can't be withdrawn twice while pending.
  const { error: balErr } = await supabaseAdmin
    .from('users')
    .update({ balance: Number(user.balance) - amount })
    .eq('id', user.id);
  if (balErr) return res.status(500).json({ error: 'Could not hold balance for withdrawal' });

  await logRecord({
    userId: user.id,
    type: 'withdrawal',
    referenceId: withdrawal.id,
    amount,
    status: 'pending',
    description: `Withdrawal request of $${amount.toFixed(2)} submitted (${(WITHDRAWAL_FEE_PCT * 100).toFixed(0)}% fee: $${feeAmount.toFixed(2)}, net payout: $${netAmount.toFixed(2)}), funds held pending review`,
  });

  return res.status(200).json({
    success: true,
    message: `Withdrawal request submitted. A ${(WITHDRAWAL_FEE_PCT * 100).toFixed(0)}% platform fee applies — you'll receive $${netAmount.toFixed(2)} once approved.`,
    withdrawal_id: withdrawal.id,
    gross_amount: amount,
    fee_amount: feeAmount,
    fee_pct: WITHDRAWAL_FEE_PCT * 100,
    net_amount: netAmount,
  });
}
