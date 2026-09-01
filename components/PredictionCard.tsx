import type { Prediction } from "@/lib/types";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function PredictionCard({ prediction }: { prediction: Prediction }) {
  const resolved = prediction.outcome !== null;
  return (
    <div className="card p-6">
      <div className="font-mono text-sm text-ink-soft mb-1">{prediction.title}</div>
      <div className="font-mono text-2xl font-semibold text-accent mb-2">{prediction.call}</div>
      <div className="font-mono text-xs text-ink-soft flex gap-4 flex-wrap mb-3">
        <span>
          Resolves: <b className="text-ink">{formatDate(prediction.resolves_at)}</b>
        </span>
        <span>
          Published:{" "}
          <b className="text-ink">{formatDate(prediction.published_at) ?? "not yet — draft"}</b>
        </span>
        {resolved && (
          <span className={prediction.outcome_correct ? "text-good" : "text-warn"}>
            {prediction.outcome_correct ? "✓ correct" : "✗ missed"} — {prediction.outcome}
          </span>
        )}
      </div>
      {prediction.reasoning && (
        <p className="text-sm text-ink-soft whitespace-pre-line">{prediction.reasoning}</p>
      )}
    </div>
  );
}
