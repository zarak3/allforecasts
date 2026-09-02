// Predictions store `call` as a plain string (formats vary: ranges,
// hold/cut/hike decisions, etc.) -- this renders it with real visual
// hierarchy instead of one flat mono-spaced blob. Falls back to the raw
// string untouched for any format it doesn't recognise.
// Matches e.g. "+0.1% to +0.3% m/m" or "2.8% to 3.0% y/y (central ~2.9%)".
const RANGE_PATTERN =
  /^([+\-−]?\d+(?:\.\d+)?%)\s+to\s+([+\-−]?\d+(?:\.\d+)?%)(?:\s+(m\/m|y\/y|q\/q))?(?:\s*\(([^)]+)\))?$/i;

export default function PredictionCall({ call, size = "lg" }: { call: string; size?: "lg" | "xl" }) {
  const match = call.match(RANGE_PATTERN);
  const textSize = size === "xl" ? "text-3xl" : "text-2xl";

  if (!match) {
    return <div className={`font-mono ${textSize} font-medium text-accent tracking-tight`}>{call}</div>;
  }

  const [, low, high, period, central] = match;
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className={`font-mono ${textSize} font-medium text-accent tracking-tight`}>
        {low}
        <span className="text-ink-soft mx-1.5 font-normal">–</span>
        {high}
      </span>
      {period && <span className="font-mono text-sm text-ink-soft">{period}</span>}
      {central && (
        <span className="font-mono text-xs text-ink-soft bg-paper-raised border border-line rounded px-2 py-0.5">
          {central}
        </span>
      )}
    </div>
  );
}
