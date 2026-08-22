// pages/api/deposit_request.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser, logRecord, uploadBase64Image } from '../../lib/auth';

// Base64 images can be large; raise the body size limit for this route only.
export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};

/** The smallest amount this user is currently allowed to deposit. */
async function getMinimumDepositFor(userId) {
  const { data: approved } = await supabaseAdmin
    .from('deposits')
    .select('amount')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('amount', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Each new deposit must exceed the largest one approved so far.
  // First-ever deposit still only needs to meet the platform's base minimum (10 USDT).
  return approved ? Number(approved.amount) : 10;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req, res);
  if (!user) return;

  const minDeposit = await getMinimumDepositFor(user.id);

  // GET: let the frontend show the customer their current minimum before they submit.
  if (req.method === 'GET') {
    return res.status(200).json({ success: true, minimum_deposit: minDeposit });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const amount = Number(body.amount || 0);
  const network = String(body.network || 'TRC20');
  const address = String(body.deposit_address || '').trim();
  const proofDataUrl = body.proof_screenshot || null; // base64 data URL, optional

  if (amount <= minDeposit) {
    return res.status(400).json({ error: `Your next deposit must be more than $${minDeposit.toFixed(2)}.` });
  }
  if (!address) return res.status(400).json({ error: 'Deposit address is required' });

  const proofUrl = proofDataUrl ? await uploadBase64Image(proofDataUrl, `deposit_u${user.id}`) : null;

  const { data: deposit, error } = await supabaseAdmin
    .from('deposits')
    .insert({
      user_id: user.id,
      amount,
      network,
      deposit_address: address,
      proof_screenshot_url: proofUrl,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Could not submit deposit request' });

  await logRecord({
    userId: user.id,
    type: 'deposit',
    referenceId: deposit.id,
    amount,
    status: 'pending',
    description: `Deposit request of ${amount} USDT submitted, awaiting admin review`,
  });

  return res.status(200).json({
    success: true,
    message: 'Deposit request submitted. It will be reviewed by our team shortly.',
    deposit_id: deposit.id,
  });
}
