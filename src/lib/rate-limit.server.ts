// محدّد طلبات بسيط في الذاكرة لكل عامل (Worker) — يكفي لتخفيف الإساءة العامة
// ليس بديلاً عن WAF؛ لتطبيق متعدد المناطق استخدم KV/Durable Objects لاحقاً.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  request: Request,
  opts: { key: string; limit: number; windowMs: number }
): { ok: true } | { ok: false; retryAfter: number } {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anon";
  const id = `${opts.key}:${ip}`;
  const now = Date.now();
  const b = buckets.get(id);
  if (!b || b.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (b.count >= opts.limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true };
}

export function rateLimitResponse(
  retryAfter: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({ ok: false, error: "rate_limited", retry_after: retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(retryAfter),
        ...extraHeaders,
      },
    }
  );
}
