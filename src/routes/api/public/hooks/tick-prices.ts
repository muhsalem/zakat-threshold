import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";
import { cronUnauthorizedResponse, isCronAuthorized } from "@/lib/cronAuth.server";

import { bucket5m } from "@/lib/prices/bucket5m";

const TROY_OZ_GRAMS = 31.1034768;

/**
 * رصد سعري كل 5 دقائق → metal_price_ticks (إلحاقي ودائم).
 *
 * يختلف عن snapshot-prices: ذاك يكتب تجميعة nisab_prices بمفتاح
 * (year, month, country) أي صفاً واحداً لكل شهر، فلا يصلح لسجل لحظي.
 * هنا كل رصد صفّ مستقل، مع بصمة شريحة خمس دقائق تجعل إعادة تشغيل الكرون
 * تُحدِّث بدل أن تُكرِّر.
 *
 * ويحدّث أيضاً صف اليوم في metal_prices_daily بآخر قيمة، كي تعكس الشاشات
 * التي تقرأ التجميعة اليومية سعر اللحظة لا سعر منتصف الليل.
 *
 * محميّ بـCRON_SECRET كبقية الخطّافات.
 */
export const Route = createFileRoute("/api/public/hooks/tick-prices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isCronAuthorized(request)) return cronUnauthorizedResponse();
        // 12 نداءً بالدقيقة تكفي لكل 5 دقائق مع هامش لإعادة المحاولة
        const rl = await rateLimit(request, { key: "tick-prices", limit: 12, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter);

        const startedAt = Date.now();
        const { getLiveMetalPrices } = await import("@/lib/metalPrices.functions");
        const res = await getLiveMetalPrices();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (!res.ok) {
          await supabaseAdmin.from("price_fetch_audit").insert({
            job_name: "metal-price-tick",
            status: "error",
            error_message: res.error,
            duration_ms: Date.now() - startedAt,
            metadata: { tried: res.tried },
          });
          return new Response(JSON.stringify({ ok: false, error: res.error, tried: res.tried }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }

        const now = new Date();
        const bucket = bucket5m(now);
        const priceDate = now.toISOString().slice(0, 10);

        const ticks = [
          { metal: "gold", perGram: res.gold24PerGram },
          { metal: "silver", perGram: res.silverPerGram },
        ].map((m) => ({
          observed_at: now.toISOString(),
          bucket_5m: bucket,
          metal: m.metal,
          currency: "USD",
          price_per_gram: +m.perGram.toFixed(8),
          price_per_ounce: +(m.perGram * TROY_OZ_GRAMS).toFixed(6),
          source: res.source,
          reliability: "direct",
          reliability_score: 5,
          fetch_meta: { tried: res.tried ?? [] },
        }));

        // metal_price_ticks ليس ضمن الأنواع المولَّدة بعد (هجرته جديدة) —
        // نفس نمط product_events في analyticsQueries.functions.ts. يُزال
        // الـcast عند إعادة توليد أنواع Supabase.
        const { error: tickErr } = await (supabaseAdmin.from("metal_price_ticks" as never) as any)
          .upsert(ticks, { onConflict: "bucket_5m,metal,currency" });

        if (tickErr) {
          await supabaseAdmin.from("price_fetch_audit").insert({
            job_name: "metal-price-tick",
            status: "error",
            primary_source: res.source,
            error_message: tickErr.message,
            duration_ms: Date.now() - startedAt,
          });
          return new Response(JSON.stringify({ ok: false, error: tickErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        // تجميعة اليوم: آخر قيمة مرصودة تمثّل «حتى اللحظة»
        const { error: dailyErr } = await supabaseAdmin.from("metal_prices_daily").upsert(
          ticks.map((t) => ({
            price_date: priceDate,
            metal: t.metal,
            currency: "USD",
            price_usd_per_gram: t.price_per_gram,
            source: t.source,
            reliability: "direct",
            reliability_score: 5,
            updated_at: now.toISOString(),
          })),
          { onConflict: "price_date,metal,currency" },
        );

        await supabaseAdmin.from("price_fetch_audit").insert({
          job_name: "metal-price-tick",
          status: dailyErr ? "partial" : "success",
          primary_source: res.source,
          currencies_requested: ["USD"],
          records_written: ticks.length,
          duration_ms: Date.now() - startedAt,
          error_message: dailyErr?.message ?? null,
          metadata: { bucket_5m: bucket },
        });

        return new Response(
          JSON.stringify({
            ok: true,
            bucket_5m: bucket,
            source: res.source,
            gold_per_gram: ticks[0].price_per_gram,
            silver_per_gram: ticks[1].price_per_gram,
            daily_rollup: dailyErr ? `failed: ${dailyErr.message}` : "updated",
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
      GET: async () =>
        new Response(
          JSON.stringify({ ok: true, hint: "POST مع ترويسة X-Cron-Secret لتسجيل رصد سعري" }),
          { headers: { "Content-Type": "application/json" } },
        ),
    },
  },
});
