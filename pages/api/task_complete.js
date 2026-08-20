// pages/api/task_complete.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser, validateRequired, logRecord } from '../../lib/auth';

// Server-side source of truth for each merchant tier's commission rate and
// required balance range — never trust the rate the browser sends.
const TIERS = {
  amazon:     { min: 10,  max: 498,    rate: 0.04 },
  alibaba:    { min: 499, max: 998,    rate: 0.08 },
  aliexpress: { min: 999, max: 300000, rate: 0.12 },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res);
  if (!user) return;

  const body = req.body || {};
  const err = validateRequired(body, ['platform', 'product_name', 'order_value']);
  if (err) return res.status(400).json({ error: err });

  const platform = String(body.platform);
  const productName = String(body.product_name).slice(0, 120);
  const orderValue = Number(body.order_value);

  const tier = TIERS[platform];
  if (!tier) return res.status(400).json({ error: 'Unknown platform' });
  if (!(orderValue > 0)) return res.status(400).json({ error: 'Invalid order value' });

  const balance = Number(user.balance);
  if (balance < tier.min || balance > tier.max) {
    return res.status(403).json({ error: 'Your balance no longer qualifies for this tier.' });
  }

  const commission = Math.round(orderValue * tier.rate * 100) / 100;
  const newBalance = Math.round((balance + commission) * 100) / 100;

  const { error: updateErr } = await supabaseAdmin
    .from('users')
    .update({ balance: newBalance })
    .eq('id', user.id);
  if (updateErr) return res.status(500).json({ error: 'Could not credit earnings' });

  await logRecord({
    userId: user.id,
    type: 'task',
    amount: commission,
    status: 'completed',
    description: `Sold "${productName}" for $${orderValue.toFixed(2)} on ${platform[0].toUpperCase() + platform.slice(1)} (+${(tier.rate * 100).toFixed(2)}% commission)`,
  });

  return res.status(200).json({
    success: true,
    commission,
    new_balance: newBalance,
  });
}
