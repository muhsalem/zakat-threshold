import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";

/**
 * Snapshot يومي لأسعار الذهب/الفضة بالدولار → جدول nisab_prices.
 * يُستدعى من pg_cron مرة يومياً. يستخدم سلسلة المصادر البديلة، ويعلّم
 * السجل بـ reliability=direct ومصدره ضمن الحقل `source`.
 */
export const Route = createFileRoute("/api/public/hooks/snapshot-prices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = rateLimit(request, { key: "snapshot-prices", limit: 6, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter);

        // 1) اجلب الأسعار من المصدر الحيّ (مع fallback chain)
        const { getLiveMetalPrices } = await import("@/lib/metalPrices.functions");
        const res = await getLiveMetalPrices();
        if (!res.ok) {
          return new Response(JSON.stringify({ ok: false, error: res.error, tried: res.tried }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 2) خزّن في nisab_prices لليوم الحالي (UTC) — تحديث إن وُجد
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth() + 1;
        const GOLD_NISAB_GRAMS = 85;
        const SILVER_NISAB_GRAMS = 595;
        const gold_nisab_value = +(res.gold24PerGram * GOLD_NISAB_GRAMS).toFixed(2);
        const silver_nisab_value = +(res.silverPerGram * SILVER_NISAB_GRAMS).toFixed(2);

        const row = {
          year,
          month,
          country_code: "GLOBAL",
          currency: "USD",
          gold_price: +res.gold24PerGram.toFixed(4),
          silver_price: +res.silverPerGram.toFixed(4),
          gold_nisab_value,
          silver_nisab_value,
          event: "daily_snapshot",
          source: res.source,
          reliability: "direct",
          reliability_score: 5,
          updated_at: now.toISOString(),
        };

        const { error } = await supabaseAdmin
          .from("nisab_prices")
          .upsert(row, { onConflict: "year,month,country_code" });

        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ ok: true, source: res.source, gold: row.gold_price, silver: row.silver_price }),
          { headers: { "Content-Type": "application/json" } }
        );
      },
      GET: async () => new Response(JSON.stringify({ ok: true, hint: "POST to snapshot" }), {
        headers: { "Content-Type": "application/json" },
      }),
    },
  },
});
