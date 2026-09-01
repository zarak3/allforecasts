import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const revalidate = 900; // 15 minutes -- predictions/resolutions change more often near release dates

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .order("resolves_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } }
  );
}
