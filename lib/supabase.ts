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

// PostgREST enforces its own server-side max-rows cap (Supabase's default
// is 1000) regardless of the range you request -- `.range(0, 19999)` gets
// silently clamped back down to 1000 rows rather than erroring. The only
// reliable way past it is paginating in application code.
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    all.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
