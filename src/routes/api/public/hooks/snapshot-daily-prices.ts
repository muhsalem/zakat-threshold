import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";

/**
 * Snapshot يومي لأسعار الذهب/الفضة بالدولار/جرام إلى جدول metal_prices_daily.
 * يُستدعى من pg_cron مرة يومياً.
 */
export const Route = createFileRoute("/api/public/hooks/snapshot-daily-prices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = rateLimit(request, { key: "snapshot-daily", limit: 6, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter);

        const { getLiveMetalPrices } = await import("@/lib/metalPrices.functions");
        const res = await getLiveMetalPrices();
        if (!res.ok) {
          return new Response(JSON.stringify({ ok: false, error: res.error, tried: res.tried }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = new Date().toISOString().slice(0, 10);
        const rows = [
          {
            price_date: today,
            metal: "gold",
            price_usd_per_gram: +res.gold24PerGram.toFixed(6),
            currency: "USD",
            source: res.source,
            reliability: "direct",
            reliability_score: 5,
          },
          {
            price_date: today,
            metal: "silver",
            price_usd_per_gram: +res.silverPerGram.toFixed(6),
            currency: "USD",
            source: res.source,
            reliability: "direct",
            reliability_score: 5,
          },
        ];

        const { error } = await supabaseAdmin
          .from("metal_prices_daily")
          .upsert(rows, { onConflict: "price_date,metal,currency" });

        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ ok: true, date: today, source: res.source, rows: rows.length }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
      GET: async () =>
        new Response(JSON.stringify({ ok: true, hint: "POST to snapshot today's prices" }), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
