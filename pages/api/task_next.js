// pages/api/task_next.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser } from '../../lib/auth';

const TIERS = {
  amazon:     { min: 10,  max: 498,    rate: 0.04 },
  alibaba:    { min: 499, max: 998,    rate: 0.08 },
  aliexpress: { min: 999, max: 300000, rate: 0.12 },
};

const DAILY_TASK_LIMIT = 25;

// Order value is scaled to the customer's own balance, and the percentage is set
// per tier so that a full day of tasks tops out at roughly the same return on
// every tier (~30%–50% of balance) despite the different commission rates.
// The published commission rate is always paid in full on the order value.
//   Amazon      4% × 25 tasks × 50% of balance = 50% max daily return
//   Alibaba     8% × 25 tasks × 25% of balance = 50% max daily return
//   AliExpress 12% × 25 tasks × 17% of balance = 50% max daily return
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

  const { count: tasksToday } = await supabaseAdmin
    .from('records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'task')
    .gte('created_at', startOfTodayISO());

  const done = tasksToday || 0;
  if (done >= DAILY_TASK_LIMIT) {
    return res.status(429).json({ error: `Daily task limit reached (${DAILY_TASK_LIMIT}/${DAILY_TASK_LIMIT}). Come back tomorrow!` });
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
    tasks_done: done,
    daily_limit: DAILY_TASK_LIMIT,
  });
}
