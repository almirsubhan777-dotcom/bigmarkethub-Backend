// pages/api/login.js
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { createSession, validateRequired } from '../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const err = validateRequired(body, ['username', 'password']);
  if (err) return res.status(400).json({ error: err });

  const usernameOrEmail = String(body.username).trim();
  const password = String(body.password);

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail},mobile.eq.${usernameOrEmail}`)
    .maybeSingle();

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  if (user.status === 'banned') {
    return res.status(403).json({ error: 'Your account has been banned. Please contact support if you believe this is a mistake.' });
  }
  // Suspended accounts CAN log in — they land in a restricted view where the
  // only path forward is Support Chat, so they're able to appeal.

  const token = await createSession({ userId: user.id });

  return res.status(200).json({
    success: true,
    token,
    user: {
      id: user.id,
      uid: user.uid,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      status: user.status,
      balance: Number(user.balance),
      credit_score: user.credit_score,
      kyc_status: user.kyc_status,
    },
  });
}
