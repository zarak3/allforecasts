"use client";

import { useState } from "react";
import { WORLD_BANK_INDICATORS } from "@/lib/worldbank";

interface EntityOption {
  code: string;
  name: string;
}

interface Result {
  r: number | null;
  n: number;
  labelA: string;
  labelB: string;
  points: { year: number; a: number; b: number }[];
}

const INDICATOR_OPTIONS = Object.entries(WORLD_BANK_INDICATORS).map(([code, meta]) => ({
  code,
  label: meta.label,
}));

const LAG_OPTIONS = [0, 1, 2, 3, 4, 5];

export default function LagCorrelationTool({ entities }: { entities: EntityOption[] }) {
  const [country, setCountry] = useState(entities.find((e) => e.code === "GB")?.code ?? entities[0]?.code ?? "");
  const [codeA, setCodeA] = useState("NY.GDP.MKTP.KD.ZG");
  const [codeB, setCodeB] = useState("SL.UEM.TOTL.ZS");
  const [lag, setLag] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/lag-correlation?country=${country}&a=${codeA}&b=${codeB}&lag=${lag}`);
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
        Pick one country and two indicators. This checks whether indicator A in one year lines up
        with indicator B a set number of years later — using that country&apos;s own history, live
        from the World Bank.
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
          Indicator A (earlier)
          <select
            value={codeA}
            onChange={(e) => setCodeA(e.target.value)}
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
          Indicator B (later)
          <select
            value={codeB}
            onChange={(e) => setCodeB(e.target.value)}
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
          Lag (years)
          <select
            value={lag}
            onChange={(e) => setLag(Number(e.target.value))}
            className="w-full mt-1 border border-line rounded px-2 py-1.5 bg-paper text-ink text-sm"
          >
            {LAG_OPTIONS.map((l) => (
              <option key={l} value={l}>
                {l === 0 ? "Same year" : `+${l} year${l > 1 ? "s" : ""}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button onClick={run} disabled={loading} className="btn">
        {loading ? "Calculating…" : "Run analysis"}
      </button>

      {error && <p className="font-mono text-sm text-warn mt-4">{error}</p>}

      {result && (
        <div className="mt-5 pt-5 border-t border-line">
          {result.r === null ? (
            <p className="font-mono text-sm text-ink-soft">
              Not enough overlapping years of real data for this pair ({result.n} found, need at
              least 8) — try a different indicator, country, or lag.
            </p>
          ) : (
            <>
              <div className="flex items-baseline gap-3 flex-wrap mb-2">
                <span className={`font-mono text-2xl font-medium ${result.r > 0 ? "text-good" : "text-warn"}`}>
                  {result.r > 0 ? "+" : ""}
                  {result.r.toFixed(2)}
                </span>
                <span className="font-mono text-xs text-ink-soft">
                  {result.n} years of overlapping real data
                </span>
              </div>
              <p className="text-sm text-ink-soft">
                {result.labelA} tends to {result.r > 0 ? "move with" : "move against"}{" "}
                {result.labelB} {lag === 0 ? "in the same year" : `${lag} year${lag > 1 ? "s" : ""} later`}, for
                this country&apos;s own history. Still correlation, not proof of cause — but this is
                the real time-lagged version, not a same-moment coincidence.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
