import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const revalidate = 900;

// Public, read-only, real predictions only -- is_backtest=true rows never
// appear here, same separation as the Predictions page. This is meant for
// other builders/students to consume directly, so the shape mirrors what's
// shown on-site, not an internal representation.
export async function GET(req: NextRequest) {
  const limit = rateLimit(clientKey(req));
  if (!limit.ok) {
    return NextResponse.json({ error: "rate limit exceeded, try again shortly" }, { status: 429 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("predictions")
    .select(
      "title, call, reasoning, confidence_pct, signal_summary, falsification_condition, status, outcome, published_at, resolves_at, resolved_at, entity:entities(name, code)"
    )
    .eq("is_backtest", false)
    .order("resolves_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { count: data?.length ?? 0, predictions: data ?? [] },
    {
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "public, s-maxage=900, stale-while-revalidate=1800",
        "x-ratelimit-remaining": String(limit.remaining),
      },
    }
  );
}
