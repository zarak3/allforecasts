// World Bank Open Data fetch helpers. First slice of the "pull data from
// anywhere, land it in the generic schema" pipeline -- more sources (WHO,
// UNESCO, ONS, GDELT...) plug in the same way later.

export const WORLD_BANK_INDICATORS: Record<
  string,
  { label: string; category: string; unit: string }
> = {
  "NY.GDP.PCAP.CD": { label: "GDP per capita (current US$)", category: "economic", unit: "USD" },
  "NY.GDP.MKTP.KD.ZG": { label: "GDP growth (annual %)", category: "economic", unit: "%" },
  "FP.CPI.TOTL.ZG": { label: "Inflation, consumer prices (annual %)", category: "economic", unit: "%" },
  "SL.UEM.TOTL.ZS": { label: "Unemployment rate", category: "economic", unit: "% of labor force" },
  "FI.RES.TOTL.CD": { label: "Total reserves (incl. gold)", category: "economic", unit: "USD" },
  "SP.DYN.LE00.IN": { label: "Life expectancy at birth", category: "health", unit: "years" },
  "SH.XPD.CHEX.GD.ZS": { label: "Health expenditure", category: "health", unit: "% of GDP" },
  "SE.ADT.LITR.ZS": { label: "Adult literacy rate", category: "education", unit: "%" },
  "SP.POP.TOTL": { label: "Population", category: "demographic", unit: "people" },
  "GC.DOD.TOTL.GD.ZS": { label: "Government debt", category: "economic", unit: "% of GDP" },
  "NY.GDP.PETR.RT.ZS": { label: "Oil rents", category: "economic", unit: "% of GDP" },
  "NY.GDP.TOTL.RT.ZS": { label: "Total natural resources rents", category: "economic", unit: "% of GDP" },
  "SL.EMP.TOTL.SP.ZS": { label: "Employment-to-population ratio", category: "economic", unit: "%" },
  "NY.GNP.PCAP.CD": { label: "GNI per capita (Atlas method)", category: "economic", unit: "USD" },
  "SP.DYN.IMRT.IN": { label: "Infant mortality rate", category: "health", unit: "per 1,000 live births" },
  "SH.MED.PHYS.ZS": { label: "Physicians", category: "health", unit: "per 1,000 people" },
};

export interface WorldBankCountry {
  code: string; // ISO2
  name: string;
}

interface RawWorldBankCountry {
  id: string;
  iso2Code: string;
  name: string;
  region: { id: string; value: string };
}

// Fetches every real country World Bank tracks (excludes aggregates like
// "World", "Euro area", income-group buckets, etc. -- those have region.id "NA").
export async function fetchAllCountries(): Promise<WorldBankCountry[]> {
  const url = "https://api.worldbank.org/v2/country?format=json&per_page=400";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`World Bank country list error: ${res.status}`);
  const payload = await res.json();
  const rows: RawWorldBankCountry[] = payload?.[1] ?? [];
  return rows
    .filter((c) => c.region?.id !== "NA" && c.iso2Code && c.iso2Code !== "")
    .map((c) => ({ code: c.iso2Code, name: c.name }));
}

interface RawWorldBankEntry {
  country: { id: string; value: string }; // country.id is the ISO2 code here (NOT countryiso2code -- that field doesn't exist on this endpoint)
  date: string;
  value: number | null;
}

export interface WorldBankEntry {
  countryiso2code: string;
  date: string;
  value: number | null;
}

// Fetches one indicator for every country in a single call (most-recent
// non-empty value per country), then keeps only rows for real countries.
export async function fetchWorldBankIndicatorForAllCountries(
  indicatorCode: string,
  knownCountryCodes: Set<string>
): Promise<WorldBankEntry[]> {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicatorCode}?format=json&per_page=20000&mrnev=1`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`World Bank API error for ${indicatorCode}: ${res.status}`);
  }
  const payload = await res.json();
  if (!Array.isArray(payload) || payload.length < 2 || !payload[1]) return [];
  const rows = payload[1] as RawWorldBankEntry[];
  return rows
    .filter((r) => knownCountryCodes.has(r.country?.id))
    .map((r) => ({ countryiso2code: r.country.id, date: r.date, value: r.value }));
}
