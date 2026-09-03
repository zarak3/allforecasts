"use client";

import { useState } from "react";
import type { Relationship } from "@/lib/types";
import { displayCountryName } from "@/lib/display-name";

interface Result {
  country: string;
  indicator_a: { label: string; unit: string; latest_value: number; latest_year: number; changed_value: number };
  indicator_b: { label: string; unit: string; latest_value: number; latest_year: number; projected_value: number | null };
  lag_period: string;
  correlation_strength: number;
  sample_size: number;
}

function formatValue(value: number, unit: string) {
  const formatted = Math.abs(value) >= 1000 ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : value.toFixed(2);
  if (unit === "USD") return `$${formatted}`;
  if (unit.startsWith("%")) return `${formatted}%`;
  return `${formatted} ${unit}`;
}

export default function ScenarioTool({ relationships }: { relationships: Relationship[] }) {
  const [relationshipId, setRelationshipId] = useState(relationships[0]?.id ?? "");
  const [changePct, setChangePct] = useState(10);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/scenario?relationshipId=${relationshipId}&changePct=${changePct}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <p className="text-sm text-ink-soft mb-2">
        Real lag-correlations found by systematically screening World Bank indicator pairs per
        country (the same engine as the calculator above, run across every pair instead of one you
        pick) — not a causal model. Pick one, nudge the leading indicator, and see what the
        historical correlation implies for the other.
      </p>
      <p className="font-mono text-[11px] text-warn mb-4">
        Correlation, not causation. A real statistical pattern in a limited historical sample (n
        shown below) — not proof one indicator drives the other, and not a guarantee the pattern
        holds going forward. Treat this as a starting hypothesis, not a forecast.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <label className="text-xs font-mono text-ink-soft">
          Relationship
          <select
            value={relationshipId}
            onChange={(e) => setRelationshipId(e.target.value)}
            className="w-full mt-1 border border-line rounded px-2 py-1.5 bg-paper text-ink text-sm"
          >
            {relationships.map((r) => (
              <option key={r.id} value={r.id}>
                {r.entity ? displayCountryName(r.entity.code, r.entity.name) : "—"}: {r.indicator_a_name} → {r.indicator_b_name} ({r.lag_period}, r={r.correlation_strength?.toFixed(2)})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-mono text-ink-soft">
          Change to the leading indicator
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min={-50}
              max={50}
              step={5}
              value={changePct}
              onChange={(e) => setChangePct(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="font-mono text-sm text-ink w-14 text-right">
              {changePct > 0 ? "+" : ""}
              {changePct}%
            </span>
          </div>
        </label>
      </div>

      <button onClick={run} disabled={loading || !relationshipId} className="btn">
        {loading ? "Running…" : "Run scenario"}
      </button>

      {error && <p className="font-mono text-sm text-warn mt-3">{error}</p>}

      {result && (
        <div className="mt-5 pt-5 border-t border-line">
          <p className="font-mono text-xs text-ink-soft mb-3">
            {result.country} · r = {result.correlation_strength.toFixed(2)} · n = {result.sample_size} years ·
            lag: {result.lag_period}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-accent mb-1">If {result.indicator_a.label}</div>
              <div className="text-sm text-ink-soft">
                moves from <b className="text-ink">{formatValue(result.indicator_a.latest_value, result.indicator_a.unit)}</b> ({result.indicator_a.latest_year})
                to <b className="text-ink">{formatValue(result.indicator_a.changed_value, result.indicator_a.unit)}</b>
              </div>
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-accent mb-1">{result.indicator_b.label} would be expected to move to</div>
              <div className="text-2xl font-mono text-accent">
                {result.indicator_b.projected_value !== null ? formatValue(result.indicator_b.projected_value, result.indicator_b.unit) : "—"}
              </div>
              <div className="font-mono text-xs text-ink-soft">
                from {formatValue(result.indicator_b.latest_value, result.indicator_b.unit)} ({result.indicator_b.latest_year})
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
