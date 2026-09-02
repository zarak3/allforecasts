# AllForecasts

Cross-domain forecasting platform. Next.js 14 (App Router) + TypeScript +
Tailwind, Supabase (Postgres) for data, deployed on Vercel with a daily
cron job pulling fresh indicator data.

## Architecture

- `entities` / `indicators` — generic schema: any metric, for any country/
  city/business/person, at any point in time. See `supabase/schema.sql`.
- `predictions` — the dated, falsifiable public calls that build the CV
  track record.
- `/api/cron/refresh-indicators` — pulls World Bank data server-side and
  upserts it. Runs daily via Vercel Cron (`vercel.json`); can also be hit
  manually.
- `/api/indicators`, `/api/predictions` — public read-only JSON, cached
  at the edge. Ready for the future natural-language interface to query.
- Every Supabase credential stays server-side (`lib/supabase.ts` uses the
  service_role key, imported only in Server Components and Route
  Handlers) -- nothing reaches the browser bundle.

## First-time setup

1. **Supabase**: open your project's SQL Editor and run, in order:
   - `supabase/schema.sql`
   - `supabase/seed_predictions.sql` (optional, seeds the 3 CV predictions)
2. **Env vars**: `cp .env.local.example .env.local` and fill in
   `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from Project Settings ->
   API in Supabase (use the **service_role** key, not anon).
3. **Install Node** (this machine didn't have it): the project was set up
   using a local copy at `~/.local/node/bin` --

   ```bash
   export PATH="$HOME/.local/node/bin:$PATH"
   ```

   Add that line to `~/.zshrc` if you want `node`/`npm` on PATH in every
   new terminal, or just run it once per session.
4. **Install deps and run**:

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000.
5. **Load the data** (all 217 World Bank countries x 16 indicators, plus a
   per-country GDP trend projection): with the dev server running, in
   another terminal:

   ```bash
   curl http://localhost:3000/api/cron/refresh-indicators
   ```

   Then check http://localhost:3000/countries.

## Deploying

1. Push this repo to GitHub (create an empty repo on github.com, then
   `git remote add origin <url> && git push -u origin main`).
2. Import the repo in Vercel (vercel.com -> Add New -> Project). No build
   config needed, Next.js is auto-detected.
3. In Vercel, add the same env vars as `.env.local` (Project -> Settings
   -> Environment Variables): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   and `CRON_SECRET` (any random string -- Vercel automatically sends it
   as a Bearer token when it triggers the cron job).
4. Add `allforecasts.com` as a custom domain in Vercel, then add the
   CNAME/A record it gives you into Cloudflare DNS.
5. The cron in `vercel.json` runs daily at 06:00 UTC once deployed. To
   trigger it manually against production:

   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://allforecasts.com/api/cron/refresh-indicators
   ```

## Adding the next data source / view

The schema is deliberately generic so this doesn't require a redesign:

- New indicator source: add fetch logic next to `lib/worldbank.ts`
  (e.g. `lib/who.ts`), call it from the cron route, tag rows with the
  right `category`/`source`.
- New entity type (city/business/person): insert into `entities` with
  that `type`; the existing `/countries` page and `CountryTable`
  component are already generic enough to fork into `/cities`, etc.
