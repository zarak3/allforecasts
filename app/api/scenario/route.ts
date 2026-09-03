import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { WORLD_BANK_INDICATORS, fetchIndicatorHistoryForCountry } from "@/lib/worldbank";
import { stdev, propagateViaCorrelation } from "@/lib/stats";

export const dynamic = "force-dynamic";

const LABEL_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(WORLD_BANK_INDICATORS).map(([code, meta]) => [meta.label, code])
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const relationshipId = searchParams.get("relationshipId");
  const changePct = Number(searchParams.get("changePct"));
  if (!relationshipId || !Number.isFinite(changePct)) {
    return NextResponse.json({ error: "Missing relationshipId or changePct" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data: rel, error } = await supabase
    .from("relationships")
    .select("*, entity:entities(code, name)")
    .eq("id", relationshipId)
    .eq("status", "active")
    .maybeSingle();
  if (error || !rel) return NextResponse.json({ error: "Relationship not found" }, { status: 404 });

  const countryCode = (rel.entity as { code: string } | null)?.code;
  const codeA = LABEL_TO_CODE[rel.indicator_a_name];
  const codeB = LABEL_TO_CODE[rel.indicator_b_name];
  if (!countryCode || !codeA || !codeB) {
    return NextResponse.json({ error: "Could not resolve indicator codes for this relationship" }, { status: 500 });
  }

  const [historyA, historyB] = await Promise.all([
    fetchIndicatorHistoryForCountry(codeA, countryCode),
    fetchIndicatorHistoryForCountry(codeB, countryCode),
  ]);
  if (historyA.length === 0 || historyB.length === 0) {
    return NextResponse.json({ error: "No current real data available for this indicator pair" }, { status: 502 });
  }

  const latestA = historyA[historyA.length - 1];
  const latestB = historyB[historyB.length - 1];
  const stdevA = stdev(historyA.map((h) => h.value));
  const stdevB = stdev(historyB.map((h) => h.value));

  const changedValueA = latestA.value * (1 + changePct / 100);
  const projectedB = propagateViaCorrelation(changedValueA, latestA.value, stdevA, stdevB, latestB.value, rel.correlation_strength);

  return NextResponse.json({
    country: (rel.entity as { name: string } | null)?.name,
    indicator_a: { label: rel.indicator_a_name, unit: WORLD_BANK_INDICATORS[codeA].unit, latest_value: latestA.value, latest_year: latestA.year, changed_value: changedValueA },
    indicator_b: { label: rel.indicator_b_name, unit: WORLD_BANK_INDICATORS[codeB].unit, latest_value: latestB.value, latest_year: latestB.year, projected_value: projectedB },
    lag_period: rel.lag_period,
    correlation_strength: rel.correlation_strength,
    sample_size: rel.sample_size,
  });
}
