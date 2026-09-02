// Fetches a Google Font as raw bytes for use with next/og's ImageResponse,
// which needs real font data (no system-font access in that runtime).
// `text` scopes the request to only the glyphs actually used, per Google's
// CSS2 API -- keeps the fetched file tiny for a two-letter monogram.
export async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(cssUrl)).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/);
  if (!match) throw new Error(`Could not find a font file for ${family} ${weight} in the Google Fonts CSS response`);
  const res = await fetch(match[1]);
  if (!res.ok) throw new Error(`Failed to download font file for ${family} ${weight}: ${res.status}`);
  return res.arrayBuffer();
}
