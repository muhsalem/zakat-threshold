import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";

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
        const rl = await rateLimit(request, { key: "calc", limit: 30, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter, CORS);
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
            status: 400,
            headers: CORS,
          });
        }
        const b = (body ?? {}) as Record<string, unknown>;
        const assets = Number(b.assets ?? 0);
        const liabilities = Number(b.liabilities ?? 0);
        const nisab = Number(b.nisab ?? 0);
        const calendar =
          String(b.calendar ?? "hijri").toLowerCase() === "gregorian" ? "gregorian" : "hijri";
        // الندوة السابعة لقضايا الزكاة: يُزاد المعدّل عند احتساب الحول ميلادياً
        const defaultRate = calendar === "gregorian" ? 0.02577 : 0.025;
        const rate =
          Number.isFinite(Number(b.rate)) && Number(b.rate) > 0 ? Number(b.rate) : defaultRate;

        if (!Number.isFinite(assets) || !Number.isFinite(liabilities) || !Number.isFinite(nisab)) {
          return new Response(JSON.stringify({ ok: false, error: "invalid_numbers" }), {
            status: 400,
            headers: CORS,
          });
        }
        const net = Math.max(0, assets - liabilities);
        const eligible = net >= nisab;
        const zakat = eligible ? +(net * rate).toFixed(2) : 0;

        return new Response(
          JSON.stringify({
            ok: true,
            input: { assets, liabilities, nisab, rate, calendar },
            net_assets: +net.toFixed(2),
            eligible,
            zakat_due: zakat,
            standard: "AAOIFI 35",
            note:
              calendar === "gregorian"
                ? "تم تطبيق معدّل 2.577% لاحتساب الحول بالتقويم الميلادي وفق توصية الندوة السابعة لقضايا الزكاة."
                : "تم تطبيق معدّل 2.5% للحول الهجري القمري (354 يوم).",
            generated_at: new Date().toISOString(),
          }),
          { headers: CORS },
        );
      },
    },
  },
});
