import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { brierScore, reliabilityBuckets } from "@/lib/stats";
import { callGemini } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Generates the weekly digest content: real resolved predictions and real
// new alerts from the last 7 days, plus current calibration stats (same
// computation as /api/public/calibration), then has an LLM narrate that
// real data into a plain-language summary -- the same "stats compute, AI
// narrates" split as everywhere else, never inventing a number itself.
//
// Doesn't send anything yet -- there's no email-sending service configured
// (a separate real decision from the model this runs on). This returns the
// generated digest as JSON so it can be reviewed/wired to a real send step
// once that's chosen.
//
// Same Gemini-primary, Groq-fallback pattern as Zeno (app/api/ask), for the
// same reason -- confirmed live that Gemini's free tier caps at 20
// requests/day, and this cron sharing a Google Cloud project with Zeno's
// live testing can genuinely collide with that cap on the same day.

function buildPrompt(payload: Record<string, unknown>): string {
  return `You are writing AllForecasts' weekly digest email. Use ONLY the real data given below -- never invent a number, a prediction, or an alert that isn't listed. If a section is empty, say so plainly rather than padding it. Keep the tone plain-language, honest about uncertainty, no hype -- matching a site whose whole point is showing misses as prominently as hits. Plain text only, no markdown.

Real data for this week:
${JSON.stringify(payload, null, 2)}

Write a short weekly digest (resolved predictions this week, new alerts this week, current calibration snapshot). Plain text, no markdown headers, suitable as an email body.`;
}

async function narrateWithGemini(apiKey: string, payload: Record<string, unknown>): Promise<string> {
  const result = await callGemini(apiKey, { contents: [{ role: "user", parts: [{ text: buildPrompt(payload) }] }] });
  const candidate = (result.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined)?.[0];
  const parts = candidate?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("\n") || "(Gemini returned no text)";
}

async function narrateWithGroq(apiKey: string, payload: Record<string, unknown>): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: buildPrompt(payload) }],
      max_tokens: 1000,
    }),
  });
  if (!res.ok) throw new Error(`Groq API error: ${res.status} ${await res.text()}`);
  const result = await res.json();
  return result.choices?.[0]?.message?.content || "(Groq returned no text)";
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (!geminiKey && !groqKey) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY and GROQ_API_KEY" }, { status: 500 });
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
    supabase.from("predictions").select("status, outcome, outcome_correct, confidence_pct").eq("is_backtest", false),
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

  if (geminiKey) {
    try {
      const digest = await narrateWithGemini(geminiKey, payload);
      return NextResponse.json({ digest, data: payload, narrated_by: "gemini" });
    } catch (err) {
      if (!isQuotaError(err) || !groqKey) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err), data: payload }, { status: 502 });
      }
    }
  }

  try {
    const digest = await narrateWithGroq(groqKey!, payload);
    return NextResponse.json({ digest, data: payload, narrated_by: "groq" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err), data: payload }, { status: 502 });
  }
}
