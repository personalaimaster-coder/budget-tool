import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service role key.
// All DB access goes through API routes so the public anon key never touches data
// and RLS can deny anonymous access entirely.
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // Thrown at request time (not import time in edge), surfaced clearly in logs.
  console.warn(
    "[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
  );
}

export function getSupabaseAdmin() {
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase env vars are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
