// pages/api/admin/login.js
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { createSession } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('*')
    .eq('username', String(username).trim())
    .maybeSingle();

  if (!admin || !(await bcrypt.compare(String(password), admin.password_hash))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = await createSession({ adminId: admin.id });

  // Store as an httpOnly cookie so the admin pages can check it server-side too.
  res.setHeader('Set-Cookie', `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${72 * 3600}`);

  return res.status(200).json({ success: true, token });
}
