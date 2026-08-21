// pages/api/admin/change_password.js
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { current_password, new_password } = req.body || {};

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new password are both required' });
  }
  if (String(new_password).length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  if (!(await bcrypt.compare(String(current_password), admin.password_hash))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = await bcrypt.hash(String(new_password), 10);
  const { error } = await supabaseAdmin.from('admins').update({ password_hash: hash }).eq('id', admin.id);
  if (error) return res.status(500).json({ error: 'Could not change password' });

  // Invalidate every existing session for this admin so the old password can't be reused.
  await supabaseAdmin.from('sessions').delete().eq('admin_id', admin.id);

  return res.status(200).json({ success: true, message: 'Password changed. Please log in again.' });
}
