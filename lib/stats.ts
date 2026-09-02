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
