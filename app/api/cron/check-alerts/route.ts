import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { fetchIndicatorHistoryForCountry, WORLD_BANK_INDICATORS } from "@/lib/worldbank";
import { TRACKED_STOCKS } from "@/lib/stocks";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Real anomaly detection: fetch real World Bank history for each tracked
// series, compute the mean/stdev of every point EXCEPT the most recent
// (so the trailing statistic never includes the value being tested), and
// flag it as an anomaly only if the real latest value is >2 standard
// deviations from that real trailing mean. Idempotent -- skips a series/
// year combo that's already been alerted on, so re-running this doesn't
// duplicate alerts every time the cron fires.
//
// Event-driven (GDELT-triggered) and surprise-triggered (consensus-
// triggered) alert types from the roadmap aren't implemented here yet:
// GDELT's endpoint was timing out from this environment when checked, and
// consensus_benchmarks has no real rows yet to trigger against. Both slot
// into the same `alerts` table (via `type`) once those are ready -- this
// route only handles `type = 'anomaly'`.

const ENTITIES: Record<string, string> = {
  GB: "4784db13-b7d2-4556-8aa1-46d8997ab27d",
  PK: "b3a2e2f1-61f6-4642-a947-b608d286d66c",
  US: "875db61c-7f97-4093-8355-de8fef988597",
};
const COUNTRY_NAMES: Record<string, string> = { GB: "UK", PK: "Pakistan", US: "US" };
const TRACKED_INDICATORS = ["NY.GDP.MKTP.KD.ZG", "FP.CPI.TOTL.ZG", "SL.UEM.TOTL.ZS"];
const Z_THRESHOLD = 2;
const MIN_HISTORY = 8;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const created: Record<string, unknown>[] = [];
  const skipped: Record<string, unknown>[] = [];

  for (const country of Object.keys(ENTITIES)) {
    for (const indicator of TRACKED_INDICATORS) {
      const meta = WORLD_BANK_INDICATORS[indicator];
      try {
        const history = await fetchIndicatorHistoryForCountry(indicator, country);
        if (history.length < MIN_HISTORY + 1) {
          skipped.push({ country, indicator, reason: "not enough history" });
          continue;
        }

        const latest = history[history.length - 1];
        const prior = history.slice(0, -1).map((h) => h.value);
        const mean = prior.reduce((a, b) => a + b, 0) / prior.length;
        const variance = prior.reduce((a, b) => a + (b - mean) ** 2, 0) / prior.length;
        const stdev = Math.sqrt(variance);
        if (stdev === 0) {
          skipped.push({ country, indicator, reason: "zero variance in trailing history" });
          continue;
        }
        const z = (latest.value - mean) / stdev;

        if (Math.abs(z) < Z_THRESHOLD) {
          skipped.push({ country, indicator, z: Number(z.toFixed(2)), reason: "below threshold" });
          continue;
        }

        const marker = `${meta.label} (${latest.year})`;
        const { data: existing } = await supabase
          .from("alerts")
          .select("id")
          .eq("entity_id", ENTITIES[country])
          .eq("indicator_name", meta.label)
          .ilike("description", `%${latest.year}%`)
          .limit(1);
        if (existing && existing.length > 0) {
          skipped.push({ country, indicator, reason: "already alerted", marker });
          continue;
        }

        const direction = z > 0 ? "above" : "below";
        const description = `${COUNTRY_NAMES[country]} ${meta.label} came in at ${latest.value.toFixed(2)}${meta.unit === "%" ? "%" : ` ${meta.unit}`} for ${latest.year} — ${Math.abs(z).toFixed(2)} standard deviations ${direction} the trailing mean of ${mean.toFixed(2)}${meta.unit === "%" ? "%" : ` ${meta.unit}`} (based on ${prior.length} years of real World Bank history through ${history[history.length - 2].year}).`;

        const { error: insertError } = await supabase.from("alerts").insert({
          type: "anomaly",
          entity_id: ENTITIES[country],
          indicator_name: meta.label,
          z_score: z,
          description,
        });
        if (insertError) {
          skipped.push({ country, indicator, reason: `insert failed: ${insertError.message}` });
        } else {
          created.push({ country, indicator, z: Number(z.toFixed(2)), marker });
        }
      } catch (err) {
        skipped.push({ country, indicator, reason: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  // Stock anomalies: same z-score method, but reading real daily closes
  // already stored by refresh-stocks rather than re-fetching from Alpha
  // Vantage -- stays within the free tier's daily quota regardless of how
  // often this cron runs.
  for (const stock of TRACKED_STOCKS) {
    try {
      const { data: entity } = await supabase.from("entities").select("id").eq("type", "business").eq("code", stock.symbol).maybeSingle();
      if (!entity) {
        skipped.push({ stock: stock.symbol, reason: "no entity yet -- refresh-stocks hasn't run" });
        continue;
      }
      const { data: rows, error: histError } = await supabase
        .from("indicators")
        .select("value, period")
        .eq("entity_id", entity.id)
        .eq("name", "Stock price (close)")
        .eq("source", "Alpha Vantage")
        .order("period", { ascending: true });
      if (histError || !rows || rows.length < MIN_HISTORY + 1) {
        skipped.push({ stock: stock.symbol, reason: "not enough stored history" });
        continue;
      }

      const latest = rows[rows.length - 1];
      const prior = rows.slice(0, -1).map((r) => Number(r.value));
      const mean = prior.reduce((a, b) => a + b, 0) / prior.length;
      const variance = prior.reduce((a, b) => a + (b - mean) ** 2, 0) / prior.length;
      const stdev = Math.sqrt(variance);
      if (stdev === 0) {
        skipped.push({ stock: stock.symbol, reason: "zero variance in trailing history" });
        continue;
      }
      const z = (Number(latest.value) - mean) / stdev;
      if (Math.abs(z) < Z_THRESHOLD) {
        skipped.push({ stock: stock.symbol, z: Number(z.toFixed(2)), reason: "below threshold" });
        continue;
      }

      const { data: existing } = await supabase
        .from("alerts")
        .select("id")
        .eq("entity_id", entity.id)
        .eq("indicator_name", "Stock price (close)")
        .ilike("description", `%${latest.period}%`)
        .limit(1);
      if (existing && existing.length > 0) {
        skipped.push({ stock: stock.symbol, reason: "already alerted" });
        continue;
      }

      const direction = z > 0 ? "above" : "below";
      const description = `${stock.name} (${stock.symbol}) closed at $${Number(latest.value).toFixed(2)} on ${latest.period} — ${Math.abs(z).toFixed(2)} standard deviations ${direction} its trailing mean of $${mean.toFixed(2)} (based on ${prior.length} trading days of real Alpha Vantage history).`;

      const { error: insertError } = await supabase.from("alerts").insert({
        type: "anomaly",
        entity_id: entity.id,
        indicator_name: "Stock price (close)",
        z_score: z,
        description,
      });
      if (insertError) skipped.push({ stock: stock.symbol, reason: `insert failed: ${insertError.message}` });
      else created.push({ stock: stock.symbol, z: Number(z.toFixed(2)) });
    } catch (err) {
      skipped.push({ stock: stock.symbol, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ created: created.length, details: created, skipped });
}
