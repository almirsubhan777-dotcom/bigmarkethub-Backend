// pages/api/task_next.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser } from '../../lib/auth';

const TIERS = {
  amazon:     { min: 10,  max: 498,    rate: 0.04, batchSize: 12 },
  alibaba:    { min: 499, max: 998,    rate: 0.08, batchSize: 20 },
  aliexpress: { min: 999, max: 300000, rate: 0.12, batchSize: 12 },
};

// After finishing a batch, the user presses "Request Next Batch" and then
// waits this many seconds before the next batch is released.
const BATCH_COOLDOWN_SECONDS = 60;

// The real daily ceiling: total earnings for the day cannot exceed this
// percentage of the balance the user started the day with. This is what
// actually controls payout — batch size only controls how the UI paces it.
const DAILY_RETURN_CAP_PCT = 0.50;

// Order value is scaled to the customer's own balance, tuned per tier so a
// batch is a meaningful slice of the daily cap rather than using it all at
// once. The published commission rate is always paid in full on the order value.
const ORDER_VALUE_PCT = {
  amazon:     { min: 0.30, max: 0.50 },
  alibaba:    { min: 0.15, max: 0.25 },
  aliexpress: { min: 0.10, max: 0.17 },
};

const PRODUCTS = [
  { name: 'Wireless Earbuds', photo: 'earbuds' },
  { name: 'Smart Home Hub', photo: 'smarthome' },
  { name: 'Fitness Tracker Watch', photo: 'watch4g' },
  { name: 'USB-C Fast Charger', photo: 'charger' },
  { name: 'Bulk Packaging Rolls', photo: 'kraft' },
  { name: 'Industrial Fastener Set', photo: 'eyebolt' },
  { name: 'Printed Textile Bundle', photo: 'fabric' },
  { name: 'LED Panel Light', photo: 'ledpanel' },
  { name: 'Phone Case Bundle', photo: 'phonecase' },
  { name: 'Mini Drone Toy', photo: 'drone' },
  { name: 'Travel Backpack', photo: 'backpack' },
  { name: 'Bluetooth LED Speaker', photo: 'ledlamp' },
  { name: 'Vintage Camera', photo: 'camera' },
  { name: 'Collector Pocket Watch', photo: 'pocketwatch' },
  { name: 'Designer Handbag Set', photo: 'handbag' },
  { name: 'Retro Game Console', photo: 'console' },
];

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

/** Supabase TIMESTAMP columns come back without a zone; they are UTC. */
function parseTs(ts) {
  return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res);
  if (!user) return;

  const platform = String((req.body || {}).platform || '');
  const tier = TIERS[platform];
  if (!tier) return res.status(400).json({ error: 'Unknown platform' });

  const balance = Number(user.balance);
  if (balance < tier.min || balance > tier.max) {
    return res.status(403).json({ error: 'Your balance does not qualify for this tier.' });
  }

  // Pull today's task records once — used for both the earning cap and the batch position.
  const { data: todayTasks } = await supabaseAdmin
    .from('records')
    .select('amount, created_at')
    .eq('user_id', user.id)
    .eq('type', 'task')
    .gte('created_at', startOfTodayISO())
    .order('created_at', { ascending: true });

  const tasksToday = (todayTasks || []).length;
  const earnedToday = (todayTasks || []).reduce((s, r) => s + Number(r.amount), 0);
  const startOfDayBalance = balance - earnedToday;
  const dailyCap = startOfDayBalance * DAILY_RETURN_CAP_PCT;

  // The real stop condition: today's earnings have reached the daily cap.
  if (earnedToday >= dailyCap) {
    return res.status(429).json({
      error: "You've reached today's earning limit.",
      day_complete: true,
      resets_at: nextResetISO(),
    });
  }

  const batchSize = tier.batchSize;
  const positionInBatch = tasksToday % batchSize;
  const atBatchBoundary = positionInBatch === 0 && tasksToday > 0;

  // Between batches: require the cooldown to have elapsed (the frontend button
  // already waits 60s before calling this again, so this is a safety net).
  if (atBatchBoundary && todayTasks.length) {
    const lastTaskAt = parseTs(todayTasks[todayTasks.length - 1].created_at);
    const elapsed = (Date.now() - lastTaskAt.getTime()) / 1000;
    if (elapsed < BATCH_COOLDOWN_SECONDS) {
      return res.status(429).json({
        error: 'Next batch is preparing.',
        cooldown: true,
        cooldown_seconds: BATCH_COOLDOWN_SECONDS,
        cooldown_until: new Date(lastTaskAt.getTime() + BATCH_COOLDOWN_SECONDS * 1000).toISOString(),
        batch_size: batchSize,
      });
    }
  }

  const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
  const range = ORDER_VALUE_PCT[platform];
  const pct = range.min + Math.random() * (range.max - range.min);
  let orderValue = Math.round(balance * pct * 100) / 100;

  // Never let a single order's commission overshoot what's left under the cap.
  const remainingUnderCap = Math.max(dailyCap - earnedToday, 0);
  const maxOrderForCap = Math.round((remainingUnderCap / tier.rate) * 100) / 100;
  if (orderValue > maxOrderForCap) orderValue = Math.max(maxOrderForCap, 0.01);

  const commission = Math.round(orderValue * tier.rate * 100) / 100;

  return res.status(200).json({
    success: true,
    order: {
      platform,
      product_name: product.name,
      photo: product.photo,
      order_id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      order_value: orderValue,
      rate_percent: tier.rate * 100,
      commission,
    },
    tasks_in_batch: positionInBatch,
    batch_size: batchSize,
  });
}
