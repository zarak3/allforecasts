"use client";

import { useEffect, useMemo, useState } from "react";
import type { Indicator, Entity } from "@/lib/types";
import InteractiveChart from "@/components/InteractiveChart";

const WATCHLIST_KEY = "allforecasts-stock-watchlist";

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveWatchlist(codes: string[]) {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(codes));
  } catch {
    // localStorage unavailable (private browsing, etc.) -- watchlist just
    // won't persist this session, not worth failing the page over
  }
}

export default function StocksExplorer({ indicators, entities }: { indicators: Indicator[]; entities: Entity[] }) {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setWatchlist(loadWatchlist());
    setMounted(true);
  }, []);

  function toggleWatch(code: string) {
    setWatchlist((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
      saveWatchlist(next);
      return next;
    });
  }

  const byEntity = useMemo(() => {
    const map = new Map<string, Indicator[]>();
    for (const i of indicators) {
      if (!i.entity_id) continue;
      if (!map.has(i.entity_id)) map.set(i.entity_id, []);
      map.get(i.entity_id)!.push(i);
    }
    return map;
  }, [indicators]);

  const sortedEntities = [...entities].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-8">
      {sortedEntities.map((entity) => {
        const history = (byEntity.get(entity.id) ?? []).map((i) => ({ date: i.period, value: i.value }));
        const latest = history[history.length - 1];
        const prev = history[history.length - 2];
        const change = latest && prev ? ((latest.value - prev.value) / prev.value) * 100 : null;
        const isWatched = mounted && watchlist.includes(entity.code ?? "");

        return (
          <div key={entity.id} className="card p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wide text-accent mb-1">{entity.code}</div>
                <div className="text-lg text-ink">{entity.name}</div>
              </div>
              <div className="flex items-center gap-3">
                {latest && (
                  <div className="text-right">
                    <div className="font-mono text-xl text-ink">${latest.value.toFixed(2)}</div>
                    {change !== null && (
                      <div className={`font-mono text-xs ${change >= 0 ? "text-good" : "text-warn"}`}>
                        {change >= 0 ? "+" : ""}
                        {change.toFixed(2)}% vs. prior close
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => entity.code && toggleWatch(entity.code)}
                  className={`font-mono text-xs px-2.5 py-1.5 rounded border ${
                    isWatched ? "bg-accent text-paper border-accent" : "border-line text-ink-soft"
                  }`}
                  aria-label={isWatched ? `Remove ${entity.name} from watchlist` : `Add ${entity.name} to watchlist`}
                >
                  {isWatched ? "★ Watching" : "☆ Watch"}
                </button>
              </div>
            </div>
            <InteractiveChart points={history} unit="USD" />
          </div>
        );
      })}
    </div>
  );
}
