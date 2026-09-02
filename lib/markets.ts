// Real, free, keyless market data. Commodities come from Yahoo Finance's
// public chart endpoint (unofficial, undocumented -- no auth, but can
// change or rate-limit without notice, so every call here is wrapped and
// degrades to an error the UI can show rather than a crash). Currencies
// come from Frankfurter (ECB rates, official free API, no key).

export interface Instrument {
  symbol: string;
  label: string;
  kind: "commodity" | "currency";
}

export const COMMODITIES: Instrument[] = [
  { symbol: "GC=F", label: "Gold", kind: "commodity" },
  { symbol: "SI=F", label: "Silver", kind: "commodity" },
  { symbol: "BZ=F", label: "Brent Crude Oil", kind: "commodity" },
  { symbol: "CL=F", label: "WTI Crude Oil", kind: "commodity" },
  { symbol: "HG=F", label: "Copper", kind: "commodity" },
  { symbol: "NG=F", label: "Natural Gas", kind: "commodity" },
];

// Frankfurter's own supported set (ECB reference rates) -- a real, if not
// literally exhaustive, list of major world currencies.
export const CURRENCIES: Instrument[] = [
  { symbol: "GBP", label: "British Pound", kind: "currency" },
  { symbol: "EUR", label: "Euro", kind: "currency" },
  { symbol: "JPY", label: "Japanese Yen", kind: "currency" },
  { symbol: "CNY", label: "Chinese Yuan", kind: "currency" },
  { symbol: "INR", label: "Indian Rupee", kind: "currency" },
  { symbol: "AUD", label: "Australian Dollar", kind: "currency" },
  { symbol: "CAD", label: "Canadian Dollar", kind: "currency" },
  { symbol: "CHF", label: "Swiss Franc", kind: "currency" },
  { symbol: "BRL", label: "Brazilian Real", kind: "currency" },
  { symbol: "ZAR", label: "South African Rand", kind: "currency" },
  { symbol: "MXN", label: "Mexican Peso", kind: "currency" },
  { symbol: "SGD", label: "Singapore Dollar", kind: "currency" },
  { symbol: "TRY", label: "Turkish Lira", kind: "currency" },
  { symbol: "KRW", label: "South Korean Won", kind: "currency" },
];

export interface PricePoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface MarketSeries {
  symbol: string;
  label: string;
  unit: string;
  points: PricePoint[];
  latest: number;
  changePercent: number | null;
}

const RANGE_TO_YAHOO: Record<string, { range: string; interval: string }> = {
  "1m": { range: "1mo", interval: "1d" },
  "6m": { range: "6mo", interval: "1wk" },
  "1y": { range: "1y", interval: "1wk" },
  "5y": { range: "5y", interval: "1mo" },
};

export async function fetchCommodity(symbol: string, range: string): Promise<MarketSeries> {
  const cfg = RANGE_TO_YAHOO[range] ?? RANGE_TO_YAHOO["1m"];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${cfg.range}&interval=${cfg.interval}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AllForecasts/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo Finance error for ${symbol}: ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const points: PricePoint[] = timestamps
    .map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), value: closes[i] }))
    .filter((p): p is PricePoint => typeof p.value === "number");

  const meta = result.meta ?? {};
  const commodity = COMMODITIES.find((c) => c.symbol === symbol);
  return {
    symbol,
    label: commodity?.label ?? meta.shortName ?? symbol,
    unit: "USD",
    points,
    latest: meta.regularMarketPrice ?? points[points.length - 1]?.value ?? 0,
    changePercent: typeof meta.regularMarketChangePercent === "number" ? meta.regularMarketChangePercent : null,
  };
}

export async function fetchCurrency(symbol: string, range: string): Promise<MarketSeries> {
  const days = range === "1m" ? 31 : range === "6m" ? 183 : range === "1y" ? 366 : 365 * 5;
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const url = `https://api.frankfurter.dev/v1/${start}..?base=USD&symbols=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Frankfurter error for ${symbol}: ${res.status}`);
  const data = await res.json();
  const rates: Record<string, Record<string, number>> = data.rates ?? {};
  const points: PricePoint[] = Object.entries(rates)
    .map(([date, r]) => ({ date, value: r[symbol] }))
    .filter((p): p is PricePoint => typeof p.value === "number")
    .sort((a, b) => a.date.localeCompare(b.date));

  const currency = CURRENCIES.find((c) => c.symbol === symbol);
  const latest = points[points.length - 1]?.value ?? 0;
  const prior = points[0]?.value ?? latest;
  return {
    symbol,
    label: currency?.label ?? symbol,
    unit: `${symbol} per USD`,
    points,
    latest,
    changePercent: prior ? ((latest - prior) / prior) * 100 : null,
  };
}
