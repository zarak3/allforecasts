// Minimal, dependency-free statistics. Deliberately simple and auditable --
// this is exactly the kind of number the LLM narration layer must never
// invent; it has to come from real arithmetic over real data.

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 8 || n !== ys.length) return null; // require a minimum sample size

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX === 0 || varY === 0) return null;
  return cov / Math.sqrt(varX * varY);
}

// Ordinary least-squares trend, extrapolated one step past the last point.
// Deliberately naive (no seasonality, no external indicators) -- it's a
// mechanical baseline, not a researched call. Falls back to the last known
// value when there's only one point to work with.
export function linearTrendForecast(points: { x: number; y: number }[]): number | null {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const n = sorted.length;
  if (n === 0) return null;
  if (n === 1) return sorted[0].y;

  const meanX = sorted.reduce((a, p) => a + p.x, 0) / n;
  const meanY = sorted.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of sorted) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) * (p.x - meanX);
  }
  if (den === 0) return sorted[n - 1].y;
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  const nextX = sorted[n - 1].x + 1;
  return slope * nextX + intercept;
}

interface YearSeries {
  year: number;
  value: number;
}

export interface LagCorrelationResult {
  r: number | null;
  n: number;
  points: { year: number; a: number; b: number }[];
}

// Pairs indicator A at year t with indicator B at year (t + lag) for one
// country's own history, then runs Pearson on the pairs -- the actual
// lag-correlation screen, not the cross-sectional one-point-in-time version
// on the main correlations table.
export function lagCorrelation(seriesA: YearSeries[], seriesB: YearSeries[], lag: number): LagCorrelationResult {
  const bByYear = new Map(seriesB.map((p) => [p.year, p.value]));
  const points: { year: number; a: number; b: number }[] = [];
  for (const a of seriesA) {
    const b = bByYear.get(a.year + lag);
    if (b !== undefined) points.push({ year: a.year, a: a.value, b });
  }
  const r = pearson(
    points.map((p) => p.a),
    points.map((p) => p.b)
  );
  return { r, n: points.length, points };
}
