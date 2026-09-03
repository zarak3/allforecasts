import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { TRACKED_STOCKS, fetchDailyCloses } from "@/lib/stocks";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Real daily close history for each tracked stock, via Alpha Vantage.
// One request per symbol (8 total, well under the 25/day free-tier cap),
// so this is a daily cron, not a live-poll-per-visitor design -- the free
// tier genuinely can't support that. Stored as `indicators` rows against
// a `business`-type entity per symbol, reusing the generic schema exactly
// like every other real data source on this site, delete-then-reinsert
// each run so the ~100-day window stays current (same pattern as
// refresh-indicators, not an incremental accumulator).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing ALPHA_VANTAGE_API_KEY" }, { status: 500 });
  }

  const supabase = supabaseServer();
  const errors: string[] = [];

  const { data: entities, error: entityError } = await supabase
    .from("entities")
    .upsert(
      TRACKED_STOCKS.map((s) => ({ type: "business", name: s.name, code: s.symbol })),
      { onConflict: "type,code" }
    )
    .select("id, code");
  if (entityError || !entities) {
    return NextResponse.json({ error: entityError?.message ?? "entity upsert failed" }, { status: 500 });
  }
  const entityIdByCode: Record<string, string> = {};
  for (const e of entities) entityIdByCode[e.code as string] = e.id;

  let inserted = 0;
  for (const stock of TRACKED_STOCKS) {
    const entityId = entityIdByCode[stock.symbol];
    if (!entityId) continue;
    try {
      const closes = await fetchDailyCloses(stock.symbol, apiKey);

      await supabase
        .from("indicators")
        .delete()
        .eq("entity_id", entityId)
        .eq("name", "Stock price (close)")
        .eq("source", "Alpha Vantage");

      const rows = closes.map((c) => ({
        entity_id: entityId,
        name: "Stock price (close)",
        category: "markets",
        source: "Alpha Vantage",
        source_code: stock.symbol,
        value: c.close,
        unit: "USD",
        period: c.date,
      }));
      const { error: insertError } = await supabase.from("indicators").insert(rows);
      if (insertError) errors.push(`${stock.symbol}: ${insertError.message}`);
      else inserted += rows.length;
    } catch (err) {
      errors.push(`${stock.symbol}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ symbols: TRACKED_STOCKS.length, inserted, errors });
}
