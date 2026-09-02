import { NextRequest, NextResponse } from "next/server";
import { COMMODITIES, CURRENCIES, fetchCommodity, fetchCurrency } from "@/lib/markets";

export const revalidate = 300; // 5 min -- real prices, refreshed often without hammering the upstream APIs

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") ?? "";
  const range = searchParams.get("range") ?? "1m";

  const commodity = COMMODITIES.find((c) => c.symbol === symbol);
  const currency = CURRENCIES.find((c) => c.symbol === symbol);
  if (!commodity && !currency) {
    return NextResponse.json({ error: `Unknown symbol "${symbol}"` }, { status: 400 });
  }

  try {
    const series = commodity ? await fetchCommodity(symbol, range) : await fetchCurrency(symbol, range);
    return NextResponse.json(
      { data: series },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
