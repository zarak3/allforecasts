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

// Ordinary least-squares trend, extrapolated `stepsAhead` steps past the
// last point (default 1). Deliberately naive (no seasonality, no external
// indicators) -- it's a mechanical baseline, not a researched call. Falls
// back to the last known value when there's only one point to work with.
export function linearTrendForecast(points: { x: number; y: number }[], stepsAhead = 1): number | null {
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
  const targetX = sorted[n - 1].x + stepsAhead;
  return slope * targetX + intercept;
}

// Brier score: mean squared error between stated probability (0-1) and the
// actual binary outcome. 0 = perfect, 0.25 = a coin-flip-informative
// forecaster, 1 = maximally wrong every time. The standard way to score a
// probabilistic forecaster -- rewards being right AND well-calibrated, not
// just right.
export function brierScore(forecasts: { probability: number; correct: boolean }[]): number | null {
  if (forecasts.length === 0) return null;
  const sum = forecasts.reduce((acc, f) => acc + (f.probability - (f.correct ? 1 : 0)) ** 2, 0);
  return sum / forecasts.length;
}

export interface ReliabilityBucket {
  bucketLabel: string; // e.g. "60-70%"
  bucketMid: number; // 65
  n: number;
  actualHitRatePct: number | null; // null when n is too small to plot honestly
}

// Groups resolved forecasts into 10-point confidence buckets and computes
// the ACTUAL hit rate within each -- the reliability-diagram data. Buckets
// with fewer than `minBucketN` forecasts are returned with a null hit rate
// rather than a misleading point plotted from a handful of calls.
export function reliabilityBuckets(
  forecasts: { confidencePct: number; correct: boolean }[],
  minBucketN = 10
): ReliabilityBucket[] {
  const buckets = new Map<number, { n: number; hits: number }>();
  for (const f of forecasts) {
    const bucketStart = Math.min(90, Math.floor(f.confidencePct / 10) * 10);
    const entry = buckets.get(bucketStart) ?? { n: 0, hits: 0 };
    entry.n += 1;
    if (f.correct) entry.hits += 1;
    buckets.set(bucketStart, entry);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([start, { n, hits }]) => ({
      bucketLabel: `${start}-${start + 10}%`,
      bucketMid: start + 5,
      n,
      actualHitRatePct: n >= minBucketN ? Math.round((hits / n) * 100) : null,
    }));
}

export interface SurpriseCall {
  consensusValue: number;
  ourPredictedValue: number;
  actualValue: number;
}

export interface SurpriseIndexResult {
  callsWithRealSurprise: number; // rows where actual actually diverged from consensus
  calledCorrectly: number; // of those, how many we predicted on the same side as the actual surprise
  hitRatePct: number | null; // null when there's nothing to score yet
}

// Did we call the SURPRISE DIRECTION correctly relative to consensus -- a
// harder, more specific test than raw accuracy. A row with actual ==
// consensus has no surprise to call, so it's excluded rather than counted
// either way.
export function surpriseIndex(calls: SurpriseCall[]): SurpriseIndexResult {
  const withSurprise = calls.filter((c) => c.actualValue !== c.consensusValue);
  const correct = withSurprise.filter(
    (c) => Math.sign(c.ourPredictedValue - c.consensusValue) === Math.sign(c.actualValue - c.consensusValue)
  );
  return {
    callsWithRealSurprise: withSurprise.length,
    calledCorrectly: correct.length,
    hitRatePct: withSurprise.length > 0 ? Math.round((correct.length / withSurprise.length) * 100) : null,
  };
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
