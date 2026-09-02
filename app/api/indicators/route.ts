import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, fetchAllRows } from "@/lib/supabase";
import type { Indicator } from "@/lib/types";

export const revalidate = 3600; // cache for 1 hour

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const entityType = searchParams.get("entity_type") ?? "country";

  const supabase = supabaseServer();
  try {
    // PostgREST caps every response at ~1000 rows server-side regardless of
    // the range requested, so this paginates rather than relying on .range().
    const data = await fetchAllRows<Indicator>((from, to) => {
      let query = supabase
        .from("indicators")
        .select("id, name, category, source, value, unit, period, entity:entities!inner(id, type, name, code)")
        .eq("entity.type", entityType)
        .order("name")
        .range(from, to);
      if (category) query = query.eq("category", category);
      return query as unknown as PromiseLike<{ data: Indicator[] | null; error: { message: string } | null }>;
    });

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
