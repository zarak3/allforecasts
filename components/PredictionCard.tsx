import type { Prediction } from "@/lib/types";
import PredictionCall from "@/components/PredictionCall";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso: string): number {
  const target = new Date(iso + "T00:00:00Z").getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export default function PredictionCard({ prediction }: { prediction: Prediction }) {
  const resolved = prediction.outcome !== null;
  const days = resolved ? null : daysUntil(prediction.resolves_at);

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="font-mono text-sm text-ink-soft">{prediction.title}</div>
        {resolved ? (
          <span
            className={`font-mono text-[11px] uppercase tracking-wide px-2 py-1 rounded shrink-0 ${
              prediction.outcome_correct ? "bg-good/10 text-good" : "bg-warn/10 text-warn"
            }`}
          >
            {prediction.outcome_correct ? "✓ Correct" : "✗ Missed"}
          </span>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-wide px-2 py-1 rounded shrink-0 bg-accent/10 text-accent">
            {days !== null && days >= 0 ? `Resolves in ${days}d` : "Pending"}
          </span>
        )}
      </div>

      <div className="mb-3">
        <PredictionCall call={prediction.call} />
      </div>

      <div className="font-mono text-xs text-ink-soft flex gap-4 flex-wrap mb-1">
        <span>
          Resolves: <b className="text-ink">{formatDate(prediction.resolves_at)}</b>
        </span>
        <span>
          Published:{" "}
          <b className="text-ink">{formatDate(prediction.published_at) ?? "not yet — draft"}</b>
        </span>
      </div>

      {resolved && (
        <p className="text-sm text-ink-soft mt-2">
          Outcome: <b className="text-ink">{prediction.outcome}</b>
        </p>
      )}

      {prediction.reasoning && (
        <details className="mt-3 group">
          <summary className="font-mono text-xs text-accent cursor-pointer select-none list-none">
            <span className="group-open:hidden">Why this call →</span>
            <span className="hidden group-open:inline">Hide reasoning ↑</span>
          </summary>
          <p className="text-sm text-ink-soft whitespace-pre-line mt-2">{prediction.reasoning}</p>
        </details>
      )}
    </div>
  );
}
