// pages/api/team.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser } from '../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req, res);
  if (!user) return;

  const { data: referrals } = await supabaseAdmin
    .from('users')
    .select('id, username, created_at')
    .eq('referred_by', user.id)
    .order('created_at', { ascending: false });

  const { data: bonusRecords } = await supabaseAdmin
    .from('records')
    .select('reference_id, amount')
    .eq('user_id', user.id)
    .eq('type', 'referral_bonus');

  const earnedByReferral = {};
  (bonusRecords || []).forEach((r) => {
    earnedByReferral[r.reference_id] = (earnedByReferral[r.reference_id] || 0) + Number(r.amount);
  });

  const list = (referrals || []).map((r) => ({
    name: r.username,
    id: `****${String(r.id).padStart(4, '0')}`,
    earned: Math.round((earnedByReferral[r.id] || 0) * 100) / 100,
    date: new Date(r.created_at).toLocaleDateString(),
  }));

  const lifetimeEarned = list.reduce((s, r) => s + r.earned, 0);

  return res.status(200).json({
    success: true,
    team_size: list.length,
    lifetime_earned: Math.round(lifetimeEarned * 100) / 100,
    referrals: list,
  });
}
