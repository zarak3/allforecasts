import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const revalidate = 3600;

const MAX_LIMIT = 500;

// Public, read-only. ?country=GB, ?category=economic, ?limit=100&offset=0
// -- there are 4,800+ rows total, so pagination is mandatory, not optional,
// for anyone actually consuming this responsibly.
export async function GET(req: NextRequest) {
  const limit = rateLimit(clientKey(req));
  if (!limit.ok) {
    return NextResponse.json({ error: "rate limit exceeded, try again shortly" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country");
  const category = searchParams.get("category");
  const pageLimit = Math.min(MAX_LIMIT, Number(searchParams.get("limit")) || 100);
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

  const supabase = supabaseServer();
  let query = supabase
    .from("indicators")
    .select("name, category, source, value, unit, period, entity:entities!inner(type, name, code)", { count: "exact" })
    .range(offset, offset + pageLimit - 1);

  if (country) query = query.eq("entity.code", country.toUpperCase());
  if (category) query = query.eq("category", category);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { total: count ?? 0, limit: pageLimit, offset, indicators: data ?? [] },
    {
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=7200",
        "x-ratelimit-remaining": String(limit.remaining),
      },
    }
  );
}
