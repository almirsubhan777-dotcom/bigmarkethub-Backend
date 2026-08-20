// pages/api/admin/me.js
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  return res.status(200).json({
    success: true,
    admin: {
      id: admin.id,
      username: admin.username,
      full_name: admin.full_name,
      role: admin.role || 'admin',
      credit_balance: Number(admin.credit_balance || 0),
    },
  });
}
