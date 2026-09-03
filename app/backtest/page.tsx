import { supabaseServer } from "@/lib/supabase";
import { displayCountryName } from "@/lib/display-name";
import { brierScore, reliabilityBuckets } from "@/lib/stats";
import { MISS_CAUSE_LABEL, type Prediction } from "@/lib/types";

export const revalidate = 900;
export const metadata = {
  title: "Backtest — AllForecasts",
  description:
    "What our forecasts would have said before the outcome was known, and how close they came — hits and misses both, calibration over raw accuracy.",
};

function resolveStatus(p: Prediction) {
  return p.status ?? (p.outcome !== null ? (p.outcome_correct ? "confirmed" : "missed") : "pending");
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function getResolvedPredictions(): Promise<{ predictions: Prediction[]; loadError: string | null }> {
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("predictions")
      .select("*, entity:entities(id, type, name, code)")
      .order("resolves_at", { ascending: true });
    if (error) throw new Error(error.message);
    const all = (data as unknown as Prediction[]) ?? [];
    return { predictions: all.filter((p) => resolveStatus(p) !== "pending"), loadError: null };
  } catch (err) {
    return { predictions: [], loadError: err instanceof Error ? err.message : String(err) };
  }
}

export default async function BacktestPage() {
  const { predictions, loadError } = await getResolvedPredictions();

  const confirmed = predictions.filter((p) => resolveStatus(p) === "confirmed");
  const missed = predictions.filter((p) => resolveStatus(p) === "missed");
  const n = predictions.length;
  const hitRate = n > 0 ? Math.round((confirmed.length / n) * 100) : null;
  const backtestCount = predictions.filter((p) => p.is_backtest).length;
  const liveCount = n - backtestCount;

  const withConfidence = predictions.filter((p) => p.confidence_pct !== null);
  const avgConfidenceHits =
    confirmed.filter((p) => p.confidence_pct !== null).length > 0
      ? Math.round(
          confirmed.filter((p) => p.confidence_pct !== null).reduce((sum, p) => sum + (p.confidence_pct ?? 0), 0) /
            confirmed.filter((p) => p.confidence_pct !== null).length
        )
      : null;
  const avgConfidenceMisses =
    missed.filter((p) => p.confidence_pct !== null).length > 0
      ? Math.round(
          missed.filter((p) => p.confidence_pct !== null).reduce((sum, p) => sum + (p.confidence_pct ?? 0), 0) /
            missed.filter((p) => p.confidence_pct !== null).length
        )
      : null;

  const bestCall = [...confirmed].sort((a, b) => (b.confidence_pct ?? 0) - (a.confidence_pct ?? 0))[0] ?? null;
  const worstCall = [...missed].sort((a, b) => (b.confidence_pct ?? 0) - (a.confidence_pct ?? 0))[0] ?? null;

  const withConfidenceForCalibration = predictions
    .filter((p) => p.confidence_pct !== null)
    .map((p) => ({ confidencePct: p.confidence_pct as number, correct: resolveStatus(p) === "confirmed" }));
  const brier = brierScore(withConfidenceForCalibration.map((f) => ({ probability: f.confidencePct / 100, correct: f.correct })));
  const buckets = reliabilityBuckets(withConfidenceForCalibration);

  return (
    <main className="section pt-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="eyebrow mb-3">Would this have worked?</div>
        <h1 className="text-3xl font-medium mb-3">Backtest</h1>
        <p className="text-ink-soft max-w-xl mb-3">
          Anyone can claim a model works. This shows what it would have said before the outcome
          was known, using data the model never got to see in advance — hits and misses both.
        </p>
        <p className="font-mono text-xs text-ink-soft mb-8">
          Prefer a narrative read? See three of these as{" "}
          <a href="/case-studies" className="text-accent">
            strategy memos →
          </a>
        </p>

        {loadError ? (
          <p className="font-mono text-sm text-warn">
            Could not reach the database ({loadError}).
          </p>
        ) : n === 0 ? (
          <p className="font-mono text-sm text-ink-soft">
            No resolved predictions yet — this page fills in as real calls resolve. See{" "}
            <a href="/predictions" className="text-accent">
              pending predictions
            </a>{" "}
            in the meantime.
          </p>
        ) : (
          <>
            {n < 10 && (
              <p className="font-mono text-xs text-warn mb-3">
                Based on {n} resolved forecast{n === 1 ? "" : "s"} — the sample is still small; we&apos;ll
                expand this as the model runs longer. Treat this as an early read, not a settled track
                record.
              </p>
            )}
            {backtestCount > 0 && (
              <p className="font-mono text-xs text-ink-soft mb-6">
                {backtestCount} of {n} below are 🔬 backtested (a retrospective run of the model
                against real historical data, not a real-time call) — {liveCount} are 📡 actually
                published live predictions.
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
              <div className="card px-5 py-4">
                <div className="font-mono text-2xl text-ink">{n}</div>
                <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">Forecasts made</div>
              </div>
              <div className="card px-5 py-4">
                <div className="font-mono text-2xl text-accent">{hitRate}%</div>
                <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">Hit rate</div>
              </div>
              <div className="card px-5 py-4">
                <div className="font-mono text-2xl text-ink">
                  {avgConfidenceHits !== null ? `${avgConfidenceHits}%` : "—"}
                </div>
                <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">Avg. confidence, hits</div>
              </div>
              <div className="card px-5 py-4">
                <div className="font-mono text-2xl text-ink">
                  {avgConfidenceMisses !== null ? `${avgConfidenceMisses}%` : "—"}
                </div>
                <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">Avg. confidence, misses</div>
              </div>
            </div>

            {withConfidence.length < n && (
              <p className="font-mono text-[11px] text-ink-soft mb-8">
                {n - withConfidence.length} of {n} resolved calls predate the confidence-% field and
                aren&apos;t included in the calibration stats below.
              </p>
            )}

            <h2 className="section-title">Calibration</h2>
            <p className="text-sm text-ink-soft mb-4">
              Raw accuracy can be misleading — a model that&apos;s right 70% of the time when it claims
              95% confidence is a <i>worse</i> forecaster than one that&apos;s right 60% of the time when
              it claims 60%. Calibration checks whether stated confidence actually tracks with real
              outcomes.
            </p>
            {withConfidenceForCalibration.length === 0 ? (
              <p className="font-mono text-sm text-ink-soft mb-12">
                No resolved calls have a stated confidence % yet.
              </p>
            ) : (
              <div className="mb-12">
                <div className="card px-5 py-4 inline-block mb-4">
                  <div className="font-mono text-2xl text-ink">{brier?.toFixed(3) ?? "—"}</div>
                  <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                    Brier score (0 = perfect, 0.25 = coin-flip, 1 = worst)
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {buckets.map((b) => (
                    <div key={b.bucketLabel} className="flex items-center gap-3">
                      <span className="font-mono text-xs text-ink-soft w-20 shrink-0">{b.bucketLabel}</span>
                      {b.actualHitRatePct !== null ? (
                        <>
                          <div className="flex-1 h-2 bg-paper-raised rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${b.actualHitRatePct}%` }} />
                          </div>
                          <span className="font-mono text-xs text-ink w-24 shrink-0 text-right">
                            {b.actualHitRatePct}% actual (n={b.n})
                          </span>
                        </>
                      ) : (
                        <span className="font-mono text-xs text-ink-soft italic">
                          insufficient data (n={b.n}, need 10+)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(bestCall || worstCall) && (
              <div className="grid sm:grid-cols-2 gap-4 mb-12">
                {bestCall && (
                  <div className="card p-5">
                    <div className="font-mono text-[11px] uppercase tracking-wide text-good mb-1">Best call</div>
                    <div className="text-sm text-ink mb-1">{bestCall.title}</div>
                    <div className="font-mono text-xs text-ink-soft">
                      {formatDate(bestCall.resolved_at ?? bestCall.resolves_at)}
                      {bestCall.confidence_pct !== null && ` · stated ${bestCall.confidence_pct}% confidence`}
                    </div>
                  </div>
                )}
                {worstCall && (
                  <div className="card p-5">
                    <div className="font-mono text-[11px] uppercase tracking-wide text-warn mb-1">Worst call</div>
                    <div className="text-sm text-ink mb-1">{worstCall.title}</div>
                    <div className="font-mono text-xs text-ink-soft mb-2">
                      {formatDate(worstCall.resolved_at ?? worstCall.resolves_at)}
                      {worstCall.confidence_pct !== null && ` · stated ${worstCall.confidence_pct}% confidence`}
                    </div>
                    {worstCall.outcome && <p className="text-xs text-ink-soft">{worstCall.outcome}</p>}
                  </div>
                )}
              </div>
            )}

            <h2 className="section-title">Miss breakdown</h2>
            <p className="text-sm text-ink-soft mb-4">
              Shown as prominently as the hits — a track record that only shows wins isn&apos;t one you can
              trust.
            </p>
            {missed.length === 0 ? (
              <p className="font-mono text-sm text-ink-soft mb-12">No misses yet.</p>
            ) : (
              <div className="flex flex-col gap-3 mb-12">
                {missed.map((p) => (
                  <div key={p.id} className="card p-5">
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className="text-sm text-ink">
                        <span className="font-mono text-[10px] text-ink-soft mr-1.5">{p.is_backtest ? "🔬" : "📡"}</span>
                        {p.entity ? `${displayCountryName(p.entity.code, p.entity.name)} — ` : ""}
                        {p.title}
                      </span>
                      <span className="font-mono text-xs text-ink-soft shrink-0">{formatDate(p.resolved_at ?? p.resolves_at)}</span>
                    </div>
                    {p.outcome && <p className="text-sm text-ink-soft mb-1">{p.outcome}</p>}
                    <span
                      className={`font-mono text-[11px] uppercase tracking-wide ${p.miss_cause ? "text-warn" : "text-ink-soft italic"}`}
                    >
                      {p.miss_cause ? MISS_CAUSE_LABEL[p.miss_cause] : "Cause not yet classified"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <h2 className="section-title">All resolved calls</h2>
            <p className="font-mono text-[11px] text-ink-soft mb-4">
              🔬 Backtest = a retrospective run of the model against real historical data, done
              after the fact, using only data that would have been available at that point. 📡 Live
              = an actual call, published before the outcome was known. Never conflated.
            </p>
            <div className="flex flex-col gap-3">
              {predictions.map((p) => (
                <div key={p.id} className="card p-5 flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink">
                    <span className="font-mono text-[10px] text-ink-soft mr-1.5">{p.is_backtest ? "🔬" : "📡"}</span>
                    {p.entity ? `${displayCountryName(p.entity.code, p.entity.name)} — ` : ""}
                    {p.title}
                  </span>
                  <span
                    className={`font-mono text-[11px] uppercase tracking-wide shrink-0 ${
                      resolveStatus(p) === "confirmed" ? "text-good" : "text-warn"
                    }`}
                  >
                    {resolveStatus(p) === "confirmed" ? "🟢 Confirmed" : "🔴 Missed"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
