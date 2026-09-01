import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import {
  WORLD_BANK_INDICATORS,
  fetchAllCountries,
  fetchWorldBankIndicatorForAllCountries,
} from "@/lib/worldbank";

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
  }

  const rows: Record<string, unknown>[] = [];

  for (const [code, meta] of Object.entries(WORLD_BANK_INDICATORS)) {
    try {
      const entries = await fetchWorldBankIndicatorForAllCountries(code, countryCodes);
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
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
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
