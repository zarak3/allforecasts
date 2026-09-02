// World Bank's official country names don't always match common usage.
// This only changes what's displayed -- the underlying data stays
// attributed to the World Bank's own series under its own name.
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  PS: "Palestine",
};

export function displayCountryName(code: string | null | undefined, fallbackName: string): string {
  if (!code) return fallbackName;
  return DISPLAY_NAME_OVERRIDES[code] ?? fallbackName;
}
