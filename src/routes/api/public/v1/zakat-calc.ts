import { createFileRoute } from "@tanstack/react-router";
import { rateLimit } from "@/lib/rate-limit.server";
import { runZakatCalcV1 } from "@/lib/api/v1-zakat";
import { detail, v1ErrorResponse } from "@/lib/api/v1-errors";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json; charset=utf-8",
};

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
        const headers = { ...CORS, "X-Request-Id": requestId };

        const rl = await rateLimit(request, { key: "zakat-calc-v1", limit: 60, windowMs: 60_000 });
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

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return v1ErrorResponse("ZKT-1001", headers, { requestId });
        }

        const out = await runZakatCalcV1(body, { requestId });
        return new Response(JSON.stringify(out.payload), { status: out.status, headers });
      },
    },
  },
});
