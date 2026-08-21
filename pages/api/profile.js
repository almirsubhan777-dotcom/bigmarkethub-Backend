// pages/api/profile.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser } from '../../lib/auth';

// Batch size grows with the account tier (matches task_next.js).
const TIER_BATCH = [
  { min: 999, size: 60 },
  { min: 499, size: 40 },
  { min: 10,  size: 25 },
];
const MAX_BATCHES_PER_DAY = 1;

function batchSizeFor(balance) {
  const tier = TIER_BATCH.find((t) => balance >= t.min);
  return tier ? tier.size : 25;
}

function startOfTodayISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req, res);
  if (!user) return;

  const [
    { data: todayTaskRecords },
    { count: totalTasks },
    { data: allTaskRecords },
    { count: teamSize },
    { data: referralRecords },
  ] = await Promise.all([
    supabaseAdmin.from('records').select('amount').eq('user_id', user.id).eq('type', 'task').gte('created_at', startOfTodayISO()),
    supabaseAdmin.from('records').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('type', 'task'),
    supabaseAdmin.from('records').select('amount').eq('user_id', user.id).eq('type', 'task'),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('referred_by', user.id),
    supabaseAdmin.from('records').select('amount').eq('user_id', user.id).eq('type', 'referral_bonus'),
  ]);

  const tasksToday = (todayTaskRecords || []).length;
  const todayEarnings = (todayTaskRecords || []).reduce((s, r) => s + Number(r.amount), 0);
  const totalTaskEarnings = (allTaskRecords || []).reduce((s, r) => s + Number(r.amount), 0);
  const teamLifetimeEarned = (referralRecords || []).reduce((s, r) => s + Number(r.amount), 0);

  return res.status(200).json({
    success: true,
    user: {
      id: user.id,
      uid: user.uid,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      full_name: user.full_name,
      status: user.status,
      balance: Number(user.balance),
      credit_score: user.credit_score,
      kyc_status: user.kyc_status,
      created_at: user.created_at,
      tasks_today: tasksToday,
      batch_size: batchSizeFor(Number(user.balance)),
      max_batches: MAX_BATCHES_PER_DAY,
      daily_task_limit: batchSizeFor(Number(user.balance)) * MAX_BATCHES_PER_DAY,
      today_earnings: Math.round(todayEarnings * 100) / 100,
      total_tasks_completed: totalTasks || 0,
      total_task_earnings: Math.round(totalTaskEarnings * 100) / 100,
      team_size: teamSize || 0,
      team_lifetime_earned: Math.round(teamLifetimeEarned * 100) / 100,
    },
  });
}
