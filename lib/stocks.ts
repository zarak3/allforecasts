// Real stock data via Alpha Vantage -- a legitimate, documented, free
// (no card, no scraping) market-data API, per the roadmap's explicit
// instruction not to scrape broker sites or reuse the same unofficial-
// endpoint technique already used for commodities in lib/markets.ts.

export interface TrackedStock {
  symbol: string;
  name: string;
}

// 8 real, liquid, globally recognized tickers across sectors -- enough
// diversity for a watchlist demo without stretching the 25-req/day free
// tier (one call per symbol per refresh).
export const TRACKED_STOCKS: TrackedStock[] = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "NVDA", name: "Nvidia" },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "XOM", name: "ExxonMobil" },
  { symbol: "TSLA", name: "Tesla" },
];

export interface DailyClose {
  date: string; // YYYY-MM-DD
  close: number;
}

// Real daily closes for one symbol, most recent ~100 trading days
// ("compact" output size). Alpha Vantage rate-limits hard on the free
// tier, so callers should space out requests across symbols.
export async function fetchDailyCloses(symbol: string, apiKey: string): Promise<DailyClose[]> {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Alpha Vantage error for ${symbol}: ${res.status}`);
  const payload = await res.json();

  if (payload["Note"]) throw new Error(`Alpha Vantage rate limit: ${payload["Note"]}`);
  if (payload["Error Message"]) throw new Error(`Alpha Vantage error for ${symbol}: ${payload["Error Message"]}`);

  const series = payload["Time Series (Daily)"] as Record<string, { "4. close": string }> | undefined;
  if (!series) throw new Error(`Alpha Vantage: no time series for ${symbol}`);

  return Object.entries(series)
    .map(([date, day]) => ({ date, close: Number(day["4. close"]) }))
    .filter((d) => Number.isFinite(d.close))
    .sort((a, b) => a.date.localeCompare(b.date));
}
