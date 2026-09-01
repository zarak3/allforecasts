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
  created_at timestamptz not null default now()
);

-- Row Level Security: public read-only access, writes only via service_role key
alter table entities enable row level security;
alter table indicators enable row level security;
alter table predictions enable row level security;

create policy "public read entities" on entities for select using (true);
create policy "public read indicators" on indicators for select using (true);
create policy "public read predictions" on predictions for select using (true);

-- No insert/update/delete policies are created for the anon/public role,
-- so writes only work via the service_role key (used server-side by scripts/fetch_indicators.py).
