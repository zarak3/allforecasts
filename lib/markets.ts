// Real, free, keyless market data. Commodities come from Yahoo Finance's
// public chart endpoint (unofficial, undocumented -- no auth, but can
// change or rate-limit without notice, so every call here is wrapped and
// degrades to an error the UI can show rather than a crash). Currencies
// come from the fawazahmed0/currency-api (free, keyless, mirrors ECB plus
// ~150 more real ISO 4217 currencies most sources of this kind don't cover,
// e.g. PKR, NGN -- served off jsdelivr/Cloudflare, updated daily).

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

// Every circulating ISO 4217 currency code, quoted against USD -- not a
// hand-picked "major currencies" subset. A few real currencies (e.g. some
// pegged Gulf/Pacific ones) may be thin on history in the underlying feed;
// the chart just shows fewer points when that happens rather than failing.
export const CURRENCIES: Instrument[] = [
  { symbol: "AED", label: "UAE Dirham", kind: "currency" },
  { symbol: "AFN", label: "Afghan Afghani", kind: "currency" },
  { symbol: "ALL", label: "Albanian Lek", kind: "currency" },
  { symbol: "AMD", label: "Armenian Dram", kind: "currency" },
  { symbol: "ANG", label: "Netherlands Antillean Guilder", kind: "currency" },
  { symbol: "AOA", label: "Angolan Kwanza", kind: "currency" },
  { symbol: "ARS", label: "Argentine Peso", kind: "currency" },
  { symbol: "AUD", label: "Australian Dollar", kind: "currency" },
  { symbol: "AWG", label: "Aruban Florin", kind: "currency" },
  { symbol: "AZN", label: "Azerbaijani Manat", kind: "currency" },
  { symbol: "BAM", label: "Bosnia-Herzegovina Mark", kind: "currency" },
  { symbol: "BBD", label: "Barbadian Dollar", kind: "currency" },
  { symbol: "BDT", label: "Bangladeshi Taka", kind: "currency" },
  { symbol: "BGN", label: "Bulgarian Lev", kind: "currency" },
  { symbol: "BHD", label: "Bahraini Dinar", kind: "currency" },
  { symbol: "BIF", label: "Burundian Franc", kind: "currency" },
  { symbol: "BMD", label: "Bermudan Dollar", kind: "currency" },
  { symbol: "BND", label: "Brunei Dollar", kind: "currency" },
  { symbol: "BOB", label: "Bolivian Boliviano", kind: "currency" },
  { symbol: "BRL", label: "Brazilian Real", kind: "currency" },
  { symbol: "BSD", label: "Bahamian Dollar", kind: "currency" },
  { symbol: "BTN", label: "Bhutanese Ngultrum", kind: "currency" },
  { symbol: "BWP", label: "Botswanan Pula", kind: "currency" },
  { symbol: "BYN", label: "Belarusian Ruble", kind: "currency" },
  { symbol: "BZD", label: "Belize Dollar", kind: "currency" },
  { symbol: "CAD", label: "Canadian Dollar", kind: "currency" },
  { symbol: "CDF", label: "Congolese Franc", kind: "currency" },
  { symbol: "CHF", label: "Swiss Franc", kind: "currency" },
  { symbol: "CLP", label: "Chilean Peso", kind: "currency" },
  { symbol: "CNY", label: "Chinese Yuan", kind: "currency" },
  { symbol: "COP", label: "Colombian Peso", kind: "currency" },
  { symbol: "CRC", label: "Costa Rican Colón", kind: "currency" },
  { symbol: "CUP", label: "Cuban Peso", kind: "currency" },
  { symbol: "CVE", label: "Cape Verdean Escudo", kind: "currency" },
  { symbol: "CZK", label: "Czech Koruna", kind: "currency" },
  { symbol: "DJF", label: "Djiboutian Franc", kind: "currency" },
  { symbol: "DKK", label: "Danish Krone", kind: "currency" },
  { symbol: "DOP", label: "Dominican Peso", kind: "currency" },
  { symbol: "DZD", label: "Algerian Dinar", kind: "currency" },
  { symbol: "EGP", label: "Egyptian Pound", kind: "currency" },
  { symbol: "ERN", label: "Eritrean Nakfa", kind: "currency" },
  { symbol: "ETB", label: "Ethiopian Birr", kind: "currency" },
  { symbol: "EUR", label: "Euro", kind: "currency" },
  { symbol: "FJD", label: "Fijian Dollar", kind: "currency" },
  { symbol: "FKP", label: "Falkland Islands Pound", kind: "currency" },
  { symbol: "GBP", label: "British Pound", kind: "currency" },
  { symbol: "GEL", label: "Georgian Lari", kind: "currency" },
  { symbol: "GHS", label: "Ghanaian Cedi", kind: "currency" },
  { symbol: "GIP", label: "Gibraltar Pound", kind: "currency" },
  { symbol: "GMD", label: "Gambian Dalasi", kind: "currency" },
  { symbol: "GNF", label: "Guinean Franc", kind: "currency" },
  { symbol: "GTQ", label: "Guatemalan Quetzal", kind: "currency" },
  { symbol: "GYD", label: "Guyanaese Dollar", kind: "currency" },
  { symbol: "HKD", label: "Hong Kong Dollar", kind: "currency" },
  { symbol: "HNL", label: "Honduran Lempira", kind: "currency" },
  { symbol: "HTG", label: "Haitian Gourde", kind: "currency" },
  { symbol: "HUF", label: "Hungarian Forint", kind: "currency" },
  { symbol: "IDR", label: "Indonesian Rupiah", kind: "currency" },
  { symbol: "ILS", label: "Israeli New Shekel", kind: "currency" },
  { symbol: "INR", label: "Indian Rupee", kind: "currency" },
  { symbol: "IQD", label: "Iraqi Dinar", kind: "currency" },
  { symbol: "IRR", label: "Iranian Rial", kind: "currency" },
  { symbol: "ISK", label: "Icelandic Króna", kind: "currency" },
  { symbol: "JMD", label: "Jamaican Dollar", kind: "currency" },
  { symbol: "JOD", label: "Jordanian Dinar", kind: "currency" },
  { symbol: "JPY", label: "Japanese Yen", kind: "currency" },
  { symbol: "KES", label: "Kenyan Shilling", kind: "currency" },
  { symbol: "KGS", label: "Kyrgystani Som", kind: "currency" },
  { symbol: "KHR", label: "Cambodian Riel", kind: "currency" },
  { symbol: "KMF", label: "Comorian Franc", kind: "currency" },
  { symbol: "KRW", label: "South Korean Won", kind: "currency" },
  { symbol: "KWD", label: "Kuwaiti Dinar", kind: "currency" },
  { symbol: "KYD", label: "Cayman Islands Dollar", kind: "currency" },
  { symbol: "KZT", label: "Kazakhstani Tenge", kind: "currency" },
  { symbol: "LAK", label: "Laotian Kip", kind: "currency" },
  { symbol: "LBP", label: "Lebanese Pound", kind: "currency" },
  { symbol: "LKR", label: "Sri Lankan Rupee", kind: "currency" },
  { symbol: "LRD", label: "Liberian Dollar", kind: "currency" },
  { symbol: "LSL", label: "Lesotho Loti", kind: "currency" },
  { symbol: "LYD", label: "Libyan Dinar", kind: "currency" },
  { symbol: "MAD", label: "Moroccan Dirham", kind: "currency" },
  { symbol: "MDL", label: "Moldovan Leu", kind: "currency" },
  { symbol: "MGA", label: "Malagasy Ariary", kind: "currency" },
  { symbol: "MKD", label: "Macedonian Denar", kind: "currency" },
  { symbol: "MMK", label: "Myanma Kyat", kind: "currency" },
  { symbol: "MNT", label: "Mongolian Tugrik", kind: "currency" },
  { symbol: "MOP", label: "Macanese Pataca", kind: "currency" },
  { symbol: "MRU", label: "Mauritanian Ouguiya", kind: "currency" },
  { symbol: "MUR", label: "Mauritian Rupee", kind: "currency" },
  { symbol: "MVR", label: "Maldivian Rufiyaa", kind: "currency" },
  { symbol: "MWK", label: "Malawian Kwacha", kind: "currency" },
  { symbol: "MXN", label: "Mexican Peso", kind: "currency" },
  { symbol: "MYR", label: "Malaysian Ringgit", kind: "currency" },
  { symbol: "MZN", label: "Mozambican Metical", kind: "currency" },
  { symbol: "NAD", label: "Namibian Dollar", kind: "currency" },
  { symbol: "NGN", label: "Nigerian Naira", kind: "currency" },
  { symbol: "NIO", label: "Nicaraguan Córdoba", kind: "currency" },
  { symbol: "NOK", label: "Norwegian Krone", kind: "currency" },
  { symbol: "NPR", label: "Nepalese Rupee", kind: "currency" },
  { symbol: "NZD", label: "New Zealand Dollar", kind: "currency" },
  { symbol: "OMR", label: "Omani Rial", kind: "currency" },
  { symbol: "PAB", label: "Panamanian Balboa", kind: "currency" },
  { symbol: "PEN", label: "Peruvian Sol", kind: "currency" },
  { symbol: "PGK", label: "Papua New Guinean Kina", kind: "currency" },
  { symbol: "PHP", label: "Philippine Peso", kind: "currency" },
  { symbol: "PKR", label: "Pakistani Rupee", kind: "currency" },
  { symbol: "PLN", label: "Polish Złoty", kind: "currency" },
  { symbol: "PYG", label: "Paraguayan Guarani", kind: "currency" },
  { symbol: "QAR", label: "Qatari Rial", kind: "currency" },
  { symbol: "RON", label: "Romanian Leu", kind: "currency" },
  { symbol: "RSD", label: "Serbian Dinar", kind: "currency" },
  { symbol: "RUB", label: "Russian Ruble", kind: "currency" },
  { symbol: "RWF", label: "Rwandan Franc", kind: "currency" },
  { symbol: "SAR", label: "Saudi Riyal", kind: "currency" },
  { symbol: "SBD", label: "Solomon Islands Dollar", kind: "currency" },
  { symbol: "SCR", label: "Seychellois Rupee", kind: "currency" },
  { symbol: "SDG", label: "Sudanese Pound", kind: "currency" },
  { symbol: "SEK", label: "Swedish Krona", kind: "currency" },
  { symbol: "SGD", label: "Singapore Dollar", kind: "currency" },
  { symbol: "SHP", label: "Saint Helena Pound", kind: "currency" },
  { symbol: "SLE", label: "Sierra Leonean Leone", kind: "currency" },
  { symbol: "SOS", label: "Somali Shilling", kind: "currency" },
  { symbol: "SRD", label: "Surinamese Dollar", kind: "currency" },
  { symbol: "SSP", label: "South Sudanese Pound", kind: "currency" },
  { symbol: "STN", label: "São Tomé Dobra", kind: "currency" },
  { symbol: "SYP", label: "Syrian Pound", kind: "currency" },
  { symbol: "SZL", label: "Swazi Lilangeni", kind: "currency" },
  { symbol: "THB", label: "Thai Baht", kind: "currency" },
  { symbol: "TJS", label: "Tajikistani Somoni", kind: "currency" },
  { symbol: "TMT", label: "Turkmenistani Manat", kind: "currency" },
  { symbol: "TND", label: "Tunisian Dinar", kind: "currency" },
  { symbol: "TOP", label: "Tongan Paʻanga", kind: "currency" },
  { symbol: "TRY", label: "Turkish Lira", kind: "currency" },
  { symbol: "TTD", label: "Trinidad and Tobago Dollar", kind: "currency" },
  { symbol: "TWD", label: "New Taiwan Dollar", kind: "currency" },
  { symbol: "TZS", label: "Tanzanian Shilling", kind: "currency" },
  { symbol: "UAH", label: "Ukrainian Hryvnia", kind: "currency" },
  { symbol: "UGX", label: "Ugandan Shilling", kind: "currency" },
  { symbol: "UYU", label: "Uruguayan Peso", kind: "currency" },
  { symbol: "UZS", label: "Uzbekistan Som", kind: "currency" },
  { symbol: "VES", label: "Venezuelan Bolívar", kind: "currency" },
  { symbol: "VND", label: "Vietnamese Dong", kind: "currency" },
  { symbol: "VUV", label: "Vanuatu Vatu", kind: "currency" },
  { symbol: "WST", label: "Samoan Tala", kind: "currency" },
  { symbol: "XAF", label: "Central African CFA Franc", kind: "currency" },
  { symbol: "XCD", label: "East Caribbean Dollar", kind: "currency" },
  { symbol: "XOF", label: "West African CFA Franc", kind: "currency" },
  { symbol: "XPF", label: "CFP Franc", kind: "currency" },
  { symbol: "YER", label: "Yemeni Rial", kind: "currency" },
  { symbol: "ZAR", label: "South African Rand", kind: "currency" },
  { symbol: "ZMW", label: "Zambian Kwacha", kind: "currency" },
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

// The currency-api only serves one date per request (no date-range endpoint
// like Frankfurter's), so a history is built by sampling a bounded number
// of dates in parallel -- daily for 1M, then progressively sparser so a 5Y
// chart doesn't mean 1800+ requests. Still real data for every point, just
// not every single day for the longer ranges.
const RANGE_SAMPLING: Record<string, { days: number; stepDays: number }> = {
  "1m": { days: 30, stepDays: 2 },
  "6m": { days: 183, stepDays: 9 },
  "1y": { days: 365, stepDays: 15 },
  "5y": { days: 365 * 5, stepDays: 45 },
};

async function fetchCurrencyRateOnDate(symbol: string, dateStr: string): Promise<number | null> {
  const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/usd.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  const value = data?.usd?.[symbol.toLowerCase()];
  return typeof value === "number" ? value : null;
}

export async function fetchCurrency(symbol: string, range: string): Promise<MarketSeries> {
  const cfg = RANGE_SAMPLING[range] ?? RANGE_SAMPLING["1m"];
  const dates: string[] = [];
  for (let d = cfg.days; d >= 0; d -= cfg.stepDays) {
    dates.push(new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  }
  dates.push(new Date().toISOString().slice(0, 10)); // always include today

  const results = await Promise.all(dates.map((d) => fetchCurrencyRateOnDate(symbol, d)));
  const points: PricePoint[] = dates
    .map((date, i) => ({ date, value: results[i] }))
    .filter((p): p is PricePoint => typeof p.value === "number")
    // de-dupe same-day entries and sort chronologically
    .filter((p, i, arr) => arr.findIndex((q) => q.date === p.date) === i)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length === 0) throw new Error(`No data available for ${symbol}`);

  const currency = CURRENCIES.find((c) => c.symbol === symbol);
  const latest = points[points.length - 1].value;
  const prior = points[0].value;
  return {
    symbol,
    label: currency?.label ?? symbol,
    unit: `${symbol} per USD`,
    points,
    latest,
    changePercent: prior ? ((latest - prior) / prior) * 100 : null,
  };
}
