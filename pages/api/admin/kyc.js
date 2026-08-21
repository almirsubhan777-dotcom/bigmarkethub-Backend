// pages/api/admin/kyc.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin, logRecord } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if ((admin.role || 'admin') !== 'admin') { return res.status(403).json({ error: 'Agents do not have access to this section.' }); }

  if (req.method === 'GET') {
    const status = String(req.query.status || 'pending');
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();

    let query = supabaseAdmin
      .from('kyc_verifications')
      .select('*, users(username, uid, email)')
      .order('submitted_at', { ascending: false })
      .limit(300);

    if (status !== 'all') query = query.eq('status', status);
    if (from) query = query.gte('submitted_at', new Date(from + 'T00:00:00Z').toISOString());
    if (to) query = query.lte('submitted_at', new Date(to + 'T23:59:59Z').toISOString());

    const { data: kycs, error } = await query;
    if (error) return res.status(500).json({ error: 'Could not fetch KYC requests' });
    return res.status(200).json({ success: true, kycs });
  }

  if (req.method === 'POST') {
    const { kyc_id, decision, notes, action } = req.body || {};

    if (action === 'delete') {
      // Remove the stored document images from Storage too, so nothing sensitive lingers.
      const { data: kyc } = await supabaseAdmin
        .from('kyc_verifications')
        .select('front_id_url, back_id_url, selfie_url')
        .eq('id', kyc_id)
        .maybeSingle();

      if (kyc) {
        const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
        const paths = [kyc.front_id_url, kyc.back_id_url, kyc.selfie_url]
          .filter(Boolean)
          .map((url) => url.split(`/${bucket}/`)[1])
          .filter(Boolean);
        if (paths.length) {
          await supabaseAdmin.storage.from(bucket).remove(paths);
        }
      }

      const { error } = await supabaseAdmin.from('kyc_verifications').delete().eq('id', kyc_id);
      if (error) return res.status(500).json({ error: 'Could not delete KYC record' });
      return res.status(200).json({ success: true });
    }

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
