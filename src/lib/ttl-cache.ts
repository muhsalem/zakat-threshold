/**
 * Wraps a rate-limited upstream call so it runs at most once per `ttlMs`.
 *
 * - concurrent callers share one in-flight request
 * - after a failure the call is not retried for `failBackoffMs` (each attempt can burn quota),
 *   and callers receive that same error instead of a fresh request
 * - a cached value is never served past its TTL, so a stale quote can't masquerade as fresh
 */
export function ttlCached<T>(
  run: () => Promise<T>,
  options: { ttlMs: number; failBackoffMs?: number; now?: () => number },
): () => Promise<T> {
  const { ttlMs, failBackoffMs = 10 * 60_000, now = Date.now } = options;
  let value: { data: T; at: number } | null = null;
  let failure: { error: unknown; at: number } | null = null;
  let inflight: Promise<T> | null = null;

  return () => {
    const t = now();
    if (value && t - value.at < ttlMs) return Promise.resolve(value.data);
    if (failure && t - failure.at < failBackoffMs) return Promise.reject(failure.error);
    inflight ??= run()
      .then((data) => {
        value = { data, at: now() };
        failure = null;
        return data;
      })
      .catch((error: unknown) => {
        failure = { error, at: now() };
        throw error;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };
}
