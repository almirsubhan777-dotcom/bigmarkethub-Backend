// pages/api/task_complete.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser, validateRequired, logRecord } from '../../lib/auth';

const TIERS = {
  amazon:     { min: 10,  max: 498,    rate: 0.04, batchSize: 12 },
  alibaba:    { min: 499, max: 998,    rate: 0.08, batchSize: 20 },
  aliexpress: { min: 999, max: 300000, rate: 0.12, batchSize: 12 },
};

const REFERRAL_COMMISSION_RATE = 0.0001; // 0.01% of the order value, per the Invite & Earn page copy
const DAILY_RETURN_CAP_PCT = 0.40;       // must match task_next.js

// Must match task_next.js — the highest order value the server would ever issue per tier.
const ORDER_VALUE_MAX_PCT = {
  amazon: 0.50,
  alibaba: 0.25,
  aliexpress: 0.17,
};

function startOfTodayISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function nextResetISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

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

  const maxAllowedOrder = Math.round(balance * ORDER_VALUE_MAX_PCT[platform] * 100) / 100;
  if (orderValue > maxAllowedOrder + 0.01) {
    return res.status(400).json({ error: 'Invalid order value for your account tier.' });
  }

  const { data: todayTasks } = await supabaseAdmin
    .from('records')
    .select('amount')
    .eq('user_id', user.id)
    .eq('type', 'task')
    .gte('created_at', startOfTodayISO());

  const tasksToday = (todayTasks || []).length;
  const earnedToday = (todayTasks || []).reduce((s, r) => s + Number(r.amount), 0);
  const startOfDayBalance = balance - earnedToday;
  const dailyCap = startOfDayBalance * DAILY_RETURN_CAP_PCT;

  if (earnedToday >= dailyCap) {
    return res.status(429).json({
      error: "You've reached today's earning limit.",
      day_complete: true,
      resets_at: nextResetISO(),
    });
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

  // Pay the referrer (if any) their commission on this transaction — instantly, per the Invite & Earn terms.
  if (user.referred_by) {
    const referralBonus = Math.round(orderValue * REFERRAL_COMMISSION_RATE * 100) / 100;
    if (referralBonus > 0) {
      const { data: referrer } = await supabaseAdmin.from('users').select('balance').eq('id', user.referred_by).maybeSingle();
      if (referrer) {
        await supabaseAdmin
          .from('users')
          .update({ balance: Math.round((Number(referrer.balance) + referralBonus) * 100) / 100 })
          .eq('id', user.referred_by);

        await logRecord({
          userId: user.referred_by,
          type: 'referral_bonus',
          referenceId: user.id,
          amount: referralBonus,
          status: 'completed',
          description: `${user.username} completed a task — referral commission earned`,
        });
      }
    }
  }

  const tasksDone = tasksToday + 1;
  const newEarnedToday = earnedToday + commission;
  const batchSize = tier.batchSize;
  const dayComplete = newEarnedToday >= dailyCap;

  return res.status(200).json({
    success: true,
    commission,
    new_balance: newBalance,
    tasks_today: tasksDone,
    tasks_in_batch: tasksDone % batchSize,
    batch_size: batchSize,
    batch_complete: !dayComplete && tasksDone % batchSize === 0,
    day_complete: dayComplete,
    today_earnings: Math.round(newEarnedToday * 100) / 100,
    daily_cap_amount: Math.round(dailyCap * 100) / 100,
    resets_at: nextResetISO(),
  });
}
