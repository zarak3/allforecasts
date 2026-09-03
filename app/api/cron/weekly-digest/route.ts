import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { brierScore, reliabilityBuckets } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Generates the weekly digest content: real resolved predictions and real
// new alerts from the last 7 days, plus current calibration stats (same
// computation as /api/public/calibration), then has Gemini narrate that
// real data into a plain-language summary -- the same "stats compute, AI
// narrates" split as everywhere else, never inventing a number itself.
//
// Doesn't send anything yet -- there's no email-sending service configured
// (a separate real decision from the model this runs on). This returns the
// generated digest as JSON so it can be reviewed/wired to a real send step
// once that's chosen.

async function narrate(apiKey: string, payload: Record<string, unknown>): Promise<string> {
  const prompt = `You are writing AllForecasts' weekly digest email. Use ONLY the real data given below -- never invent a number, a prediction, or an alert that isn't listed. If a section is empty, say so plainly rather than padding it. Keep the tone plain-language, honest about uncertainty, no hype -- matching a site whose whole point is showing misses as prominently as hits.

Real data for this week:
${JSON.stringify(payload, null, 2)}

Write a short weekly digest (resolved predictions this week, new alerts this week, current calibration snapshot). Plain text, no markdown headers, suitable as an email body.`;

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  const result = await res.json();
  const parts = result.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: { text?: string }) => p.text ?? "").join("\n") || "(Gemini returned no text)";
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
  }

  const supabase = supabaseServer();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [predictionsRes, alertsRes, allPredictionsRes] = await Promise.all([
    supabase
      .from("predictions")
      .select("title, call, status, outcome, resolved_at, entity:entities(name)")
      .eq("is_backtest", false)
      .not("resolved_at", "is", null)
      .gte("resolved_at", sevenDaysAgo),
    supabase.from("alerts").select("type, description, triggered_at, entity:entities(name)").gte("triggered_at", sevenDaysAgo),
    supabase.from("predictions").select("status, outcome, outcome_correct, confidence_pct"),
  ]);

  const resolvedThisWeek = predictionsRes.data ?? [];
  const alertsThisWeek = alertsRes.data ?? [];

  const resolveStatus = (p: { status: string | null; outcome: string | null; outcome_correct: boolean | null }) =>
    p.status ?? (p.outcome !== null ? (p.outcome_correct ? "confirmed" : "missed") : "pending");
  const resolved = (allPredictionsRes.data ?? []).filter((p) => resolveStatus(p) !== "pending");
  const confirmed = resolved.filter((p) => resolveStatus(p) === "confirmed");
  const withConfidence = resolved
    .filter((p) => p.confidence_pct !== null)
    .map((p) => ({ confidencePct: p.confidence_pct as number, correct: resolveStatus(p) === "confirmed" }));
  const brier = brierScore(withConfidence.map((f) => ({ probability: f.confidencePct / 100, correct: f.correct })));

  const payload = {
    resolved_predictions_this_week: resolvedThisWeek,
    new_alerts_this_week: alertsThisWeek,
    calibration_snapshot: {
      total_resolved: resolved.length,
      hit_rate_pct: resolved.length > 0 ? Math.round((confirmed.length / resolved.length) * 100) : null,
      brier_score: brier,
      reliability_buckets: reliabilityBuckets(withConfidence),
    },
  };

  try {
    const digest = await narrate(apiKey, payload);
    return NextResponse.json({ digest, data: payload });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err), data: payload }, { status: 502 });
  }
}
