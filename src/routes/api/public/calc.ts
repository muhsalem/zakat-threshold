import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

export const Route = createFileRoute("/api/public/calc")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers: CORS });
        }
        const b = (body ?? {}) as Record<string, unknown>;
        const assets = Number(b.assets ?? 0);
        const liabilities = Number(b.liabilities ?? 0);
        const nisab = Number(b.nisab ?? 0);
        const rate = Number(b.rate ?? 0.025);

        if (!Number.isFinite(assets) || !Number.isFinite(liabilities) || !Number.isFinite(nisab)) {
          return new Response(JSON.stringify({ ok: false, error: "invalid_numbers" }), { status: 400, headers: CORS });
        }
        const net = Math.max(0, assets - liabilities);
        const eligible = net >= nisab;
        const zakat = eligible ? +(net * rate).toFixed(2) : 0;

        return new Response(
          JSON.stringify({
            ok: true,
            input: { assets, liabilities, nisab, rate },
            net_assets: +net.toFixed(2),
            eligible,
            zakat_due: zakat,
            standard: "AAOIFI 35",
            generated_at: new Date().toISOString(),
          }),
          { headers: CORS }
        );
      },
    },
  },
});
