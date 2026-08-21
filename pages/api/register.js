// pages/api/register.js
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { generateUid, createSession, validateRequired, logRecord } from '../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const err = validateRequired(body, ['username', 'email', 'password', 'invitation_code']);
  if (err) return res.status(400).json({ error: err === 'Missing required field: invitation_code' ? 'An invitation code is required to create an account' : err });

  const username = String(body.username).trim();
  const email = String(body.email).trim();
  const mobile = String(body.mobile || '').trim();
  const password = String(body.password);
  const invitationCode = String(body.invitation_code).trim();

  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!invitationCode) return res.status(400).json({ error: 'An invitation code is required to create an account' });

  // Invitation code MUST match a real existing user's UID.
  const { data: referrer } = await supabaseAdmin.from('users').select('id, username').eq('uid', invitationCode).maybeSingle();
  if (!referrer) {
    return res.status(400).json({ error: 'Invalid invitation code. Please check the code and try again.' });
  }

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .or(`username.eq.${username},email.eq.${email}`)
    .maybeSingle();
  if (existing) return res.status(409).json({ error: 'Username or email already registered' });

  const uid = generateUid();
  const hash = await bcrypt.hash(password, 10);

  const { data: newUser, error: insertErr } = await supabaseAdmin
    .from('users')
    .insert({
      uid,
      username,
      email,
      mobile,
      password_hash: hash,
      full_name: username,
      referred_by: referrer.id,
    })
    .select()
    .single();

  if (insertErr) return res.status(500).json({ error: 'Could not create account' });

  // Log the signup itself so new accounts are visible in the admin All Records view.
  await logRecord({
    userId: newUser.id,
    type: 'signup',
    amount: 0,
    status: 'completed',
    description: `New account created (${email})${referrer ? ` — invited by ${referrer.username}` : ''}`,
  });

  // Log the referral immediately so it shows up in the referrer's Team list right away.
  // reference_id = the new (referred) user's id, so earnings can be grouped per-referral later.
  await logRecord({
    userId: referrer.id,
    type: 'referral_bonus',
    referenceId: newUser.id,
    amount: 0,
    status: 'completed',
    description: `${username} joined using your invitation code`,
  });

  const token = await createSession({ userId: newUser.id });

  return res.status(200).json({
    success: true,
    token,
    user: {
      id: newUser.id,
      uid: newUser.uid,
      username: newUser.username,
      email: newUser.email,
      balance: 0.0,
      credit_score: 100,
      kyc_status: 'unverified',
    },
  });
}
