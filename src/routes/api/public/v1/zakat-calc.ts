import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit.server";
import { runZakatCalcV1 } from "@/lib/api/v1-zakat";
import { detail, v1ErrorResponse } from "@/lib/api/v1-errors";
import { etagOf, fastHash, ifNoneMatch, memoGet, memoSet, notModified } from "@/lib/api/v1-cache";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, If-None-Match",
  "Access-Control-Expose-Headers":
    "ETag, X-Cache, X-Request-Id, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
  "Content-Type": "application/json; charset=utf-8",
};

/** نفس المدخلات الحرفية خلال هذه النافذة تُعيد نفس الشهادة بدل إعادة الحساب */
const CALC_TTL_MS = 60_000;

function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req_${Date.now().toString(36)}`;
  }
}

export const Route = createFileRoute("/api/public/v1/zakat-calc")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const requestId = newRequestId();

        const rl = await rateLimit(request, { key: "zakat-calc-v1", limit: 60, windowMs: 60_000 });
        const headers = { ...CORS, "X-Request-Id": requestId, ...rateLimitHeaders(rl) };

        if (!rl.ok) {
          return v1ErrorResponse("ZKT-1040", headers, {
            requestId,
            details: [
              detail("ZKT-1040", {
                message: `تجاوزت 60 طلباً في الدقيقة — أعد المحاولة بعد ${rl.retryAfter} ثانية.`,
                remediation: "استخدم تخزيناً مؤقتاً للنتائج أو وزّع الطلبات على نافذة أطول.",
              }),
            ],
            extraHeaders: { "Retry-After": String(rl.retryAfter) },
          });
        }

        let raw: string;
        try {
          raw = await request.text();
        } catch {
          return v1ErrorResponse("ZKT-1001", headers, { requestId });
        }

        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return v1ErrorResponse("ZKT-1001", headers, { requestId });
        }

        const cacheKey = `calc:${fastHash(raw)}`;
        const cached = memoGet<{ payload: Record<string, unknown>; etag: string }>(cacheKey);

        if (cached) {
          if (ifNoneMatch(request, cached.etag)) {
            return notModified(cached.etag, { ...headers, "X-Cache": "HIT" });
          }
          return new Response(JSON.stringify({ ...cached.payload, requestId }), {
            status: 200,
            headers: {
              ...headers,
              ETag: cached.etag,
              "X-Cache": "HIT",
              // خاص بالمستدعي فقط — لا يُخزَّن على وسطاء مشتركين
              "Cache-Control": `private, max-age=${CALC_TTL_MS / 1000}`,
            },
          });
        }

        const out = await runZakatCalcV1(body, { requestId });
        if (!out.ok) {
          return new Response(JSON.stringify(out.payload), {
            status: out.status,
            headers: { ...headers, "Cache-Control": "no-store" },
          });
        }

        const etag = etagOf(out.payload.certificate.contentHash);
        memoSet(cacheKey, { payload: out.payload, etag }, CALC_TTL_MS);

        if (ifNoneMatch(request, etag)) {
          return notModified(etag, { ...headers, "X-Cache": "MISS" });
        }

        return new Response(JSON.stringify(out.payload), {
          status: out.status,
          headers: {
            ...headers,
            ETag: etag,
            "X-Cache": "MISS",
            "Cache-Control": `private, max-age=${CALC_TTL_MS / 1000}`,
          },
        });
      },
    },
  },
});
