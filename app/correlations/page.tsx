import { supabaseServer, fetchAllRows } from "@/lib/supabase";
import { pearson } from "@/lib/stats";
import { interpretPair } from "@/lib/insight-meaning";
import { displayCountryName } from "@/lib/display-name";
import LagCorrelationTool from "@/components/LagCorrelationTool";
import ProjectionTool from "@/components/ProjectionTool";
import PatternBrowser, { type PatternPair } from "@/components/PatternBrowser";
import type { Entity } from "@/lib/types";

export const revalidate = 3600;
export const metadata = {
  title: "Correlations — AllForecasts",
  description:
    "Find genuine lead-lag relationships between economic and social indicators. Run a live country-level correlation calculator or project one indicator forward, built on real World Bank history.",
};

interface IndicatorRow {
  entity_id: string;
  name: string;
  category: string;
  value: number;
}

interface PairResult {
  a: string;
  b: string;
  categoryA: string;
  categoryB: string;
  r: number;
  n: number;
}

async function computeCorrelations(): Promise<{ pairs: PairResult[]; entities: Entity[]; loadError: string | null }> {
  try {
    const supabase = supabaseServer();
    // PostgREST caps every response at ~1000 rows server-side no matter what
    // range is requested -- with 18 indicators x 217 countries that silently
    // truncated to ~6 indicators worth of data. fetchAllRows pages past it.
    const [rows, entitiesRes] = await Promise.all([
      fetchAllRows<IndicatorRow>((from, to) =>
        supabase
          .from("indicators")
          .select("entity_id, name, category, value, entity:entities!inner(type)")
          .eq("entity.type", "country")
          .range(from, to) as unknown as PromiseLike<{ data: IndicatorRow[] | null; error: { message: string } | null }>
      ),
      supabase.from("entities").select("id, type, name, code").eq("type", "country").order("name").range(0, 9999),
    ]);

    // name -> entity_id -> value (most recent World Bank pull is one row
    // per entity per indicator, so this is a clean 1:1 map)
    const byIndicator = new Map<string, Map<string, number>>();
    const categoryOf = new Map<string, string>();
    for (const row of rows) {
      // Postgres `numeric` columns come back as JSON strings via PostgREST
      // (arbitrary precision, so it won't silently assume float-safe) --
      // coerce explicitly or `+` on two of these string-concatenates instead
      // of adding, which is exactly the bug that shipped here first.
      const value = Number(row.value);
      if (!Number.isFinite(value)) continue;
      if (!byIndicator.has(row.name)) byIndicator.set(row.name, new Map());
      byIndicator.get(row.name)!.set(row.entity_id, value);
      categoryOf.set(row.name, row.category);
    }

    const names = Array.from(byIndicator.keys()).sort();
    const pairs: PairResult[] = [];

    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = names[i];
        const b = names[j];
        const mapA = byIndicator.get(a)!;
        const mapB = byIndicator.get(b)!;
        const xs: number[] = [];
        const ys: number[] = [];
        for (const [entityId, valueA] of mapA) {
          const valueB = mapB.get(entityId);
          if (valueB !== undefined) {
            xs.push(valueA);
            ys.push(valueB);
          }
        }
        const r = pearson(xs, ys);
        if (r !== null && xs.length >= 20) {
          pairs.push({ a, b, categoryA: categoryOf.get(a)!, categoryB: categoryOf.get(b)!, r, n: xs.length });
        }
      }
    }

    pairs.sort((p, q) => Math.abs(q.r) - Math.abs(p.r));
    return { pairs, entities: (entitiesRes.data as Entity[]) ?? [], loadError: null };
  } catch (err) {
    return { pairs: [], entities: [], loadError: err instanceof Error ? err.message : String(err) };
  }
}

export default async function CorrelationsPage() {
  const { pairs, entities, loadError } = await computeCorrelations();
  const crossCategory = pairs.filter((p) => p.categoryA !== p.categoryB);
  const top: PatternPair[] = crossCategory.slice(0, 12).map((p) => {
    const { meaning, personas } = interpretPair(p.a, p.categoryA, p.b, p.categoryB, p.r);
    return { ...p, meaning, personas };
  });
  const entityOptions = entities
    .filter((e) => e.code)
    .map((e) => ({ code: e.code as string, name: displayCountryName(e.code, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="section pt-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="eyebrow mb-3">Correlations</div>
        <h1 className="text-3xl font-medium mb-3">Compare any two indicators</h1>
        <p className="text-ink-soft max-w-2xl mb-8">
          Pick a country and two indicators to see whether one tends to lead the other — built for
          a government sizing up policy trade-offs, a business scouting a market, a city planner,
          or a person deciding where to move. Real data, computed live, shown as-is.
        </p>

        {loadError ? (
          <p className="font-mono text-sm text-warn">Could not reach the database ({loadError}).</p>
        ) : (
          <>
            <h2 className="section-title mb-4">Compare two indicators over time</h2>
            <LagCorrelationTool entities={entityOptions} />

            <h2 className="section-title mt-10 mb-4">Project one indicator forward</h2>
            <ProjectionTool entities={entityOptions} />

            <div className="mt-8">
              <PatternBrowser pairs={top} totalPairs={pairs.length} crossCategoryCount={crossCategory.length} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
