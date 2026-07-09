import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";
import {
  buildNormalizedJournal,
  renderJournal,
  SUPPORTED_ERP_FORMATS,
  type ErpFormat,
  type ZakatCalcInput,
} from "@/lib/erp/journal";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function pickFormat(url: URL): ErpFormat {
  const raw = (url.searchParams.get("format") ?? "generic").toLowerCase() as ErpFormat;
  return (SUPPORTED_ERP_FORMATS as string[]).includes(raw) ? raw : "generic";
}

export const Route = createFileRoute("/api/public/erp/journal")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      // GET → مثال جاهز (sandbox) للاختبار السريع من Postman / Swagger
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const format = pickFormat(url);
        if (format === "generic" && url.searchParams.get("list") === "1") {
          return Response.json({ supported: SUPPORTED_ERP_FORMATS }, { headers: CORS });
        }
        const sample: ZakatCalcInput = {
          entity_name: "Sample Halal Co.",
          reference: `SAMPLE-${new Date().toISOString().slice(0, 10)}`,
          currency: "SAR",
          zakat_due: 10000,
          base_amount: 400000,
          rate: 0.025,
          period_start: new Date(Date.now() - 354 * 86400_000).toISOString().slice(0, 10),
          period_end: new Date().toISOString().slice(0, 10),
          jurisdiction: "SA",
          fatwa_authority: "AAOIFI-35",
        };
        const j = buildNormalizedJournal(sample);
        const out = renderJournal(j, format);
        return new Response(out.body, {
          status: 200,
          headers: {
            ...CORS,
            "Content-Type": out.contentType,
            "X-Sample": "true",
          },
        });
      },

      POST: async ({ request }) => {
        const rl = rateLimit(request, { key: "erp-journal", limit: 30, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter);

        let payload: ZakatCalcInput;
        try {
          payload = (await request.json()) as ZakatCalcInput;
        } catch {
          return Response.json(
            { ok: false, error: "invalid_json" },
            { status: 400, headers: CORS },
          );
        }

        const required = [
          "entity_name",
          "currency",
          "zakat_due",
          "period_start",
          "period_end",
        ] as const;
        for (const k of required) {
          if (payload[k] === undefined || payload[k] === null || payload[k] === "") {
            return Response.json(
              { ok: false, error: `missing_field:${k}` },
              { status: 422, headers: CORS },
            );
          }
        }
        if (typeof payload.zakat_due !== "number" || !(payload.zakat_due > 0)) {
          return Response.json(
            { ok: false, error: "zakat_due_must_be_positive_number" },
            { status: 422, headers: CORS },
          );
        }

        const url = new URL(request.url);
        const format = pickFormat(url);
        try {
          const j = buildNormalizedJournal(payload);
          const out = renderJournal(j, format);
          const asDownload = url.searchParams.get("download") === "1";
          const headers: Record<string, string> = {
            ...CORS,
            "Content-Type": out.contentType,
            "X-Journal-Id": j.id,
            "X-Format": format,
          };
          if (asDownload) {
            headers["Content-Disposition"] =
              `attachment; filename="${j.reference}.${out.filenameSuffix}"`;
          }
          return new Response(out.body, { status: 200, headers });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : "build_failed" },
            { status: 500, headers: CORS },
          );
        }
      },
    },
  },
});
