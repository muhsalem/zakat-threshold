import { createFileRoute } from "@tanstack/react-router";
// لا node:crypto هنا: routeTree.gen.ts يستورد هذا الملف في حزمة العميل أيضاً،
// وتُجرَّد كتلة server: لكن الاستيراد يبقى ويرمي في المتصفح عند التقييم.
// Web Crypto يعمل في المتصفح وNode وWorkers معاً — انظر webhookSignature.ts.
import { verifyHmacSha256Hex } from "@/lib/erp/webhookSignature";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Signature, X-Signature-Timestamp",
  "Content-Type": "application/json; charset=utf-8",
};

/**
 * Webhook receiver for iPaaS callbacks (Zapier / Make / n8n / native ERPs).
 * يتحقق من HMAC-SHA256 (سرّ مشترك ERP_WEBHOOK_SECRET) قبل قبول أي payload.
 * لا يعيد أي PII، ويستجيب 202 عند القبول.
 */
export const Route = createFileRoute("/api/public/erp/webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const rl = await rateLimit(request, { key: "erp-webhook", limit: 60, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter);

        const secret = process.env.ERP_WEBHOOK_SECRET;
        if (!secret) {
          return Response.json(
            { ok: false, error: "webhook_not_configured" },
            { status: 503, headers: CORS },
          );
        }

        const signature = request.headers.get("x-signature") ?? "";
        const ts = request.headers.get("x-signature-timestamp") ?? "";
        const raw = await request.text();

        // منع replay attacks (نافذة 5 دقائق)
        const tsNum = Number(ts);
        if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60_000) {
          return Response.json(
            { ok: false, error: "stale_timestamp" },
            { status: 401, headers: CORS },
          );
        }

        // crypto.subtle.verify يقارن بزمن ثابت بالمواصفة؛ التوقيع المشوَّه يرجع false لا رمياً.
        if (!(await verifyHmacSha256Hex(secret, `${ts}.${raw}`, signature))) {
          return Response.json(
            { ok: false, error: "invalid_signature" },
            { status: 401, headers: CORS },
          );
        }

        let event: unknown;
        try {
          event = JSON.parse(raw);
        } catch {
          return Response.json(
            { ok: false, error: "invalid_json" },
            { status: 400, headers: CORS },
          );
        }

        // NOTE: تخزين/توجيه الحدث للمعالج المناسب (queue) يُضاف لاحقًا حسب الحاجة.
        // نكتفي هنا بتأكيد الاستلام (202) دون أي عمل يكشف بيانات حسّاسة.
        return new Response(
          JSON.stringify({
            ok: true,
            received_at: new Date().toISOString(),
            event_kind: (event as any)?.type ?? "unknown",
          }),
          {
            status: 202,
            headers: CORS,
          },
        );
      },
    },
  },
});
