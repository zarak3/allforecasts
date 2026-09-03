import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import {
  WORLD_BANK_INDICATORS,
  fetchAllCountries,
  fetchWorldBankIndicatorForAllCountries,
  fetchWorldBankHistoryForAllCountries,
} from "@/lib/worldbank";
import { linearTrendForecast, zScores } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Triggered daily by Vercel Cron (see vercel.json). Can also be called
// manually: curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/refresh-indicators
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const errors: string[] = [];

  const countries = await fetchAllCountries();
  const countryCodes = new Set(countries.map((c) => c.code));

  const { data: entities, error: entityError } = await supabase
    .from("entities")
    .upsert(
      countries.map((c) => ({ type: "country", name: c.name, code: c.code })),
      { onConflict: "type,code" }
    )
    .select("id, code");

  if (entityError || !entities) {
    return NextResponse.json({ error: entityError?.message ?? "entity upsert failed" }, { status: 500 });
  }

  const entityIdByCode: Record<string, string> = {};
  for (const e of entities) entityIdByCode[e.code as string] = e.id;
  const entityIds = Object.values(entityIdByCode);

  const indicatorLabels = Object.values(WORLD_BANK_INDICATORS).map((i) => i.label);
  for (const idBatch of chunk(entityIds, 200)) {
    const { error: deleteError } = await supabase
      .from("indicators")
      .delete()
      .in("entity_id", idBatch)
      .in("name", indicatorLabels)
      .eq("source", "World Bank");
    if (deleteError) errors.push(deleteError.message);

    const { error: deleteModelError } = await supabase
      .from("indicators")
      .delete()
      .in("entity_id", idBatch)
      .eq("source", "AllForecasts model");
    if (deleteModelError) errors.push(deleteModelError.message);
  }

  const rows: Record<string, unknown>[] = [];
  // Captured alongside the raw insert rows for the Country Risk Scorecard
  // below -- cross-sectional (all countries, this indicator) real values,
  // reused rather than re-fetched.
  const byIndicatorCountry = new Map<string, Map<string, number>>();

  for (const [code, meta] of Object.entries(WORLD_BANK_INDICATORS)) {
    try {
      const entries = await fetchWorldBankIndicatorForAllCountries(code, countryCodes);
      const countryValues = new Map<string, number>();
      for (const entry of entries) {
        const entityId = entityIdByCode[entry.countryiso2code];
        if (!entityId || entry.value === null) continue;
        rows.push({
          entity_id: entityId,
          name: meta.label,
          category: meta.category,
          source: "World Bank",
          source_code: code,
          value: entry.value,
          unit: meta.unit,
          period: `${entry.date}-01-01`,
        });
        countryValues.set(entry.countryiso2code, entry.value);
      }
      byIndicatorCountry.set(code, countryValues);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  // Naive per-country GDP growth projection: ordinary least-squares trend
  // over the last 8 years of real World Bank data, extrapolated one year
  // forward. This is a mechanical statistical baseline, not a researched
  // call -- it's tagged with a distinct source so it never gets confused
  // with the raw World Bank figures or the hand-researched predictions.
  try {
    const history = await fetchWorldBankHistoryForAllCountries("NY.GDP.MKTP.KD.ZG", countryCodes, 8);
    const byCountry = new Map<string, { x: number; y: number }[]>();
    for (const entry of history) {
      if (entry.value === null) continue;
      if (!byCountry.has(entry.countryiso2code)) byCountry.set(entry.countryiso2code, []);
      byCountry.get(entry.countryiso2code)!.push({ x: Number(entry.date), y: entry.value });
    }
    const currentYear = new Date().getUTCFullYear();
    for (const [code, points] of byCountry) {
      const entityId = entityIdByCode[code];
      if (!entityId || points.length === 0) continue;
      const projected = linearTrendForecast(points);
      if (projected === null || !Number.isFinite(projected)) continue;
      const lastYear = Math.max(...points.map((p) => p.x));
      rows.push({
        entity_id: entityId,
        name: "GDP growth, next period (projected)",
        category: "economic",
        source: "AllForecasts model",
        source_code: "MODEL.GDP.TREND",
        value: projected,
        unit: "%",
        period: `${Math.max(lastYear + 1, currentYear)}-01-01`,
      });
    }

    // Macro Regime Classifier: a simple, fully transparent rule over the
    // same real GDP growth history just fetched above -- latest growth
    // <=0 is a contraction; positive and accelerating (>= the prior year)
    // is an expansion; positive but decelerating is a slowdown. This
    // describes the CURRENT real state, not a forecast -- deliberately no
    // backtested "accuracy %" is claimed for it, since that would need an
    // authoritative regime-dating ground truth (NBER-style) that only
    // exists for the US, not for Pakistan or most other countries, and
    // holding one country to a different validation standard than the
    // rest would be worse than not claiming a number at all.
    for (const [code, points] of byCountry) {
      const entityId = entityIdByCode[code];
      if (!entityId || points.length < 2) continue;
      const sorted = [...points].sort((a, b) => a.x - b.x);
      const latest = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      const regime = latest.y <= 0 ? -1 : latest.y >= prev.y ? 1 : 0;
      rows.push({
        entity_id: entityId,
        name: "Macro regime (rule-based)",
        category: "composite",
        source: "AllForecasts model",
        source_code: "MODEL.REGIME",
        value: regime,
        unit: "-1=contraction, 0=slowdown, 1=expansion",
        period: `${Math.max(latest.x + 1, currentYear)}-01-01`,
      });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  // Country Risk Scorecard: equal-weighted average of real cross-sectional
  // z-scores across 7 World Bank indicators already fetched above (higher
  // = healthier; indicators where higher is normally worse -- unemployment,
  // inflation, infant mortality, government debt -- are sign-flipped
  // before averaging). Deliberately simple and fully disclosed rather than
  // a "sophisticated" weighting scheme this project can't defend. Scored
  // only for countries with at least 5 of the 7 real values present --
  // World Bank coverage is genuinely spotty for some series (literacy
  // rate especially), and averaging over fewer than that would lean too
  // heavily on 1-2 indicators to call it a composite.
  try {
    const COMPOSITE_INDICATORS: { code: string; higherIsBetter: boolean }[] = [
      { code: "NY.GDP.PCAP.CD", higherIsBetter: true },
      { code: "SL.UEM.TOTL.ZS", higherIsBetter: false },
      { code: "FP.CPI.TOTL.ZG", higherIsBetter: false },
      { code: "SP.DYN.LE00.IN", higherIsBetter: true },
      { code: "SP.DYN.IMRT.IN", higherIsBetter: false },
      { code: "SE.ADT.LITR.ZS", higherIsBetter: true },
      { code: "GC.DOD.TOTL.GD.ZS", higherIsBetter: false },
    ];
    const MIN_COMPOSITE_INDICATORS = 5;
    const currentYear = new Date().getUTCFullYear();

    const zByIndicator = new Map<string, Map<string, number>>();
    for (const { code } of COMPOSITE_INDICATORS) {
      const countryValues = byIndicatorCountry.get(code);
      if (!countryValues || countryValues.size === 0) continue;
      const codes = Array.from(countryValues.keys());
      const z = zScores(codes.map((c) => countryValues.get(c) as number));
      const map = new Map<string, number>();
      codes.forEach((c, i) => map.set(c, z[i]));
      zByIndicator.set(code, map);
    }

    for (const countryCode of countryCodes) {
      const entityId = entityIdByCode[countryCode];
      if (!entityId) continue;
      const contributions: number[] = [];
      for (const { code, higherIsBetter } of COMPOSITE_INDICATORS) {
        const z = zByIndicator.get(code)?.get(countryCode);
        if (z === undefined) continue;
        contributions.push(higherIsBetter ? z : -z);
      }
      if (contributions.length < MIN_COMPOSITE_INDICATORS) continue;
      const score = contributions.reduce((a, b) => a + b, 0) / contributions.length;
      rows.push({
        entity_id: entityId,
        name: "Country Risk Scorecard (composite z-score)",
        category: "composite",
        source: "AllForecasts model",
        source_code: "MODEL.RISK.SCORE",
        value: score,
        unit: "z-score",
        period: `${currentYear}-01-01`,
      });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  let inserted = 0;
  for (const rowBatch of chunk(rows, 500)) {
    const { error: insertError } = await supabase.from("indicators").insert(rowBatch);
    if (insertError) errors.push(insertError.message);
    else inserted += rowBatch.length;
  }

  return NextResponse.json({
    countries: countries.length,
    entities: entities.length,
    inserted,
    errors,
  });
}
