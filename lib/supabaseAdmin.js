// lib/supabaseAdmin.js
//
// Server-only Supabase client using the SERVICE ROLE key.
// This key bypasses Row Level Security, so it must NEVER be exposed to the
// browser — only import this file inside /pages/api/** (server code).

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    'Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and ' +
    'SUPABASE_SERVICE_ROLE_KEY in your .env.local or Hostinger environment variables.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
