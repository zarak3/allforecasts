"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ChartRow {
  year: number;
  value: number | null;
  projected: number | null;
  scenario: number | null;
}

function CustomTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: number;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload.find((p) => typeof p.value === "number");
  if (!entry) return null;
  const isProjected = entry.dataKey === "projected";
  const isScenario = entry.dataKey === "scenario";
  return (
    <div className="bg-paper border border-line rounded px-3 py-2 shadow-lg font-mono text-xs">
      <div className="text-ink-soft mb-1">
        {label} {isProjected && <span className="text-accent">(projected)</span>}
        {isScenario && <span className="text-[#6b46c1]">(scenario)</span>}
      </div>
      <div className="text-ink font-semibold">
        {entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} {unit}
      </div>
    </div>
  );
}

export default function ProjectionChart({
  history,
  targetYear,
  projected,
  scenario,
  unit,
}: {
  history: { year: number; value: number }[];
  targetYear: number;
  projected: number;
  scenario?: number | null;
  unit: string;
}) {
  const chartData: ChartRow[] = history.map((h, i) => ({
    year: h.year,
    value: h.value,
    projected: i === history.length - 1 ? h.value : null,
    scenario: i === history.length - 1 ? h.value : null,
  }));
  chartData.push({ year: targetYear, value: null, projected, scenario: scenario ?? null });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="#ddd4bd" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="year"
          stroke="#4a473f"
          tick={{ fontSize: 11, fontFamily: "var(--font-plex-mono)" }}
          axisLine={{ stroke: "#ddd4bd" }}
          tickLine={false}
        />
        <YAxis
          domain={["auto", "auto"]}
          stroke="#4a473f"
          tick={{ fontSize: 11, fontFamily: "var(--font-plex-mono)" }}
          width={64}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip unit={unit} />} />
        <Line type="monotone" dataKey="value" stroke="#1e3a5f" strokeWidth={2} dot={{ r: 2.5 }} connectNulls={false} />
        <Line
          type="monotone"
          dataKey="projected"
          stroke="#9c4221"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={{ r: 3.5 }}
          connectNulls
        />
        {scenario != null && (
          <Line
            type="monotone"
            dataKey="scenario"
            stroke="#6b46c1"
            strokeWidth={2}
            strokeDasharray="2 3"
            dot={{ r: 3.5 }}
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
