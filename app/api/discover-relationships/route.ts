import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { WORLD_BANK_INDICATORS, fetchIndicatorHistoryForCountry } from "@/lib/worldbank";
import { lagCorrelation } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Real, one-off discovery of lag-correlations to seed the `relationships`
// table -- the same lagCorrelation() engine already live on /correlations
// (LagCorrelationTool), just run systematically across every indicator
// pair and lag instead of one pair a visitor picks by hand. Real World
// Bank history in, real Pearson r out -- nothing here is invented. Only
// keeps a finding if it clears a real bar (|r| >= MIN_R, n >= MIN_N) --
// screening ~230 pairs x 6 lags per country is enough combinations that a
// weak, lower bar would start finding "significant" correlations by
// chance alone (the standard multiple-comparisons problem), which is
// exactly the false-confidence the roadmap explicitly warned against
// building this feature on top of.
//
// Keeps only the single strongest lag per (country, indicator pair) --
// reporting every lag that clears the bar would just be near-duplicate
// noise around the same real relationship, not additional information.
//
// Temporary route: run once, verify, delete. Not part of the live app.

const COUNTRIES: Record<string, string> = { GB: "United Kingdom", PK: "Pakistan", US: "United States" };
const MIN_R = 0.6;
const MIN_N = 15;
const LAGS = [0, 1, 2, 3, 4, 5];

export async function POST() {
  const supabase = supabaseServer();

  const { data: entities, error: entityError } = await supabase
    .from("entities")
    .select("id, code")
    .eq("type", "country")
    .in("code", Object.keys(COUNTRIES));
  if (entityError || !entities) {
    return NextResponse.json({ error: entityError?.message ?? "could not load entities" }, { status: 500 });
  }
  const entityIdByCode: Record<string, string> = {};
  for (const e of entities) entityIdByCode[e.code as string] = e.id;

  const indicatorCodes = Object.keys(WORLD_BANK_INDICATORS);
  const rows: Record<string, unknown>[] = [];
  const summary: Record<string, unknown>[] = [];

  for (const countryCode of Object.keys(COUNTRIES)) {
    const entityId = entityIdByCode[countryCode];
    if (!entityId) continue;

    // Fetch each indicator's real history for this country once, reused
    // across every pair -- 22 fetches per country, not 231*6.
    const historyByIndicator = new Map<string, { year: number; value: number }[]>();
    for (const code of indicatorCodes) {
      try {
        const history = await fetchIndicatorHistoryForCountry(code, countryCode);
        historyByIndicator.set(code, history);
      } catch {
        historyByIndicator.set(code, []);
      }
    }

    let found = 0;
    for (let i = 0; i < indicatorCodes.length; i++) {
      for (let j = 0; j < indicatorCodes.length; j++) {
        if (i === j) continue;
        const codeA = indicatorCodes[i];
        const codeB = indicatorCodes[j];
        const seriesA = historyByIndicator.get(codeA) ?? [];
        const seriesB = historyByIndicator.get(codeB) ?? [];
        if (seriesA.length < MIN_N || seriesB.length < MIN_N) continue;

        let best: { lag: number; r: number; n: number } | null = null;
        for (const lag of LAGS) {
          const result = lagCorrelation(seriesA, seriesB, lag);
          if (result.r === null || result.n < MIN_N) continue;
          if (Math.abs(result.r) < MIN_R) continue;
          if (!best || Math.abs(result.r) > Math.abs(best.r)) best = { lag, r: result.r, n: result.n };
        }
        if (!best) continue;

        rows.push({
          entity_id: entityId,
          indicator_a_name: WORLD_BANK_INDICATORS[codeA].label,
          indicator_b_name: WORLD_BANK_INDICATORS[codeB].label,
          lag_period: best.lag === 0 ? "same year" : `${best.lag} year${best.lag > 1 ? "s" : ""}`,
          correlation_strength: best.r,
          sample_size: best.n,
          status: "active",
        });
        found++;
      }
    }
    summary.push({ country: COUNTRIES[countryCode], pairs_found: found });
  }

  const { error: insertError } = await supabase.from("relationships").insert(rows);
  if (insertError) return NextResponse.json({ error: insertError.message, summary }, { status: 500 });

  return NextResponse.json({ inserted: rows.length, summary });
}
