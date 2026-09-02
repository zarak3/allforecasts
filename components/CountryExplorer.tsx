"use client";

import { useCallback, useEffect, useState } from "react";
import type { Indicator, Entity } from "@/lib/types";
import CountryTable from "@/components/CountryTable";
import WorldMap from "@/components/WorldMap";
import SpinningGlobe from "@/components/SpinningGlobe";
import { displayCountryName } from "@/lib/display-name";

export default function CountryExplorer({
  indicators,
  entities,
}: {
  indicators: Indicator[];
  entities: Entity[];
}) {
  const [view, setView] = useState<"map" | "globe">("map");
  const [selected, setSelected] = useState<{ code: string; name: string } | null>(null);
  // The map/globe read window.devicePixelRatio and fetch client-side topojson,
  // so they only make sense once mounted in the browser -- avoids an SSR/
  // hydration mismatch for geometry that never rendered on the server.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleSelect = useCallback((code: string, name: string) => setSelected({ code, name }), []);

  const sortedEntities = [...entities].sort((a, b) =>
    displayCountryName(a.code, a.name).localeCompare(displayCountryName(b.code, b.name))
  );

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="font-mono text-xs inline-flex border border-line rounded overflow-hidden">
          <button
            onClick={() => setView("map")}
            className={`px-3 py-1.5 ${view === "map" ? "bg-accent text-paper" : "bg-paper text-ink-soft"}`}
          >
            2D map
          </button>
          <button
            onClick={() => setView("globe")}
            className={`px-3 py-1.5 ${view === "globe" ? "bg-accent text-paper" : "bg-paper text-ink-soft"}`}
          >
            3D globe
          </button>
        </div>

        <select
          className="font-mono text-sm border border-line rounded px-2.5 py-1.5 bg-paper text-ink"
          value={selected?.code ?? ""}
          onChange={(e) => {
            const code = e.target.value;
            const entity = sortedEntities.find((c) => c.code === code);
            setSelected(
              entity && entity.code ? { code: entity.code, name: displayCountryName(entity.code, entity.name) } : null
            );
          }}
        >
          <option value="">Jump to country…</option>
          {sortedEntities.map((c) => (
            <option key={c.id} value={c.code ?? ""}>
              {displayCountryName(c.code, c.name)}
            </option>
          ))}
        </select>
      </div>

      <div className="card p-4 mb-8 flex justify-center min-h-[300px] items-center">
        {!mounted ? (
          <p className="font-mono text-sm text-ink-soft">Loading {view === "map" ? "map" : "globe"}…</p>
        ) : view === "map" ? (
          <WorldMap selectedCode={selected?.code ?? null} onSelect={handleSelect} />
        ) : (
          <SpinningGlobe selectedCode={selected?.code ?? null} onSelect={handleSelect} />
        )}
      </div>

      <CountryTable
        indicators={indicators}
        selectedCode={selected?.code ?? null}
        selectedName={selected?.name ?? null}
        onClear={() => setSelected(null)}
      />
    </div>
  );
}
