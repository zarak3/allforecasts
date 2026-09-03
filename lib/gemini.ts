// Shared Gemini caller for Zeno and the weekly digest. Retries on 503
// specifically -- observed live, repeatedly, that gemini-3.6-flash's free
// tier genuinely flaps between working and "high demand" within seconds
// of each other, not a sustained outage. Other error codes (bad request,
// auth) won't fix themselves with a retry, so those fail immediately.

const MODEL = "gemini-3.6-flash";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 4000;

export async function callGemini(apiKey: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  let lastError = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();

    const errBody = await res.text();
    lastError = `Gemini API error: ${res.status} ${errBody}`;
    if (res.status !== 503 || attempt === MAX_ATTEMPTS - 1) throw new Error(lastError);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
  throw new Error(lastError);
}
