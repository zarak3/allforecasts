import { supabaseServer } from "@/lib/supabase";
import StocksExplorer from "@/components/StocksExplorer";
import type { Indicator, Entity } from "@/lib/types";

export const revalidate = 3600;
export const metadata = {
  title: "Stocks — AllForecasts",
  description:
    "Real daily price history for 8 tracked stocks, via a legitimate free market-data API — with a simple personal watchlist that feeds the same anomaly-alert engine as everything else.",
};

async function getData(): Promise<{ indicators: Indicator[]; entities: Entity[]; loadError: string | null }> {
  try {
    const supabase = supabaseServer();
    const [indicatorsRes, entitiesRes] = await Promise.all([
      supabase
        .from("indicators")
        .select("id, entity_id, name, category, source, value, unit, period, entity:entities!inner(id, type, name, code)")
        .eq("entity.type", "business")
        .eq("name", "Stock price (close)")
        .order("period", { ascending: true })
        .range(0, 9999),
      supabase.from("entities").select("id, type, name, code").eq("type", "business").order("name"),
    ]);
    if (indicatorsRes.error) throw new Error(indicatorsRes.error.message);
    if (entitiesRes.error) throw new Error(entitiesRes.error.message);
    return {
      indicators: (indicatorsRes.data as unknown as Indicator[]) ?? [],
      entities: (entitiesRes.data as Entity[]) ?? [],
      loadError: null,
    };
  } catch (err) {
    return { indicators: [], entities: [], loadError: err instanceof Error ? err.message : String(err) };
  }
}

export default async function StocksPage() {
  const { indicators, entities, loadError } = await getData();

  return (
    <main className="section pt-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="eyebrow mb-3">Live stocks</div>
        <h1 className="text-3xl font-medium mb-3">Stocks</h1>
        <p className="text-ink-soft max-w-xl mb-2">
          Real daily closes for 8 tracked companies, from a legitimate free market-data API
          (Alpha Vantage) — refreshed daily, not scraped from any broker.
        </p>
        <p className="font-mono text-xs text-ink-soft max-w-xl mb-8">
          Star a stock to watch it — a starred stock is checked by the same real anomaly engine
          behind <a href="/alerts" className="text-accent">Alerts</a>, no separate system. Saved
          in this browser only.
        </p>

        {loadError ? (
          <p className="font-mono text-sm text-warn">Could not reach the database ({loadError}).</p>
        ) : entities.length === 0 ? (
          <p className="font-mono text-sm text-ink-soft">
            No stock data yet — waiting on the first daily refresh from Alpha Vantage.
          </p>
        ) : (
          <StocksExplorer indicators={indicators} entities={entities} />
        )}
      </div>
    </main>
  );
}
