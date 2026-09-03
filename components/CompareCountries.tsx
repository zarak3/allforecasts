"use client";

import { useMemo, useState } from "react";
import type { Indicator, Entity } from "@/lib/types";
import { displayCountryName } from "@/lib/display-name";

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

const REGIME_LABELS: Record<string, string> = { "-1": "Contraction", "0": "Slowdown", "1": "Expansion" };

function formatCellValue(row: Indicator): string {
  if (row.name.startsWith("Macro regime")) return REGIME_LABELS[String(Math.round(row.value))] ?? String(row.value);
  const compact = row.unit === "USD" || row.unit === "people";
  const formatted = compact ? formatCompact(row.value) : row.value.toFixed(row.unit === "z-score" ? 2 : 1);
  if (row.unit === "%" || row.unit === "% of GDP" || row.unit === "% of labor force") return `${formatted}%`;
  if (row.unit === "USD") return `$${formatted}`;
  if (row.unit === "years") return `${formatted} yrs`;
  return row.unit ? `${formatted} ${row.unit}` : formatted;
}

const MAX_COMPARE = 5;

export default function CompareCountries({ indicators, entities }: { indicators: Indicator[]; entities: Entity[] }) {
  const sortedEntities = useMemo(
    () => [...entities].sort((a, b) => displayCountryName(a.code, a.name).localeCompare(displayCountryName(b.code, b.name))),
    [entities]
  );
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  const indicatorNames = useMemo(() => {
    const inThisSelection = indicators.filter((i) => i.entity && selectedCodes.includes(i.entity.code ?? ""));
    return Array.from(new Set(inThisSelection.map((i) => i.name))).sort();
  }, [indicators, selectedCodes]);

  const cell = useMemo(() => {
    const map = new Map<string, Indicator>();
    for (const i of indicators) {
      if (!i.entity?.code) continue;
      map.set(`${i.entity.code}|${i.name}`, i);
    }
    return (code: string, name: string) => map.get(`${code}|${name}`) ?? null;
  }, [indicators]);

  function addCountry(code: string) {
    if (!code || selectedCodes.includes(code) || selectedCodes.length >= MAX_COMPARE) return;
    setSelectedCodes((prev) => [...prev, code]);
  }
  function removeCountry(code: string) {
    setSelectedCodes((prev) => prev.filter((c) => c !== code));
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <select
          className="font-mono text-sm border border-line rounded px-2.5 py-1.5 bg-paper text-ink"
          value=""
          onChange={(e) => addCountry(e.target.value)}
        >
          <option value="">Add a country…</option>
          {sortedEntities
            .filter((e) => e.code && !selectedCodes.includes(e.code))
            .map((e) => (
              <option key={e.code} value={e.code as string}>
                {displayCountryName(e.code, e.name)}
              </option>
            ))}
        </select>
        {selectedCodes.length >= MAX_COMPARE && (
          <span className="font-mono text-xs text-ink-soft">Up to {MAX_COMPARE} at a time</span>
        )}
      </div>

      {selectedCodes.length === 0 ? (
        <p className="font-mono text-sm text-ink-soft">Add two or more countries to compare.</p>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap mb-6">
            {selectedCodes.map((code) => {
              const entity = sortedEntities.find((e) => e.code === code);
              return (
                <span
                  key={code}
                  className="inline-flex items-center gap-2 bg-paper-raised border border-line rounded px-2.5 py-1.5 font-mono text-sm"
                >
                  {entity ? displayCountryName(entity.code, entity.name) : code}
                  <button onClick={() => removeCountry(code)} className="text-ink-soft hover:text-warn" aria-label={`Remove ${code}`}>
                    ✕
                  </button>
                </span>
              );
            })}
          </div>

          {selectedCodes.length === 1 ? (
            <p className="font-mono text-sm text-ink-soft">Add at least one more country to compare.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-paper">
                  <tr className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                    <th className="text-left py-2 border-b border-line font-medium">Indicator</th>
                    {selectedCodes.map((code) => {
                      const entity = sortedEntities.find((e) => e.code === code);
                      return (
                        <th key={code} className="text-left py-2 border-b border-line font-medium whitespace-nowrap">
                          {entity ? displayCountryName(entity.code, entity.name) : code}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {indicatorNames.map((name) => (
                    <tr key={name}>
                      <td className="py-2.5 border-b border-line">{name}</td>
                      {selectedCodes.map((code) => {
                        const row = cell(code, name);
                        return (
                          <td key={code} className="py-2.5 border-b border-line font-mono">
                            {row ? formatCellValue(row) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
