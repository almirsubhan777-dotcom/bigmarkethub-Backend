// pages/api/profile.js
import { requireUser } from '../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req, res);
  if (!user) return;

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
    },
  });
}
