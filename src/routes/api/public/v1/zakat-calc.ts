import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";
import { runZakatCalcV1 } from "@/lib/api/v1-zakat";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json; charset=utf-8",
};

export const Route = createFileRoute("/api/public/v1/zakat-calc")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const rl = await rateLimit(request, { key: "zakat-calc-v1", limit: 60, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter, CORS);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(
            JSON.stringify({
              apiVersion: "v1",
              status: "error",
              code: 400,
              error: "invalid_json_payload",
              message: "Invalid JSON format provided.",
            }),
            { status: 400, headers: CORS },
          );
        }

        const out = await runZakatCalcV1(body);
        return new Response(JSON.stringify(out.payload), { status: out.status, headers: CORS });
      },
    },
  },
});
