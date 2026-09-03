-- AllForecasts generic data schema
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query -> paste -> Run)

create table if not exists entities (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('country', 'city', 'business', 'person')),
  name text not null,
  code text,              -- e.g. ISO2 country code ('GB'), stock ticker, etc.
  created_at timestamptz not null default now(),
  unique (type, code)
);

create table if not exists indicators (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  name text not null,           -- e.g. 'GDP per capita (current US$)'
  category text not null,       -- e.g. 'economic', 'health', 'education'
  source text not null,         -- e.g. 'World Bank', 'WHO', 'ONS'
  source_code text,             -- e.g. 'NY.GDP.PCAP.CD'
  value numeric not null,
  unit text,                    -- e.g. 'USD', 'years', '%'
  period date not null,         -- the date/period the value applies to
  fetched_at timestamptz not null default now()
);

create index if not exists indicators_entity_idx on indicators (entity_id);
create index if not exists indicators_name_idx on indicators (name);

-- Predictions table for the CV-credibility track record (Prediction #1, #2, #3...)
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id),
  title text not null,          -- e.g. 'UK monthly GDP, July 2026'
  call text not null,           -- e.g. '+0.1% to +0.3% m/m'
  reasoning text,
  published_at timestamptz,     -- null until actually posted publicly
  resolves_at date not null,
  outcome text,                 -- filled in after resolution
  outcome_correct boolean,
  created_at timestamptz not null default now(),

  -- Structured fields for the Notable Calls / Backtest template. All
  -- nullable -- older rows keep working with just call/reasoning, these
  -- fill in as each call gets the fuller write-up.
  confidence_pct numeric,              -- e.g. 65 for "65% confident"
  signal_summary text,                 -- "The signal": which indicator(s) moved, and by how much
  falsification_condition text,        -- "What would prove this wrong" -- mandatory in spirit, nullable in schema for backward compat
  status text check (status in ('pending', 'confirmed', 'missed')),
  resolved_at timestamptz,             -- when the outcome was actually confirmed, distinct from resolves_at (when it was due)
  related_relationship_ids uuid[],     -- links to relationships table once a call cites a specific discovered lag relationship
  miss_cause text check (miss_cause in ('structural_break', 'weak_signal', 'outlier_event', 'consensus_was_right')),
    -- classified by hand once a miss's cause is actually identifiable; null when it isn't
  is_backtest boolean not null default false
    -- true = a retrospective walk-forward run of the model against real historical
    -- data, generated after the fact -- never shown as a live, real-time-published
    -- call. false (default) = an actual prediction genuinely made before the
    -- outcome was known. The Predictions/Notable Calls page only shows false;
    -- the Backtest page is where is_backtest=true rows live.
);

-- Real lead-lag relationships discovered between two indicators. Starts
-- empty -- populated only as real relationships are actually found and
-- validated, never backfilled with placeholder rows.
create table if not exists relationships (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id),  -- lag-correlations are country-specific (one country's own history), same as the live LagCorrelationTool -- a relationship with no entity scope can't be honestly represented
  indicator_a_name text not null,
  indicator_b_name text not null,
  lag_period text,                     -- e.g. '6 weeks', '1 quarter'
  correlation_strength numeric,        -- Pearson r from lib/stats.ts -- the method actually implemented
  sample_size integer,                 -- n behind correlation_strength -- the honesty check a bare r hides
  granger_p_value numeric,             -- reserved for a real Granger causality test; null until that's actually built, never faked
  discovered_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'invalidated'))
);

-- Anomaly/event/surprise alerts. Starts empty -- Phase 3 builds the engine
-- that writes to this; Phase 1 only creates the table so nothing has to
-- be migrated later.
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('anomaly', 'event', 'surprise')),
  entity_id uuid references entities(id),
  indicator_name text,          -- denormalized, not a FK -- the daily indicator refresh deletes
                                 -- and re-inserts every indicators row, so a FK here would either
                                 -- go dangling or block that refresh once any alert existed
  triggered_at timestamptz not null default now(),
  z_score numeric,
  description text,
  linked_prediction_id uuid references predictions(id)
);

-- Consensus vs. actual, for the Benchmark/Surprise Index features. Starts
-- empty -- Phase 2 populates this only where a real public consensus
-- figure (Reuters/Bloomberg/ONS/IMF) exists for a given prediction.
create table if not exists consensus_benchmarks (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id),
  indicator_name text not null,
  release_date date,
  consensus_value numeric,
  our_prediction_id uuid references predictions(id),
  our_predicted_value numeric,  -- our point estimate as a plain number, alongside the free-text call on predictions -- needed to compare surprise direction against consensus/actual cleanly
  actual_value numeric
);

create index if not exists relationships_status_idx on relationships (status);
create index if not exists alerts_entity_idx on alerts (entity_id);
create index if not exists alerts_type_idx on alerts (type);
create index if not exists consensus_benchmarks_prediction_idx on consensus_benchmarks (our_prediction_id);

-- Row Level Security: public read-only access, writes only via service_role key
alter table entities enable row level security;
alter table indicators enable row level security;
alter table predictions enable row level security;
alter table relationships enable row level security;
alter table alerts enable row level security;
alter table consensus_benchmarks enable row level security;

create policy "public read entities" on entities for select using (true);
create policy "public read indicators" on indicators for select using (true);
create policy "public read predictions" on predictions for select using (true);
create policy "public read relationships" on relationships for select using (true);
create policy "public read alerts" on alerts for select using (true);
create policy "public read consensus_benchmarks" on consensus_benchmarks for select using (true);

-- No insert/update/delete policies are created for the anon/public role,
-- so writes only work via the service_role key (used server-side in app/api/cron/refresh-indicators).
