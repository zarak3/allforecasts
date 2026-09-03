import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { brierScore, reliabilityBuckets } from "@/lib/stats";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import type { Prediction } from "@/lib/types";

export const revalidate = 900;

function resolveStatus(p: Pick<Prediction, "status" | "outcome" | "outcome_correct">) {
  return p.status ?? (p.outcome !== null ? (p.outcome_correct ? "confirmed" : "missed") : "pending");
}

// Public, read-only. Same computation as the /backtest page (real
// resolved predictions, both live and backtest, tagged so a consumer can
// tell which), not a separate/simplified number.
export async function GET(req: NextRequest) {
  const limit = rateLimit(clientKey(req));
  if (!limit.ok) {
    return NextResponse.json({ error: "rate limit exceeded, try again shortly" }, { status: 429 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("predictions")
    .select("status, outcome, outcome_correct, confidence_pct, is_backtest");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const resolved = (data ?? []).filter((p) => resolveStatus(p) !== "pending");
  const confirmed = resolved.filter((p) => resolveStatus(p) === "confirmed");
  const withConfidence = resolved
    .filter((p) => p.confidence_pct !== null)
    .map((p) => ({ confidencePct: p.confidence_pct as number, correct: resolveStatus(p) === "confirmed" }));

  const brier = brierScore(withConfidence.map((f) => ({ probability: f.confidencePct / 100, correct: f.correct })));
  const buckets = reliabilityBuckets(withConfidence);

  return NextResponse.json(
    {
      resolved_count: resolved.length,
      live_resolved_count: resolved.filter((p) => !p.is_backtest).length,
      backtest_resolved_count: resolved.filter((p) => p.is_backtest).length,
      hit_rate_pct: resolved.length > 0 ? Math.round((confirmed.length / resolved.length) * 100) : null,
      brier_score: brier,
      reliability_buckets: buckets,
    },
    {
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "public, s-maxage=900, stale-while-revalidate=1800",
        "x-ratelimit-remaining": String(limit.remaining),
      },
    }
  );
}
