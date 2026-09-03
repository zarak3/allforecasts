// Real email sending via Resend.

// Configurable so switching to a verified allforecasts.com domain later is
// a one-line env change, not a redeploy of logic. Until EMAIL_FROM is set,
// falls back to Resend's shared sandbox sender -- works, but has no
// reputation tied to this domain, which is exactly why it's landing in
// junk right now.
function fromAddress(): string {
  return process.env.EMAIL_FROM || "AllForecasts <onboarding@resend.dev>";
}

export async function sendEmail(apiKey: string, to: string, subject: string, text: string, html: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: fromAddress(), to, subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend API error: ${res.status} ${await res.text()}`);
}

// Clean, single-column, inline-styled (email clients strip <style> blocks
// unpredictably, Gmail especially) -- logo, the narrated digest as plain
// paragraphs, then the same contact/social footer and disclaimer the site
// itself uses. Deliberately not trying to replicate the site's full
// Newsreader/Fraunces/Plex Mono type system -- email font support is too
// inconsistent for that; one serif for the wordmark, system sans for body.
export function buildDigestHtml(digestText: string): string {
  const paragraphs = digestText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px;color:#1a1a17;font-size:15px;line-height:1.6;">${line}</p>`)
    .join("\n");

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background-color:#faf6ee;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf6ee;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" style="max-width:560px;background-color:#faf6ee;">
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid #ddd4bd;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:10px;">
                    <img src="https://allforecasts.com/icon" width="32" height="32" alt="AllForecasts" style="display:block;border-radius:50%;" />
                  </td>
                  <td>
                    <span style="font-family:Georgia,'Times New Roman',serif;font-weight:600;font-size:20px;color:#1a1a17;">AllForecasts</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 8px;">
              <span style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#1e3a5f;">Weekly digest</span>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              ${paragraphs}
            </td>
          </tr>
          <tr>
            <td style="padding-top:20px;border-top:1px solid #ddd4bd;">
              <p style="margin:0 0 12px;font-family:'Courier New',monospace;font-size:11px;line-height:1.6;color:#6b6656;max-width:480px;">
                Nothing on this site is financial advice. Forecasts are probabilistic estimates for informational and illustrative purposes only, built from public data sources with attribution (World Bank, ONS, WHO, UNESCO). Do not make investment or financial decisions based on this content.
              </p>
              <p style="margin:0;font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;">
                <a href="mailto:hello@allforecasts.com" style="color:#1e3a5f;text-decoration:none;">hello@allforecasts.com</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="https://x.com/allforecast" style="color:#1e3a5f;text-decoration:none;">@allforecast</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="https://instagram.com/allforecast" style="color:#1e3a5f;text-decoration:none;">@allforecast</a>
              </p>
              <p style="margin:12px 0 0;">
                <a href="https://allforecasts.com" style="font-family:'Courier New',monospace;font-size:11px;color:#6b6656;text-decoration:none;">allforecasts.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
