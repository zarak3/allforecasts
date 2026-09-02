import { NextRequest, NextResponse } from "next/server";
import { WORLD_BANK_INDICATORS, fetchIndicatorHistoryForCountry } from "@/lib/worldbank";
import { linearTrendForecast } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country");
  const code = searchParams.get("indicator");
  const yearsAhead = Number(searchParams.get("years") ?? "1");

  if (!country || !code) {
    return NextResponse.json({ error: "Missing country or indicator" }, { status: 400 });
  }
  const meta = WORLD_BANK_INDICATORS[code];
  if (!meta) {
    return NextResponse.json({ error: "Unknown indicator code" }, { status: 400 });
  }
  if (!Number.isFinite(yearsAhead) || yearsAhead < 1 || yearsAhead > 10) {
    return NextResponse.json({ error: "Years ahead must be between 1 and 10" }, { status: 400 });
  }

  try {
    const history = await fetchIndicatorHistoryForCountry(code, country);
    if (history.length === 0) {
      return NextResponse.json({ error: "No historical data for this country/indicator" }, { status: 404 });
    }
    const points = history.map((h) => ({ x: h.year, y: h.value }));
    const projected = linearTrendForecast(points, yearsAhead);
    const lastYear = Math.max(...points.map((p) => p.x));

    return NextResponse.json({
      data: {
        label: meta.label,
        unit: meta.unit,
        projected,
        targetYear: lastYear + yearsAhead,
        lastKnownYear: lastYear,
        lastKnownValue: points.find((p) => p.x === lastYear)?.y ?? null,
        pointsUsed: points.length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
