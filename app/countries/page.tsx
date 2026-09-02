import { supabaseServer, fetchAllRows } from "@/lib/supabase";
import CountryExplorer from "@/components/CountryExplorer";
import type { Indicator, Entity } from "@/lib/types";

export const revalidate = 3600;
export const metadata = {
  title: "Country data — AllForecasts",
  description:
    "Real GDP, inflation, health, education, and defence data for every country, sourced live from the World Bank — browse or compare indicators side by side.",
};

async function getData(): Promise<{ indicators: Indicator[]; entities: Entity[]; loadError: string | null }> {
  try {
    const supabase = supabaseServer();
    // PostgREST caps every response at ~1000 rows server-side regardless of
    // the range requested -- we have 3000+ indicator rows, so this needs
    // real pagination, not just a bigger .range().
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
    return {
      indicators,
      entities: (entitiesRes.data as Entity[]) ?? [],
      loadError: null,
    };
  } catch (err) {
    return {
      indicators: [],
      entities: [],
      loadError: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function CountriesPage() {
  const { indicators, entities, loadError } = await getData();

  return (
    <main className="section pt-16">
      <div className="max-w-5xl mx-auto px-6">
        <div className="eyebrow mb-3">Countries</div>
        <h1 className="text-3xl font-medium mb-3">Indicator comparison</h1>
        <p className="text-ink-soft max-w-xl mb-10">
          GDP, debt, inflation, jobs, health, and defence spending for 217 countries — the same
          numbers a government would use to benchmark policy, a business to size up a market, or
          a person to check what they&apos;re moving into. Pick a country on the map, the globe, or
          the dropdown.
        </p>

        {loadError ? (
          <p className="font-mono text-sm text-warn">
            Could not reach the database ({loadError}). Check <code>SUPABASE_URL</code> and{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> in your environment.
          </p>
        ) : (
          <CountryExplorer indicators={indicators} entities={entities} />
        )}
      </div>
    </main>
  );
}
