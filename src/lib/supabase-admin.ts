import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service_role key, which bypasses
// Row Level Security. Nothing in this file may be imported from a Client
// Component — the `server-only` import above makes that a build error if it
// happens by accident. All database access for the app goes through this
// client, called from Server Actions / Server Components / Route Handlers.

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local."
  );
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
