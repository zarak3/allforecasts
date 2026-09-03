import { supabaseServer } from "@/lib/supabase";
import PredictionCard from "@/components/PredictionCard";
import { displayCountryName } from "@/lib/display-name";
import type { Prediction } from "@/lib/types";

export const revalidate = 900;
export const metadata = {
  title: "Predictions — AllForecasts",
  description:
    "Every dated, falsifiable forecast AllForecasts has published, with the reasoning behind each call and its resolution once the official data lands.",
};

async function getPredictions(): Promise<{ predictions: Prediction[]; loadError: string | null }> {
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("predictions")
      .select("*, entity:entities(id, type, name, code)")
      .eq("is_backtest", false)
      .order("resolves_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { predictions: (data as unknown as Prediction[]) ?? [], loadError: null };
  } catch (err) {
    return { predictions: [], loadError: err instanceof Error ? err.message : String(err) };
  }
}

function resolveStatus(p: Prediction) {
  return p.status ?? (p.outcome !== null ? (p.outcome_correct ? "confirmed" : "missed") : "pending");
}

export default async function PredictionsPage() {
  const { predictions, loadError } = await getPredictions();

  const pending = predictions.filter((p) => resolveStatus(p) === "pending");
  const resolved = predictions.filter((p) => resolveStatus(p) !== "pending");
  const correct = resolved.filter((p) => resolveStatus(p) === "confirmed").length;

  return (
    <main className="section pt-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="eyebrow mb-3">Track record</div>
        <h1 className="text-3xl font-medium mb-3">Predictions</h1>
        <p className="text-ink-soft max-w-xl mb-2">
          Every dated, falsifiable call, published before the outcome was known, and its
          resolution once the official data lands.
        </p>
        <p className="font-mono text-xs text-ink-soft max-w-xl mb-4">
          Each one names its resolution source and date up front — no moving the goalposts
          after the fact.
        </p>
        <div className="font-mono text-[11px] text-ink-soft flex gap-4 flex-wrap mb-8">
          <span>🟡 Pending — outcome not yet resolved</span>
          <span>🟢 Confirmed — matched the outcome within stated confidence</span>
          <span>🔴 Missed — did not match the outcome</span>
        </div>

        {loadError ? (
          <p className="font-mono text-sm text-warn">
            Could not reach the database ({loadError}). Check <code>SUPABASE_URL</code> and{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> in your environment.
          </p>
        ) : predictions.length === 0 ? (
          <p className="font-mono text-sm text-ink-soft">
            No predictions in the database yet — run <code>supabase/schema.sql</code> then{" "}
            <code>supabase/seed_predictions.sql</code>.
          </p>
        ) : (
          <>
            <div className="flex gap-3 mb-12">
              <div className="card px-5 py-4 flex-1">
                <div className="font-mono text-2xl text-accent">{pending.length}</div>
                <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">Pending</div>
              </div>
              <div className="card px-5 py-4 flex-1">
                <div className="font-mono text-2xl text-ink">{resolved.length}</div>
                <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">Resolved</div>
              </div>
              <div className="card px-5 py-4 flex-1">
                <div className="font-mono text-2xl text-ink">
                  {resolved.length > 0 ? `${Math.round((correct / resolved.length) * 100)}%` : "—"}
                </div>
                <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">Accuracy so far</div>
              </div>
            </div>

            {pending.length > 0 && (
              <div className="mb-12">
                <h2 className="section-title">Pending</h2>
                <div className="flex flex-col gap-4">
                  {pending.map((p) => (
                    <PredictionCard
                      key={p.id}
                      prediction={p}
                      tag={p.entity ? displayCountryName(p.entity.code, p.entity.name) : "Global"}
                    />
                  ))}
                </div>
              </div>
            )}
            {resolved.length > 0 && (
              <div>
                <h2 className="section-title">Resolved</h2>
                <div className="flex flex-col gap-4">
                  {resolved.map((p) => (
                    <PredictionCard
                      key={p.id}
                      prediction={p}
                      tag={p.entity ? displayCountryName(p.entity.code, p.entity.name) : "Global"}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
