import { getRequestHeader } from "@tanstack/react-start/server";

import { createLimiter } from "./rate-limit";

const hit = createLimiter();

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
  if (!hit(`${scope}:${clientKey()}`, max, windowMs)) throw new Error("RATE_LIMIT");
}
