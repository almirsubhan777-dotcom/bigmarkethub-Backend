// pages/api/kyc_submit.js
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUser, logRecord, uploadBase64Image } from '../../lib/auth';

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } }, // three images in one request
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res);
  if (!user) return;

  if (user.kyc_status === 'pending') return res.status(409).json({ error: 'Your verification is already under review.' });
  if (user.kyc_status === 'verified') return res.status(409).json({ error: 'Your account is already verified.' });

  const body = req.body || {};
  const documentType = body.document_type;
  const address = String(body.address || '').trim();
  const allowedTypes = ['national_id', 'passport', 'license'];

  if (!allowedTypes.includes(documentType)) return res.status(400).json({ error: 'Invalid document type' });

  const [frontUrl, backUrl, selfieUrl] = await Promise.all([
    uploadBase64Image(body.front_id, `front_u${user.id}`),
    uploadBase64Image(body.back_id, `back_u${user.id}`),
    uploadBase64Image(body.selfie, `selfie_u${user.id}`),
  ]);

  if (!frontUrl || !backUrl || !selfieUrl) {
    return res.status(400).json({ error: 'Front ID, back ID, and selfie are all required (JPEG/PNG/WebP, under 5MB each).' });
  }

  const { data: kyc, error } = await supabaseAdmin
    .from('kyc_verifications')
    .insert({
      user_id: user.id,
      document_type: documentType,
      address,
      front_id_url: frontUrl,
      back_id_url: backUrl,
      selfie_url: selfieUrl,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'Could not submit verification' });

  await supabaseAdmin.from('users').update({ kyc_status: 'pending' }).eq('id', user.id);

  await logRecord({
    userId: user.id,
    type: 'kyc',
    referenceId: kyc.id,
    amount: 0,
    status: 'pending',
    description: 'Identity verification documents submitted, awaiting review',
  });

  return res.status(200).json({
    success: true,
    message: 'Documents submitted. Your application is under review — typically within 24 hours.',
  });
}
