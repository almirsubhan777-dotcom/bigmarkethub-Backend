// pages/api/update_profile.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser } from '../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res);
  if (!user) return;

  const body = req.body || {};
  const updates = {};

  if (body.full_name !== undefined) {
    const name = String(body.full_name).trim();
    if (name.length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters' });
    updates.full_name = name;
  }
  if (body.email !== undefined) {
    const email = String(body.email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });
    // Make sure no one else already has this email.
    const { data: existing } = await supabaseAdmin.from('users').select('id').eq('email', email).neq('id', user.id).maybeSingle();
    if (existing) return res.status(409).json({ error: 'This email is already in use by another account' });
    updates.email = email;
  }
  if (body.mobile !== undefined) {
    updates.mobile = String(body.mobile).trim();
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const { data: updated, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Could not save changes' });

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    user: {
      full_name: updated.full_name,
      email: updated.email,
      mobile: updated.mobile,
    },
  });
}
