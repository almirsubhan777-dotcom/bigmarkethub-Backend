// pages/api/admin/kyc.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin, logRecord } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    const status = String(req.query.status || 'pending');
    let query = supabaseAdmin
      .from('kyc_verifications')
      .select('*, users(username, uid, email)')
      .order('submitted_at', { ascending: false })
      .limit(200);
    if (status !== 'all') query = query.eq('status', status);
    const { data: kycs, error } = await query;
    if (error) return res.status(500).json({ error: 'Could not fetch KYC requests' });
    return res.status(200).json({ success: true, kycs });
  }

  if (req.method === 'POST') {
    const { kyc_id, decision, notes } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });

    const { data: kyc } = await supabaseAdmin.from('kyc_verifications').select('*').eq('id', kyc_id).single();
    if (!kyc || kyc.status !== 'pending') return res.status(400).json({ error: 'KYC request not found or already reviewed' });

    await supabaseAdmin
      .from('kyc_verifications')
      .update({
        status: decision,
        admin_notes: notes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
      })
      .eq('id', kyc_id);

    const newUserStatus = decision === 'approved' ? 'verified' : 'rejected';
    await supabaseAdmin.from('users').update({ kyc_status: newUserStatus }).eq('id', kyc.user_id);

    await logRecord({
      userId: kyc.user_id,
      type: 'kyc',
      referenceId: kyc.id,
      amount: 0,
      status: decision,
      description: `Identity verification ${decision} by admin` + (notes ? `: ${notes}` : ''),
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
