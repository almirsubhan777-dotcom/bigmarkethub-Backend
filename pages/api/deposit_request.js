// pages/api/deposit_request.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser, logRecord, uploadBase64Image } from '../../lib/auth';

// Base64 images can be large; raise the body size limit for this route only.
export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res);
  if (!user) return;

  const body = req.body || {};
  const amount = Number(body.amount || 0);
  const network = String(body.network || 'TRC20');
  const address = String(body.deposit_address || '').trim();
  const proofDataUrl = body.proof_screenshot || null; // base64 data URL, optional

  if (amount < 10) return res.status(400).json({ error: 'Minimum deposit is 10 USDT' });
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
