import { supabaseServer, fetchAllRows } from "@/lib/supabase";
import CompareCountries from "@/components/CompareCountries";
import type { Indicator, Entity } from "@/lib/types";

export const revalidate = 3600;
export const metadata = {
  title: "Compare — AllForecasts",
  description: "Side-by-side comparison of real indicators across any countries you pick.",
};

async function getData(): Promise<{ indicators: Indicator[]; entities: Entity[]; loadError: string | null }> {
  try {
    const supabase = supabaseServer();
    const [indicators, entitiesRes] = await Promise.all([
      fetchAllRows<Indicator>((from, to) =>
        supabase
          .from("indicators")
          .select("id, name, category, source, value, unit, period, entity:entities!inner(id, type, name, code)")
          .eq("entity.type", "country")
          .order("name")
          .range(from, to) as unknown as PromiseLike<{ data: Indicator[] | null; error: { message: string } | null }>
      ),
      supabase.from("entities").select("id, type, name, code").eq("type", "country").order("name").range(0, 9999),
    ]);
    if (entitiesRes.error) throw new Error(entitiesRes.error.message);
    return { indicators, entities: (entitiesRes.data as Entity[]) ?? [], loadError: null };
  } catch (err) {
    return { indicators: [], entities: [], loadError: err instanceof Error ? err.message : String(err) };
  }
}

export default async function ComparePage() {
  const { indicators, entities, loadError } = await getData();

  return (
    <main className="section pt-16">
      <div className="max-w-5xl mx-auto px-6">
        <div className="eyebrow mb-3">Side by side</div>
        <h1 className="text-3xl font-medium mb-3">Compare</h1>
        <p className="text-ink-soft max-w-xl mb-10">
          Pick any countries to see their real tracked indicators — GDP, inflation, health,
          education, defence, and the composite scores — side by side, same source data as the
          country pages.
        </p>

        {loadError ? (
          <p className="font-mono text-sm text-warn">Could not reach the database ({loadError}).</p>
        ) : (
          <CompareCountries indicators={indicators} entities={entities} />
        )}
      </div>
    </main>
  );
}
