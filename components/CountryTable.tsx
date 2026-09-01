"use client";

import { useMemo, useState } from "react";
import type { Indicator } from "@/lib/types";

// Hand-rolled compact formatting instead of Intl's `notation: "compact"`:
// Node's and the browser's bundled ICU/CLDR data can render the same
// locale differently (e.g. "48K" vs "48k"), which is a real hydration
// mismatch we hit in testing. This is deterministic across environments.
function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

function formatValue(value: number, unit: string | null) {
  const compact = unit === "USD" || unit === "people";
  const formatted = compact ? formatCompact(value) : value.toFixed(1);
  if (unit === "%" || unit === "% of GDP" || unit === "% of labor force") return `${formatted}%`;
  if (unit === "USD") return `$${formatted}`;
  if (unit === "years") return `${formatted} yrs`;
  return unit ? `${formatted} ${unit}` : formatted;
}

export default function CountryTable({
  indicators,
  selectedCode,
  selectedName,
  onClear,
}: {
  indicators: Indicator[];
  selectedCode?: string | null;
  selectedName?: string | null;
  onClear?: () => void;
}) {
  const categories = useMemo(
    () => Array.from(new Set(indicators.map((i) => i.category))).sort(),
    [indicators]
  );
  const [category, setCategory] = useState("all");

  const rows = useMemo(() => {
    let r = indicators;
    if (selectedCode) r = r.filter((i) => i.entity?.code === selectedCode);
    if (category !== "all") r = r.filter((i) => i.category === category);
    return r;
  }, [indicators, category, selectedCode]);

  if (indicators.length === 0) {
    return (
      <p className="font-mono text-sm text-ink-soft">
        No indicators loaded yet. Set your Supabase env vars and hit{" "}
        <code>/api/cron/refresh-indicators</code> once (see README) to pull the first batch from
        the World Bank.
      </p>
    );
  }

  return (
    <div>
      <div className="font-mono text-sm flex items-center gap-3 mb-5 flex-wrap">
        <label htmlFor="category">Category:</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-line rounded px-2.5 py-1.5 bg-paper text-ink"
        >
          <option value="all">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {selectedCode && (
          <span className="inline-flex items-center gap-2 bg-paper-raised border border-line rounded px-2.5 py-1.5">
            Showing: <b>{selectedName ?? selectedCode}</b>
            {onClear && (
              <button onClick={onClear} className="text-ink-soft hover:text-warn" aria-label="Clear country filter">
                ✕
              </button>
            )}
          </span>
        )}

        <span className="text-ink-soft">{rows.length} rows</span>
      </div>

      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-paper">
            <tr className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              <th className="text-left py-2 border-b border-line font-medium">Country</th>
              <th className="text-left py-2 border-b border-line font-medium">Indicator</th>
              <th className="text-left py-2 border-b border-line font-medium">Value</th>
              <th className="text-left py-2 border-b border-line font-medium">Period</th>
              <th className="text-left py-2 border-b border-line font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-2.5 border-b border-line">{row.entity?.name}</td>
                <td className="py-2.5 border-b border-line">{row.name}</td>
                <td className="py-2.5 border-b border-line font-mono">{formatValue(row.value, row.unit)}</td>
                <td className="py-2.5 border-b border-line font-mono">
                  {new Date(row.period).getUTCFullYear()}
                </td>
                <td className="py-2.5 border-b border-line font-mono text-ink-soft">{row.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
