import { supabaseServer, fetchAllRows } from "@/lib/supabase";
import { pearson } from "@/lib/stats";

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

async function computeCorrelations(): Promise<{ pairs: PairResult[]; loadError: string | null }> {
  try {
    const supabase = supabaseServer();
    // PostgREST caps every response at ~1000 rows server-side no matter what
    // range is requested -- with 16 indicators x 217 countries that silently
    // truncated to ~6 indicators worth of data. fetchAllRows pages past it.
    const rows = await fetchAllRows<IndicatorRow>((from, to) =>
      supabase
        .from("indicators")
        .select("entity_id, name, category, value, entity:entities!inner(type)")
        .eq("entity.type", "country")
        .range(from, to) as unknown as PromiseLike<{ data: IndicatorRow[] | null; error: { message: string } | null }>
    );

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
    return { pairs, loadError: null };
  } catch (err) {
    return { pairs: [], loadError: err instanceof Error ? err.message : String(err) };
  }
}

export default async function InsightsPage() {
  const { pairs, loadError } = await computeCorrelations();
  const crossCategory = pairs.filter((p) => p.categoryA !== p.categoryB);

  return (
    <main className="section pt-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="eyebrow mb-3">Screening</div>
        <h1 className="text-3xl font-medium mb-3">Insights</h1>
        <p className="text-ink-soft max-w-2xl mb-4">
          A real first pass at the &quot;hidden relationship&quot; engine described in the{" "}
          <a href="/#method" className="underline">
            method
          </a>
          : Pearson correlation, computed across all 217 countries&apos; latest readings, for every
          pair of the indicators currently tracked.
        </p>
        <div className="card p-5 mb-10 text-sm text-ink-soft">
          <p className="mb-2">
            <b className="text-ink">What this is:</b> a cross-sectional screen — do two indicators move
            together across countries right now. It is a hypothesis-generation step, not a forecast.
          </p>
          <p className="mb-2">
            <b className="text-ink">What this isn&apos;t (yet):</b> this is not the lag-correlation /
            Granger causality method the site&apos;s actual predictions use — that needs historical
            time series per country, which is the next slice of this engine. Some pairs below are
            correlated by definition (GDP per capita and GNI per capita measure almost the same thing)
            rather than by genuine discovery — read the numbers, not just the ranking.
          </p>
          <p>
            <b className="text-ink">What&apos;s still missing:</b> the &quot;unusual&quot; alternative
            data (satellite night-lights, shipping traffic, search trends) described in the original
            vision needs paid/complex API access this build doesn&apos;t have yet. Everything below is
            public World Bank data, plus one AllForecasts-computed trend projection.
          </p>
        </div>

        {loadError ? (
          <p className="font-mono text-sm text-warn">
            Could not reach the database ({loadError}).
          </p>
        ) : (
          <>
            <h2 className="section-title">Strongest cross-category relationships</h2>
            <div className="overflow-x-auto mb-10">
              <table className="w-full text-sm border-collapse min-w-[640px]">
                <thead>
                  <tr className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                    <th className="text-left py-2 border-b border-line font-medium">Indicator A</th>
                    <th className="text-left py-2 border-b border-line font-medium">Indicator B</th>
                    <th className="text-left py-2 border-b border-line font-medium">r</th>
                    <th className="text-left py-2 border-b border-line font-medium">Countries (n)</th>
                  </tr>
                </thead>
                <tbody>
                  {crossCategory.slice(0, 20).map((p) => (
                    <tr key={`${p.a}|${p.b}`}>
                      <td className="py-2.5 border-b border-line">
                        {p.a} <span className="font-mono text-xs text-ink-soft">({p.categoryA})</span>
                      </td>
                      <td className="py-2.5 border-b border-line">
                        {p.b} <span className="font-mono text-xs text-ink-soft">({p.categoryB})</span>
                      </td>
                      <td className={`py-2.5 border-b border-line font-mono ${p.r > 0 ? "text-good" : "text-warn"}`}>
                        {p.r > 0 ? "+" : ""}
                        {p.r.toFixed(2)}
                      </td>
                      <td className="py-2.5 border-b border-line font-mono text-ink-soft">{p.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="font-mono text-xs text-ink-soft">
              {pairs.length} pairs screened in total ({crossCategory.length} cross-category). r ranges
              from -1 (perfectly opposite) to +1 (perfectly together); anything under ~0.3 in either
              direction is weak.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
