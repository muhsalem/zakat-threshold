import { getRequestHeader } from "@tanstack/react-start/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Best-effort client key: first forwarded address, else a shared "anon" bucket. */
function clientKey(): string {
  const fwd = getRequestHeader("x-forwarded-for") ?? getRequestHeader("cf-connecting-ip") ?? "";
  return fwd.split(",")[0]?.trim() || "anon";
}

/**
 * Fixed-window in-memory limiter for endpoints that spend paid AI credits.
 * Per server instance only — it blunts casual abuse, it is not a hard quota.
 * Throws "RATE_LIMIT" (the code the AI callers already map) when exceeded.
 */
export function enforceRateLimit(scope: string, max: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const key = `${scope}:${clientKey()}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > max) throw new Error("RATE_LIMIT");
}
