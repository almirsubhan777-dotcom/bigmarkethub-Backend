// pages/api/admin/users.js
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin, logRecord } from '../../../lib/auth';

// Matches task_next.js — used only to show "X / batch size" per user, not for payouts.
const TIER_BATCH = [
  { min: 999, size: 60 },
  { min: 499, size: 40 },
  { min: 10,  size: 12 },
];
function batchSizeFor(balance) {
  const tier = TIER_BATCH.find((t) => balance >= t.min);
  return tier ? tier.size : 12;
}

function startOfTodayISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if ((admin.role || 'admin') !== 'admin') { return res.status(403).json({ error: 'Agents do not have access to this section.' }); }

  if (req.method === 'GET') {
    const search = String(req.query.q || '').trim();
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();

    let query = supabaseAdmin.from('users').select('*').order('created_at', { ascending: false }).limit(500);

    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%,uid.ilike.%${search}%`);
    }
    if (from) {
      query = query.gte('created_at', new Date(from + 'T00:00:00Z').toISOString());
    }
    if (to) {
      query = query.lte('created_at', new Date(to + 'T23:59:59Z').toISOString());
    }

    const { data: users, error } = await query;
    if (error) return res.status(500).json({ error: 'Could not fetch users' });

    // One extra query for ALL of today's task records, grouped by user — far
    // cheaper than a per-user subquery, and gives live "tasks today" + batch
    // position for every row in the table.
    const { data: todayTasks } = await supabaseAdmin
      .from('records')
      .select('user_id, created_at')
      .eq('type', 'task')
      .gte('created_at', startOfTodayISO());

    const tasksTodayByUser = {};
    (todayTasks || []).forEach((r) => {
      tasksTodayByUser[r.user_id] = (tasksTodayByUser[r.user_id] || 0) + 1;
    });

    const usersWithActivity = (users || []).map((u) => {
      const tasksToday = tasksTodayByUser[u.id] || 0;
      const batchSize = batchSizeFor(Number(u.balance));
      return {
        ...u,
        tasks_today: tasksToday,
        batch_size: batchSize,
        tasks_in_batch: tasksToday % batchSize,
      };
    });

    return res.status(200).json({ success: true, users: usersWithActivity });
  }

  if (req.method === 'POST') {
    const { user_id, action, status, amount, new_password } = req.body || {};
    const userId = Number(user_id);
    if (!userId) return res.status(400).json({ error: 'user_id is required' });

    if (action === 'set_status') {
      if (!['active', 'suspended', 'banned'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const { error } = await supabaseAdmin.from('users').update({ status }).eq('id', userId);
      if (error) return res.status(500).json({ error: 'Could not update status' });
      return res.status(200).json({ success: true });
    }

    if (action === 'adjust_balance') {
      const amt = Number(amount);
      if (!amt) return res.status(400).json({ error: 'amount is required' });
      const { data: user } = await supabaseAdmin.from('users').select('balance').eq('id', userId).single();
      const newBalance = Number(user.balance) + amt;
      const { error } = await supabaseAdmin.from('users').update({ balance: newBalance }).eq('id', userId);
      if (error) return res.status(500).json({ error: 'Could not adjust balance' });
      await logRecord({
        userId,
        type: 'admin_adjustment',
        amount: amt,
        status: 'completed',
        description: `Manual balance adjustment by admin (${admin.username})`,
      });
      return res.status(200).json({ success: true });
    }

    if (action === 'reset_password') {
      const pw = String(new_password || '');
      if (pw.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

      const hash = await bcrypt.hash(pw, 10);
      const { error } = await supabaseAdmin.from('users').update({ password_hash: hash }).eq('id', userId);
      if (error) return res.status(500).json({ error: 'Could not reset password' });

      // Log the customer out everywhere so the old password stops working immediately.
      await supabaseAdmin.from('sessions').delete().eq('user_id', userId);

      return res.status(200).json({ success: true, message: 'Password reset. Share the new password with the customer.' });
    }

    if (action === 'delete') {
      // Related rows (records, deposits, withdrawals, kyc, wallets, sessions,
      // support tickets) are removed automatically by ON DELETE CASCADE.
      const { error } = await supabaseAdmin.from('users').delete().eq('id', userId);
      if (error) return res.status(500).json({ error: 'Could not delete user' });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
