-- Optional: seed the 3 CV-credibility predictions from the project plan.
-- Run after schema.sql. Safe to re-run (it's an upsert-by-title via delete+insert).

delete from predictions where title in (
  'UK monthly GDP, July 2026',
  'UK CPI inflation, August 2026',
  'UK GDP quarterly, Q2 2026'
);

insert into predictions (title, call, reasoning, published_at, resolves_at) values
(
  'UK monthly GDP, July 2026',
  '+0.1% to +0.3% m/m',
  'Cross-checked against 5 indicators: flash composite PMI up sharply to 52.1 (bullish); retail sales -0.5% m/m, read as payback from May/June promo pull-forward rather than new weakness (bearish but discounted); energy price cap +13% from 1 July (genuine headwind); GfK consumer confidence +6pts, biggest jump since Nov 2023, rising despite the energy shock (bullish); unemployment flat at 4.9%, claimant count fell 2nd straight month (neutral). No analyst consensus was publicly available at time of writing; professional consensus historically misses by ~0.2pp.',
  null, -- set this once actually posted publicly, e.g. '2026-09-01T14:00:00Z'
  '2026-09-11'
),
(
  'UK CPI inflation, August 2026',
  'TBD -- not yet drafted',
  null,
  '2026-09-16'
),
(
  'UK GDP quarterly, Q2 2026',
  'TBD -- not yet drafted',
  null,
  '2026-09-30'
);
