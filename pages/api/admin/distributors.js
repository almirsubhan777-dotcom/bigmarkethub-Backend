// pages/api/admin/distributors.js
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // Only the super admin (role='admin') can manage distributors.
  if ((admin.role || 'admin') !== 'admin') {
    return res.status(403).json({ error: 'Only the super admin can manage distributors.' });
  }

  if (req.method === 'GET') {
    const { data: distributors, error } = await supabaseAdmin
      .from('admins')
      .select('id, username, full_name, credit_balance, created_at')
      .eq('role', 'distributor')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Could not fetch distributors' });
    return res.status(200).json({ success: true, distributors: distributors || [] });
  }

  if (req.method === 'POST') {
    const { action } = req.body || {};

    if (action === 'create') {
      const { username, password, full_name, initial_credit } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
      if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

      const { data: existing } = await supabaseAdmin.from('admins').select('id').eq('username', username).maybeSingle();
      if (existing) return res.status(409).json({ error: 'That username is already taken' });

      const hash = await bcrypt.hash(String(password), 10);
      const { data: newDistributor, error } = await supabaseAdmin
        .from('admins')
        .insert({
          username: String(username).trim(),
          password_hash: hash,
          full_name: String(full_name || '').trim() || null,
          role: 'distributor',
          credit_balance: Number(initial_credit) || 0,
          created_by: admin.id,
        })
        .select('id, username, full_name, credit_balance')
        .single();

      if (error) return res.status(500).json({ error: 'Could not create distributor account' });
      return res.status(200).json({ success: true, distributor: newDistributor });
    }

    if (action === 'add_credit') {
      const { distributor_id, amount } = req.body;
      const amt = Number(amount);
      if (!distributor_id || !amt || amt <= 0) return res.status(400).json({ error: 'Valid distributor and amount are required' });

      const { data: dist } = await supabaseAdmin.from('admins').select('credit_balance').eq('id', distributor_id).eq('role', 'distributor').maybeSingle();
      if (!dist) return res.status(404).json({ error: 'Distributor not found' });

      const newBalance = Math.round((Number(dist.credit_balance) + amt) * 100) / 100;
      const { error } = await supabaseAdmin.from('admins').update({ credit_balance: newBalance }).eq('id', distributor_id);
      if (error) return res.status(500).json({ error: 'Could not add credit' });

      return res.status(200).json({ success: true, new_credit_balance: newBalance });
    }

    if (action === 'delete') {
      const { distributor_id } = req.body;
      const { error } = await supabaseAdmin.from('admins').delete().eq('id', distributor_id).eq('role', 'distributor');
      if (error) return res.status(500).json({ error: 'Could not remove distributor' });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
