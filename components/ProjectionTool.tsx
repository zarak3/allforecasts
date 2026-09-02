"use client";

import { useState } from "react";
import { WORLD_BANK_INDICATORS } from "@/lib/worldbank";

interface EntityOption {
  code: string;
  name: string;
}

interface Result {
  label: string;
  unit: string;
  projected: number | null;
  targetYear: number;
  lastKnownYear: number;
  lastKnownValue: number | null;
  pointsUsed: number;
}

const INDICATOR_OPTIONS = Object.entries(WORLD_BANK_INDICATORS).map(([code, meta]) => ({
  code,
  label: meta.label,
}));

const HORIZON_OPTIONS = [1, 2, 3, 5, 10];

function formatValue(value: number, unit: string) {
  const formatted = Math.abs(value) >= 1000 ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : value.toFixed(2);
  if (unit === "USD") return `$${formatted}`;
  if (unit.startsWith("%")) return `${formatted}%`;
  return `${formatted} ${unit}`;
}

export default function ProjectionTool({ entities }: { entities: EntityOption[] }) {
  const [country, setCountry] = useState(entities.find((e) => e.code === "GB")?.code ?? entities[0]?.code ?? "");
  const [code, setCode] = useState("NY.GDP.PCAP.CD");
  const [years, setYears] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/projection?country=${country}&indicator=${code}&years=${years}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data.data);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <p className="text-sm text-ink-soft mb-4">
        Pick a country, an indicator, and how far ahead — this fits a straight line through its
        real history and extends it. A mechanical baseline, not a researched forecast; treat it as
        a starting guess, not a call we&apos;d stake a prediction on.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <label className="text-xs font-mono text-ink-soft">
          Country
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full mt-1 border border-line rounded px-2 py-1.5 bg-paper text-ink text-sm"
          >
            {entities.map((e) => (
              <option key={e.code} value={e.code}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-mono text-ink-soft">
          Indicator
          <select
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full mt-1 border border-line rounded px-2 py-1.5 bg-paper text-ink text-sm"
          >
            {INDICATOR_OPTIONS.map((i) => (
              <option key={i.code} value={i.code}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-mono text-ink-soft">
          Horizon
          <select
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full mt-1 border border-line rounded px-2 py-1.5 bg-paper text-ink text-sm"
          >
            {HORIZON_OPTIONS.map((y) => (
              <option key={y} value={y}>
                +{y} year{y > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button onClick={run} disabled={loading} className="btn w-full">
            {loading ? "Projecting…" : "Project"}
          </button>
        </div>
      </div>

      {error && <p className="font-mono text-sm text-warn mt-2">{error}</p>}

      {result && (
        <div className="mt-5 pt-5 border-t border-line">
          {result.projected === null ? (
            <p className="font-mono text-sm text-ink-soft">Not enough historical data to project this.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-3 flex-wrap mb-2">
                <span className="font-mono text-2xl font-medium text-accent">
                  {formatValue(result.projected, result.unit)}
                </span>
                <span className="font-mono text-xs text-ink-soft">projected for {result.targetYear}</span>
              </div>
              <p className="text-sm text-ink-soft">
                Last real reading: {result.lastKnownValue !== null ? formatValue(result.lastKnownValue, result.unit) : "—"}{" "}
                ({result.lastKnownYear}), based on {result.pointsUsed} years of real World Bank data for{" "}
                {result.label}.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
