import { supabaseServer } from "@/lib/supabase";
import { displayCountryName } from "@/lib/display-name";
import { surpriseIndex } from "@/lib/stats";
import type { ConsensusBenchmark } from "@/lib/types";

export const revalidate = 900;
export const metadata = {
  title: "Consensus — AllForecasts",
  description:
    "Where a public consensus figure existed, the honest comparison: what consensus said, what we said, and what actually happened — including when we lost to consensus.",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function getBenchmarks(): Promise<{ benchmarks: ConsensusBenchmark[]; loadError: string | null }> {
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("consensus_benchmarks")
      .select("*, entity:entities(id, type, name, code), prediction:predictions(id, title)")
      .order("release_date", { ascending: false });
    if (error) throw new Error(error.message);
    return { benchmarks: (data as unknown as ConsensusBenchmark[]) ?? [], loadError: null };
  } catch (err) {
    return { benchmarks: [], loadError: err instanceof Error ? err.message : String(err) };
  }
}

export default async function ConsensusPage() {
  const { benchmarks, loadError } = await getBenchmarks();

  const complete = benchmarks.filter(
    (b) => b.consensus_value !== null && b.our_predicted_value !== null && b.actual_value !== null
  );
  const surprise = surpriseIndex(
    complete.map((b) => ({
      consensusValue: b.consensus_value as number,
      ourPredictedValue: b.our_predicted_value as number,
      actualValue: b.actual_value as number,
    }))
  );

  return (
    <main className="section pt-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="eyebrow mb-3">Vs. the professionals</div>
        <h1 className="text-3xl font-medium mb-3">Consensus</h1>
        <p className="text-ink-soft max-w-xl mb-8">
          Where a public consensus figure existed (Reuters, Bloomberg, ONS, IMF preliminary
          estimates), the honest comparison: consensus said X, we said Y, actual was Z — shown
          even when we lost to consensus.
        </p>

        {loadError ? (
          <p className="font-mono text-sm text-warn">Could not reach the database ({loadError}).</p>
        ) : benchmarks.length === 0 ? (
          <p className="font-mono text-sm text-ink-soft">
            No consensus comparisons recorded yet — this page fills in only where a real public
            consensus figure exists for one of our predictions.
          </p>
        ) : (
          <>
            <div className="card px-5 py-4 inline-block mb-8">
              <div className="font-mono text-2xl text-accent">
                {surprise.hitRatePct !== null ? `${surprise.hitRatePct}%` : "—"}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                Surprise Index — called the surprise direction right{" "}
                {surprise.callsWithRealSurprise > 0 && `(${surprise.calledCorrectly}/${surprise.callsWithRealSurprise})`}
              </div>
            </div>
            <p className="font-mono text-[11px] text-ink-soft mb-10">
              A distinct, harder metric than raw accuracy: not just was the actual close to our
              number, but did we correctly anticipate which way the actual would deviate from
              consensus, and did consensus deviate at all. Rows where the actual matched consensus
              exactly (no real surprise) aren&apos;t counted either way.
            </p>

            <div className="flex flex-col gap-3">
              {benchmarks.map((b) => (
                <div key={b.id} className="card p-5">
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <span className="text-sm text-ink">
                      {b.entity ? `${displayCountryName(b.entity.code, b.entity.name)} — ` : ""}
                      {b.indicator_name}
                    </span>
                    <span className="font-mono text-xs text-ink-soft shrink-0">{formatDate(b.release_date)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 font-mono text-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-ink-soft">Consensus said</div>
                      <div className="text-ink">{b.consensus_value ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-ink-soft">We said</div>
                      <div className="text-ink">{b.our_predicted_value ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-ink-soft">Actual was</div>
                      <div className="text-ink">{b.actual_value ?? "not yet resolved"}</div>
                    </div>
                  </div>
                  {b.prediction && (
                    <a href={`/predictions#${b.prediction.id}`} className="font-mono text-[11px] text-accent mt-2 inline-block">
                      See the call →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
