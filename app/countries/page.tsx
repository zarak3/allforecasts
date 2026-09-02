import { supabaseServer } from "@/lib/supabase";
import CountryExplorer from "@/components/CountryExplorer";
import type { Indicator, Entity } from "@/lib/types";

export const revalidate = 3600;
export const metadata = { title: "Country data — AllForecasts" };

async function getData(): Promise<{ indicators: Indicator[]; entities: Entity[]; loadError: string | null }> {
  try {
    const supabase = supabaseServer();
    const [indicatorsRes, entitiesRes] = await Promise.all([
      supabase
        .from("indicators")
        .select("id, name, category, source, value, unit, period, entity:entities!inner(id, type, name, code)")
        .eq("entity.type", "country")
        .order("name")
        .range(0, 19999), // default PostgREST cap is 1000 rows -- we have 3000+
      supabase.from("entities").select("id, type, name, code").eq("type", "country").order("name").range(0, 9999),
    ]);
    if (indicatorsRes.error) throw new Error(indicatorsRes.error.message);
    if (entitiesRes.error) throw new Error(entitiesRes.error.message);
    return {
      indicators: (indicatorsRes.data as unknown as Indicator[]) ?? [],
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
        <div className="eyebrow mb-3">Country view</div>
        <h1 className="text-3xl font-medium mb-3">Indicator comparison</h1>
        <p className="text-ink-soft max-w-xl mb-10">
          Live from the generic <code className="font-mono text-sm">entities</code> /{" "}
          <code className="font-mono text-sm">indicators</code> schema — the same structure every
          future view (city, business, person) reads from. Pick a country on the map, the globe,
          or the dropdown.
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
