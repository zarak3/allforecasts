import { supabaseServer } from "@/lib/supabase";
import PredictionCard from "@/components/PredictionCard";
import type { Prediction } from "@/lib/types";

export const revalidate = 900;
export const metadata = { title: "Predictions — AllForecasts" };

async function getPredictions(): Promise<{ predictions: Prediction[]; loadError: string | null }> {
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .order("resolves_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { predictions: data ?? [], loadError: null };
  } catch (err) {
    return { predictions: [], loadError: err instanceof Error ? err.message : String(err) };
  }
}

export default async function PredictionsPage() {
  const { predictions, loadError } = await getPredictions();

  return (
    <main className="section pt-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="eyebrow mb-3">Track record</div>
        <h1 className="text-3xl font-medium mb-3">Predictions</h1>
        <p className="text-ink-soft max-w-xl mb-10">
          Every dated, falsifiable call, published before the outcome was known, and its
          resolution once the official data lands.
        </p>

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
            {(() => {
              const pending = predictions.filter((p) => p.outcome === null);
              const resolved = predictions.filter((p) => p.outcome !== null);
              return (
                <>
                  {pending.length > 0 && (
                    <div className="mb-10">
                      <h2 className="section-title">Pending — {pending.length}</h2>
                      <div className="flex flex-col gap-5">
                        {pending.map((p) => (
                          <PredictionCard key={p.id} prediction={p} />
                        ))}
                      </div>
                    </div>
                  )}
                  {resolved.length > 0 && (
                    <div>
                      <h2 className="section-title">Resolved — {resolved.length}</h2>
                      <div className="flex flex-col gap-5">
                        {resolved.map((p) => (
                          <PredictionCard key={p.id} prediction={p} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>
    </main>
  );
}
