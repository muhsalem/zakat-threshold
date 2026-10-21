type Bucket = { count: number; resetAt: number };

/** Fixed-window counter. Returns false once `key` has exceeded `max` hits in the window. */
export function createLimiter() {
  const buckets = new Map<string, Bucket>();
  return function hit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
    if (buckets.size > 5_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= max;
  };
}
