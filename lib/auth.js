// lib/auth.js
import crypto from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

const SESSION_LIFETIME_HOURS = 72;

// Admin/agent panels hold sensitive controls, so their sessions expire after a
// short period of inactivity. Every authenticated admin request slides this
// window forward (see requireAdmin), so an actively-used panel never logs out
// mid-task — only an idle one does.
const ADMIN_IDLE_TIMEOUT_MINUTES = 5;

/** Generate a secure random token. */
export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Generate a unique account UID like GT-4821-XK9P. */
export function generateUid() {
  const part1 = String(Math.floor(1000 + Math.random() * 9000));
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part2 = '';
  for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
  return `GT-${part1}-${part2}`;
}

/** Create a session row (for a user OR an admin) and return the token. */
export async function createSession({ userId = null, adminId = null }) {
  const token = generateToken();
  const expiresAt = adminId
    ? new Date(Date.now() + ADMIN_IDLE_TIMEOUT_MINUTES * 60 * 1000).toISOString()
    : new Date(Date.now() + SESSION_LIFETIME_HOURS * 3600 * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from('sessions')
    .insert({ user_id: userId, admin_id: adminId, token, expires_at: expiresAt });
  if (error) throw error;
  return token;
}

/** Extract the Bearer token from a Next.js API request. */
export function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/Bearer\s+(\S+)/);
  return match ? match[1] : null;
}

/**
 * Require a valid logged-in user session.
 * On success returns the user row. On failure, sends the JSON error response
 * itself and returns null — callers should `if (!user) return;` right after.
 */
export async function requireUser(req, res) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('user_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .not('user_id', 'is', null)
    .maybeSingle();

  if (!session) {
    res.status(401).json({ error: 'Session expired, please log in again' });
    return null;
  }
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', session.user_id)
    .maybeSingle();

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return null;
  }
  if (user.status !== 'active') {
    res.status(403).json({ error: `Your account is ${user.status}. Contact support.` });
    return null;
  }
  return user;
}

/** Same idea as requireUser, but for the admin panel's API routes. */
export async function requireAdmin(req, res) {
  const token = getBearerToken(req) || req.cookies?.admin_token;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('admin_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .not('admin_id', 'is', null)
    .maybeSingle();

  if (!session) {
    res.status(401).json({ error: 'Session expired, please log in again' });
    return null;
  }
  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('*')
    .eq('id', session.admin_id)
    .maybeSingle();

  if (!admin) {
    res.status(401).json({ error: 'Admin not found' });
    return null;
  }

  // Slide the idle window forward — the panel only expires after real inactivity.
  const newExpiry = new Date(Date.now() + ADMIN_IDLE_TIMEOUT_MINUTES * 60 * 1000).toISOString();
  await supabaseAdmin.from('sessions').update({ expires_at: newExpiry }).eq('token', token);

  return admin;
}

/** Log an entry into the unified records/activity table. */
export async function logRecord({ userId, type, referenceId = null, amount = 0, status = null, description }) {
  await supabaseAdmin.from('records').insert({
    user_id: userId,
    type,
    reference_id: referenceId,
    amount,
    status,
    description,
  });
}

/** Basic required-field validator. Returns an error string or null. */
export function validateRequired(body, fields) {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || String(body[f]).trim() === '') {
      return `Missing required field: ${f}`;
    }
  }
  return null;
}

/**
 * Upload a base64 data-URL image to Supabase Storage.
 * Returns the public URL, or null if dataUrl is empty/invalid.
 */
export async function uploadBase64Image(dataUrl, pathPrefix) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;

  const match = dataUrl.match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
  if (!match) return null;

  const mime = match[1];
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const buffer = Buffer.from(match[3], 'base64');

  if (buffer.length > 5 * 1024 * 1024) return null; // 5MB limit

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
  const filename = `${pathPrefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;

  const { error } = await supabaseAdmin.storage.from(bucket).upload(filename, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    console.error('Storage upload failed:', error.message);
    return null;
  }

  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(filename);
  return pub?.publicUrl || null;
}
