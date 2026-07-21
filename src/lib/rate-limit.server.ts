// محدّد طلبات موزَّع: يستخدم Cloudflare KV إن كان مربوطاً (binding باسم
// RATE_LIMIT_KV في wrangler.jsonc) فيُطبَّق الحد عبر كل نسخ الـWorker معاً؛
// وإلا يتراجع تلقائياً لحد في ذاكرة العملية الواحدة (كافٍ للتطوير المحلي
// ولا يمنع الإساءة الموزَّعة على الإنتاج بلا KV مُهيَّأ — انظر README القسم
// "تفعيل حد الطلبات الموزَّع").
//
// نموذج نافذة ثابتة (Fixed Window) — بسيط وكافٍ لحماية عامة من إساءة الاستخدام،
// وليس بديلاً عن WAF لهجمات DDoS الحقيقية.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

// منفذ حقن للاختبارات فقط — process.env الحقيقي في Node.js لا يقبل قيماً
// غير نصية بتاتاً (يحوّلها إلى نص قسراً)، فلا يمكن محاكاة KVNamespace عبره
// في بيئة الاختبار كما يمكن على عامل Cloudflare (حيث process.env كائن
// polyfill من Nitro/unenv يحافظ على قيم الـbindings ككائنات فعلية).
let kvOverrideForTests: KvLike | null | undefined;
export function __setRateLimitKvForTests(kv: KvLike | null): void {
  kvOverrideForTests = kv;
}

function getKv(): KvLike | null {
  if (kvOverrideForTests !== undefined) return kvOverrideForTests;
  const kv = (process.env as unknown as Record<string, unknown>).RATE_LIMIT_KV;
  if (kv && typeof (kv as KvLike).get === "function" && typeof (kv as KvLike).put === "function") {
    return kv as KvLike;
  }
  return null;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anon"
  );
}

async function rateLimitKv(
  kv: KvLike,
  id: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const now = Date.now();
  const raw = await kv.get(id);
  const bucket = raw ? (JSON.parse(raw) as Bucket) : null;

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    await kv.put(id, JSON.stringify({ count: 1, resetAt }), {
      expirationTtl: Math.ceil(windowMs / 1000) + 5,
    });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  await kv.put(id, JSON.stringify({ count: bucket.count + 1, resetAt: bucket.resetAt }), {
    expirationTtl: Math.ceil((bucket.resetAt - now) / 1000) + 5,
  });
  return { ok: true };
}

function rateLimitMemory(
  id: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(id);
  if (!b || b.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true };
}

export async function rateLimit(
  request: Request,
  opts: { key: string; limit: number; windowMs: number },
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const id = `rl:${opts.key}:${clientIp(request)}`;
  const kv = getKv();
  if (kv) {
    try {
      return await rateLimitKv(kv, id, opts.limit, opts.windowMs);
    } catch {
      // فشل KV (شبكة/حصة) — لا نفشل الطلب بالكامل، نتراجع للحد المحلي
      return rateLimitMemory(id, opts.limit, opts.windowMs);
    }
  }
  return rateLimitMemory(id, opts.limit, opts.windowMs);
}

export function rateLimitResponse(
  retryAfter: number,
  extraHeaders: Record<string, string> = {},
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
    },
  );
}
