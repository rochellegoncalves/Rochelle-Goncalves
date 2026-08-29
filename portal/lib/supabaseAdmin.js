import { createClient } from '@supabase/supabase-js';

// Server-only client using the service_role key. Bypasses Row Level
// Security entirely -- never import this in a client component, only in
// route handlers, and only after checking the caller is the owner.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
