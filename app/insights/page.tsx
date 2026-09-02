import { supabaseServer, fetchAllRows } from "@/lib/supabase";
import { pearson } from "@/lib/stats";
import { interpretPair } from "@/lib/insight-meaning";
import { displayCountryName } from "@/lib/display-name";
import LagCorrelationTool from "@/components/LagCorrelationTool";
import type { Entity } from "@/lib/types";

export const revalidate = 3600;
export const metadata = { title: "Insights — AllForecasts" };

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

function RBar({ r }: { r: number }) {
  const pct = Math.round(Math.abs(r) * 100);
  return (
    <div className="flex items-center gap-2 w-full max-w-[160px]">
      <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${r > 0 ? "bg-good" : "bg-warn"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-mono text-xs shrink-0 ${r > 0 ? "text-good" : "text-warn"}`}>
        {r > 0 ? "+" : ""}
        {r.toFixed(2)}
      </span>
    </div>
  );
}

export default async function InsightsPage() {
  const { pairs, entities, loadError } = await computeCorrelations();
  const crossCategory = pairs.filter((p) => p.categoryA !== p.categoryB);
  const top = crossCategory.slice(0, 12);
  const entityOptions = entities
    .filter((e) => e.code)
    .map((e) => ({ code: e.code as string, name: displayCountryName(e.code, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="section pt-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="eyebrow mb-3">Screening</div>
        <h1 className="text-3xl font-medium mb-3">Insights</h1>
        <p className="text-ink-soft max-w-2xl mb-4">
          What actually moves together, across 217 countries. Built for a government sizing up
          policy trade-offs, a business scouting a market, a city planner, or a person deciding
          where to move — a starting point for what&apos;s worth digging into, not a finished
          answer. All of it real, computed from public data, and shown as-is — nothing here is
          smoothed over to make a stronger story than the numbers support.
        </p>

        {loadError ? (
          <p className="font-mono text-sm text-warn">
            Could not reach the database ({loadError}).
          </p>
        ) : (
          <>
            <h2 className="section-title">Strongest relationships right now</h2>
            <div className="flex flex-col gap-4 mb-10">
              {top.map((p) => {
                const { meaning, personas } = interpretPair(p.a, p.categoryA, p.b, p.categoryB, p.r);
                return (
                  <div key={`${p.a}|${p.b}`} className="card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="text-sm">
                        <span className="text-ink">{p.a}</span>
                        <span className="text-ink-soft mx-1.5">↔</span>
                        <span className="text-ink">{p.b}</span>
                      </div>
                      <RBar r={p.r} />
                    </div>
                    <p className="text-sm text-ink-soft mb-3">{meaning}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {personas.map((persona) => (
                        <span
                          key={persona}
                          className="font-mono text-[11px] uppercase tracking-wide px-2 py-1 rounded bg-accent/10 text-accent"
                        >
                          {persona}
                        </span>
                      ))}
                      <span className="font-mono text-[11px] text-ink-soft ml-auto">
                        {p.n} countries · {p.categoryA} × {p.categoryB}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="font-mono text-xs text-ink-soft mb-14">
              {pairs.length} pairs screened in total ({crossCategory.length} cross-category). r ranges
              from -1 (perfectly opposite) to +1 (perfectly together); anything under ~0.3 in either
              direction is weak. Some pairs are related by definition (GDP and GNI per capita
              measure almost the same thing) rather than by real discovery — read the number, not
              just the ranking.
            </p>

            <h2 className="section-title">Run your own comparison</h2>
            <p className="text-ink-soft max-w-2xl mb-5 text-sm">
              The table above compares every country at a single moment. This checks one
              country&apos;s own history over time instead — does a change in one indicator show
              up in another a few years later.
            </p>
            <LagCorrelationTool entities={entityOptions} />
          </>
        )}
      </div>
    </main>
  );
}
