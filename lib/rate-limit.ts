// Best-effort, in-memory rate limiting for the public API. Honest caveat:
// each serverless instance has its own memory, so this doesn't enforce a
// true global limit across Vercel's edge -- it deters casual/accidental
// hammering, not a determined abuser. A real global limit would need a
// shared store (e.g. Upstash Redis), which means another free-tier
// signup; not worth it before this API has real usage to justify it.

const buckets = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

export function rateLimit(key: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true, remaining: MAX_PER_WINDOW - 1 };
  }
  bucket.count += 1;
  return { ok: bucket.count <= MAX_PER_WINDOW, remaining: Math.max(0, MAX_PER_WINDOW - bucket.count) };
}

export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
