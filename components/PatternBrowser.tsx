"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import type { Persona } from "@/lib/insight-meaning";

export interface PatternPair {
  a: string;
  b: string;
  categoryA: string;
  categoryB: string;
  r: number;
  n: number;
  meaning: string;
  personas: Persona[];
}

function RBar({ r }: { r: number }) {
  const pct = Math.round(Math.abs(r) * 100);
  return (
    <div className="flex items-center gap-2 w-full max-w-[160px]">
      <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${r > 0 ? "bg-good" : "bg-warn"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-mono text-xs shrink-0 ${r > 0 ? "text-good" : "text-warn"}`}>
        {r > 0 ? "+" : ""}
        {r.toFixed(2)}
      </span>
    </div>
  );
}

export default function PatternBrowser({
  pairs,
  totalPairs,
  crossCategoryCount,
}: {
  pairs: PatternPair[];
  totalPairs: number;
  crossCategoryCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn">
        Browse known patterns ({pairs.length})
      </button>

      {open && (
        <Modal title="Strongest relationships right now" onClose={() => setOpen(false)}>
          <p className="text-sm text-ink-soft mb-4">
            Every country compared at once, right now — not one country&apos;s history over time
            (that&apos;s the calculator above). {totalPairs} pairs screened in total (
            {crossCategoryCount} cross-category).
          </p>
          <div className="flex flex-col gap-4">
            {pairs.map((p) => (
              <div key={`${p.a}|${p.b}`} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                  <div className="text-sm">
                    <span className="text-ink">{p.a}</span>
                    <span className="text-ink-soft mx-1.5">↔</span>
                    <span className="text-ink">{p.b}</span>
                  </div>
                  <RBar r={p.r} />
                </div>
                <p className="text-sm text-ink-soft mb-2.5">{p.meaning}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {p.personas.map((persona) => (
                    <span
                      key={persona}
                      className="font-mono text-[11px] uppercase tracking-wide px-2 py-1 rounded bg-accent/10 text-accent"
                    >
                      {persona}
                    </span>
                  ))}
                  <span className="font-mono text-[11px] text-ink-soft ml-auto">
                    {p.n} countries · {p.categoryA} × {p.categoryB}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
