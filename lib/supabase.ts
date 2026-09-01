import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only client. Uses the service_role key so it can read AND write,
// bypassing RLS -- this file must never be imported from a "use client" component.
// Read access from Server Components goes through here too, which keeps every
// Supabase credential out of the browser bundle entirely.
function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing env var ${name}. Copy .env.local.example to .env.local and fill in your Supabase project's values.`
    );
  }
  return value;
}

export function supabaseServer() {
  return createClient(
    getEnv("SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
}
