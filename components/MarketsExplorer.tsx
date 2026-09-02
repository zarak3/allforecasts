"use client";

import { useEffect, useState } from "react";
import InteractiveChart from "@/components/InteractiveChart";
import { COMMODITIES, CURRENCIES, type MarketSeries } from "@/lib/markets";

const RANGES = [
  { value: "1m", label: "1M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "5y", label: "5Y" },
];

export default function MarketsExplorer() {
  const [kind, setKind] = useState<"commodity" | "currency">("commodity");
  const [symbol, setSymbol] = useState(COMMODITIES[0].symbol);
  const [range, setRange] = useState("1m");
  const [series, setSeries] = useState<MarketSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const instruments = kind === "commodity" ? COMMODITIES : CURRENCIES;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/markets?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setSeries(data.data);
      })
      .catch(() => !cancelled && setError("Network error — try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="font-mono text-xs inline-flex border border-line rounded overflow-hidden">
          <button
            onClick={() => {
              setKind("commodity");
              setSymbol(COMMODITIES[0].symbol);
            }}
            className={`px-3 py-1.5 ${kind === "commodity" ? "bg-accent text-paper" : "bg-paper text-ink-soft"}`}
          >
            Commodities
          </button>
          <button
            onClick={() => {
              setKind("currency");
              setSymbol(CURRENCIES[0].symbol);
            }}
            className={`px-3 py-1.5 ${kind === "currency" ? "bg-accent text-paper" : "bg-paper text-ink-soft"}`}
          >
            Currencies
          </button>
        </div>

        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="font-mono text-sm border border-line rounded px-2.5 py-1.5 bg-paper text-ink"
        >
          {instruments.map((i) => (
            <option key={i.symbol} value={i.symbol}>
              {i.label}
            </option>
          ))}
        </select>

        <div className="font-mono text-xs inline-flex border border-line rounded overflow-hidden ml-auto">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 ${range === r.value ? "bg-accent text-paper" : "bg-paper text-ink-soft"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        {loading ? (
          <p className="font-mono text-sm text-ink-soft py-10 text-center">Loading…</p>
        ) : error ? (
          <p className="font-mono text-sm text-warn py-10 text-center">{error}</p>
        ) : series ? (
          <>
            <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
              <div>
                <div className="font-mono text-sm text-ink-soft">{series.label}</div>
                <div className="font-mono text-2xl font-medium text-accent">
                  {series.latest.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                  <span className="text-sm text-ink-soft">{series.unit}</span>
                </div>
              </div>
              {series.changePercent !== null && (
                <span
                  className={`font-mono text-sm px-2 py-1 rounded ${
                    series.changePercent >= 0 ? "bg-good/10 text-good" : "bg-warn/10 text-warn"
                  }`}
                >
                  {series.changePercent >= 0 ? "+" : ""}
                  {series.changePercent.toFixed(2)}% over period
                </span>
              )}
            </div>
            <InteractiveChart points={series.points} unit={series.unit} />
          </>
        ) : null}
      </div>
    </div>
  );
}
