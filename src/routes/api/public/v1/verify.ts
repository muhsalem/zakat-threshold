import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit.server";
import { runZakatCalcV1 } from "@/lib/api/v1-zakat";
import { detail, v1ErrorResponse } from "@/lib/api/v1-errors";
import { authenticateApiKey } from "@/lib/api/v1-auth.server";
import { NO_STORE } from "@/lib/api/v1-cache";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Expose-Headers":
    "X-Request-Id, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
  "Content-Type": "application/json; charset=utf-8",
  // التحقق لا يُخزَّن أبداً — يُعاد حسابه من الصفر في كل طلب حفاظاً على صحّته
  "Cache-Control": NO_STORE,
};

function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req_${Date.now().toString(36)}`;
  }
}

/**
 * إعادة إنتاج نتيجة سابقة والتحقق من بصمتها.
 * body = { input: <نفس مدخلات zakat-calc>, contentHash: "..." , issuedAt?: ISO }
 */
export const Route = createFileRoute("/api/public/v1/verify")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const requestId = newRequestId();
        const rl = await rateLimit(request, { key: "verify-v1", limit: 60, windowMs: 60_000 });
        const headers = { ...CORS, "X-Request-Id": requestId, ...rateLimitHeaders(rl) };
        if (!rl.ok) {
          return v1ErrorResponse("ZKT-1040", headers, {
            requestId,
            details: [
              detail("ZKT-1040", {
                message: `تجاوزت 60 طلباً في الدقيقة — أعد المحاولة بعد ${rl.retryAfter} ثانية.`,
              }),
            ],
            extraHeaders: { "Retry-After": String(rl.retryAfter) },
          });
        }

        const auth = await authenticateApiKey(request, "zakat:verify");
        if (!auth.ok) {
          const code =
            auth.reason === "missing"
              ? "ZKT-1020"
              : auth.reason === "invalid"
                ? "ZKT-1021"
                : auth.reason === "revoked"
                  ? "ZKT-1022"
                  : "ZKT-1023";
          return v1ErrorResponse(
            code,
            { ...headers, "Cache-Control": "no-store" },
            {
              requestId,
              details: [detail(code, { message: auth.message })],
              extraHeaders:
                auth.reason === "missing" || auth.reason === "invalid"
                  ? { "WWW-Authenticate": 'Bearer realm="nisab-v1"' }
                  : {},
            },
          );
        }

        let body: { input?: unknown; contentHash?: unknown; issuedAt?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return v1ErrorResponse("ZKT-1001", headers, { requestId });
        }

        const claimedHash = typeof body?.contentHash === "string" ? body.contentHash : "";
        if (!/^[0-9a-f]{64}$/.test(claimedHash)) {
          return v1ErrorResponse("ZKT-1030", headers, {
            requestId,
            details: [
              detail("ZKT-1030", {
                field: "contentHash",
                message: claimedHash
                  ? `القيمة المرسلة (${claimedHash.length} محرفاً) ليست بصمة SHA-256 بصيغة hex صغيرة من 64 محرفاً.`
                  : "الحقل contentHash مفقود — أرسل البصمة الصادرة مع الشهادة السابقة.",
                remediation: "انسخ certificate.contentHash من استجابة /api/public/v1/zakat-calc.",
              }),
            ],
          });
        }

        const out = await runZakatCalcV1(body?.input, {
          issuedAt: typeof body?.issuedAt === "string" ? body.issuedAt : undefined,
          requestId,
        });
        if (!out.ok) {
          return new Response(JSON.stringify(out.payload), { status: out.status, headers });
        }

        const recomputed = out.payload.certificate.contentHash;
        const valid = recomputed === claimedHash;
        return new Response(
          JSON.stringify({
            apiVersion: "v1",
            status: "success",
            valid,
            message: valid
              ? "البصمة مطابقة — النتيجة أُعيد إنتاجها بنفس الأرقام والإصدارات."
              : "البصمة غير مطابقة — تغيّرت المدخلات أو إصدارات المحرك/القواعد.",
            expectedHash: recomputed,
            providedHash: claimedHash,
            data: out.payload.data,
            rules: out.payload.rules,
            certificate: out.payload.certificate,
            requestId,
          }),
          { status: 200, headers },
        );
      },
    },
  },
});
