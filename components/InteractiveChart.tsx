"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Point {
  date: string;
  value: number;
}

function formatTick(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function CustomTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { value: number; payload: Point }[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-paper border border-line rounded px-3 py-2 shadow-lg font-mono text-xs">
      <div className="text-ink-soft mb-1">{formatTick(p.date)}</div>
      <div className="text-ink font-semibold">
        {p.value.toLocaleString(undefined, { maximumFractionDigits: 4 })} {unit}
      </div>
    </div>
  );
}

export default function InteractiveChart({ points, unit }: { points: Point[]; unit: string }) {
  if (points.length === 0) {
    return <p className="font-mono text-sm text-ink-soft py-10 text-center">No data to chart yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#ddd4bd" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
          stroke="#4a473f"
          tick={{ fontSize: 11, fontFamily: "var(--font-plex-mono)" }}
          minTickGap={40}
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
        <Area
          type="monotone"
          dataKey="value"
          stroke="#1e3a5f"
          strokeWidth={2}
          fill="url(#chartFill)"
          activeDot={{ r: 4, fill: "#1e3a5f" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
