// pages/api/task_next.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser } from '../../lib/auth';

const TIERS = {
  amazon:     { min: 10,  max: 498,    rate: 0.04, batchSize: 25 },
  alibaba:    { min: 499, max: 998,    rate: 0.08, batchSize: 40 },
  aliexpress: { min: 999, max: 300000, rate: 0.12, batchSize: 60 },
};

// After finishing a batch the merchant queue needs a short pause before the
// next batch of orders is released.
const BATCH_COOLDOWN_SECONDS = 60;

// Safety cap so a single account can't run indefinitely in one day.
// Raise or lower this number to control your daily exposure.
const MAX_BATCHES_PER_DAY = 1;

// Order value is scaled to the customer's own balance, and the percentage is set
// per tier so a full batch tops out at roughly the same return on every tier.
// The published commission rate is always paid in full on the order value.
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

  const { data: recentTasks, count: tasksToday } = await supabaseAdmin
    .from('records')
    .select('created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('type', 'task')
    .gte('created_at', startOfTodayISO())
    .order('created_at', { ascending: false })
    .limit(1);

  const done = tasksToday || 0;
  const batchSize = tier.batchSize;
  const batchesDone = Math.floor(done / batchSize);
  const positionInBatch = done % batchSize;
  const atBatchBoundary = positionInBatch === 0 && done > 0;

  // Hit the daily safety cap.
  if (batchesDone >= MAX_BATCHES_PER_DAY && atBatchBoundary) {
    return res.status(429).json({
      error: `You've completed all ${MAX_BATCHES_PER_DAY} batches available today.`,
      day_complete: true,
      batches_done: batchesDone,
      max_batches: MAX_BATCHES_PER_DAY,
      resets_at: nextResetISO(),
    });
  }

  // Between batches: short cooldown before the next batch is released.
  if (atBatchBoundary && recentTasks && recentTasks[0]) {
    const lastTaskAt = parseTs(recentTasks[0].created_at);
    const elapsed = (Date.now() - lastTaskAt.getTime()) / 1000;
    if (elapsed < BATCH_COOLDOWN_SECONDS) {
      return res.status(429).json({
        error: 'Next batch is preparing.',
        cooldown: true,
        cooldown_seconds: BATCH_COOLDOWN_SECONDS,
        cooldown_until: new Date(lastTaskAt.getTime() + BATCH_COOLDOWN_SECONDS * 1000).toISOString(),
        batch_size: batchSize,
        batches_done: batchesDone,
        max_batches: MAX_BATCHES_PER_DAY,
      });
    }
  }

  const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
  const range = ORDER_VALUE_PCT[platform];
  const pct = range.min + Math.random() * (range.max - range.min);
  const orderValue = Math.round(balance * pct * 100) / 100;
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
    batches_done: batchesDone,
    max_batches: MAX_BATCHES_PER_DAY,
  });
}
