import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const revalidate = 3600; // cache for 1 hour

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const entityType = searchParams.get("entity_type") ?? "country";

  const supabase = supabaseServer();
  let query = supabase
    .from("indicators")
    .select("id, name, category, source, value, unit, period, entity:entities!inner(id, type, name, code)")
    .eq("entity.type", entityType)
    .order("name");

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}
