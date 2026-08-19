// pages/api/admin/dashboard.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const [
    { count: totalUsers },
    { count: pendingDeposits },
    { count: pendingWithdrawals },
    { count: pendingKyc },
    { count: openTickets },
    { data: approvedDeposits },
    { data: approvedWithdrawals },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('deposits').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('kyc_verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabaseAdmin.from('deposits').select('amount').eq('status', 'approved'),
    supabaseAdmin.from('withdrawals').select('amount').eq('status', 'approved'),
  ]);

  const sumApprovedDeposits = (approvedDeposits || []).reduce((s, r) => s + Number(r.amount), 0);
  const sumApprovedWithdrawals = (approvedWithdrawals || []).reduce((s, r) => s + Number(r.amount), 0);

  return res.status(200).json({
    success: true,
    stats: {
      totalUsers: totalUsers || 0,
      pendingDeposits: pendingDeposits || 0,
      pendingWithdrawals: pendingWithdrawals || 0,
      pendingKyc: pendingKyc || 0,
      openTickets: openTickets || 0,
      totalApprovedDeposits: sumApprovedDeposits,
      totalApprovedWithdrawals: sumApprovedWithdrawals,
    },
  });
}
