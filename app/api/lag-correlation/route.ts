import { NextRequest, NextResponse } from "next/server";
import { WORLD_BANK_INDICATORS, fetchIndicatorHistoryForCountry } from "@/lib/worldbank";
import { lagCorrelation } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country");
  const codeA = searchParams.get("a");
  const codeB = searchParams.get("b");
  const lag = Number(searchParams.get("lag") ?? "0");

  if (!country || !codeA || !codeB) {
    return NextResponse.json({ error: "Missing country, a, or b" }, { status: 400 });
  }
  if (!WORLD_BANK_INDICATORS[codeA] || !WORLD_BANK_INDICATORS[codeB]) {
    return NextResponse.json({ error: "Unknown indicator code" }, { status: 400 });
  }
  if (!Number.isFinite(lag) || lag < 0 || lag > 10) {
    return NextResponse.json({ error: "Lag must be between 0 and 10 years" }, { status: 400 });
  }

  try {
    const [seriesA, seriesB] = await Promise.all([
      fetchIndicatorHistoryForCountry(codeA, country),
      fetchIndicatorHistoryForCountry(codeB, country),
    ]);
    const result = lagCorrelation(seriesA, seriesB, lag);
    return NextResponse.json({
      data: {
        ...result,
        labelA: WORLD_BANK_INDICATORS[codeA].label,
        labelB: WORLD_BANK_INDICATORS[codeB].label,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
