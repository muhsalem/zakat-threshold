import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";
import { runZakatCalcV1 } from "@/lib/api/v1-zakat";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

/**
 * إعادة إنتاج نتيجة سابقة والتحقق من بصمتها.
 * body = { input: <نفس مدخلات zakat-calc>, contentHash: "..." , issuedAt?: ISO }
 */
export const Route = createFileRoute("/api/public/v1/verify")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const rl = await rateLimit(request, { key: "verify-v1", limit: 60, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter, CORS);

        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response(
            JSON.stringify({
              apiVersion: "v1",
              status: "error",
              code: 400,
              error: "invalid_json_payload",
            }),
            { status: 400, headers: CORS },
          );
        }

        const claimedHash = typeof body?.contentHash === "string" ? body.contentHash : "";
        if (!/^[0-9a-f]{64}$/.test(claimedHash)) {
          return new Response(
            JSON.stringify({
              apiVersion: "v1",
              status: "error",
              code: 422,
              error: "validation_failed",
              errors: [{ field: "contentHash", message: "expected a 64-char sha256 hex digest" }],
            }),
            { status: 422, headers: CORS },
          );
        }

        const out = await runZakatCalcV1(body?.input, {
          issuedAt: typeof body?.issuedAt === "string" ? body.issuedAt : undefined,
        });
        if (!out.ok) {
          return new Response(JSON.stringify(out.payload), { status: out.status, headers: CORS });
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
          }),
          { status: 200, headers: CORS },
        );
      },
    },
  },
});
