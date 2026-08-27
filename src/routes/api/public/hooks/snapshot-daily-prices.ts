import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";
import { cronUnauthorizedResponse, isCronAuthorized } from "@/lib/cronAuth.server";

/**
 * Snapshot يومي لأسعار الذهب/الفضة بالدولار/جرام إلى جدول metal_prices_daily.
 * يُستدعى من pg_cron مرة يومياً. محميّة بـCRON_SECRET — كانت مكشوفة بصلاحية
 * service-role بلا حماية.
 */
export const Route = createFileRoute("/api/public/hooks/snapshot-daily-prices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isCronAuthorized(request)) return cronUnauthorizedResponse();
        const rl = await rateLimit(request, { key: "snapshot-daily", limit: 6, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter);

        const startedAt = Date.now();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const logAudit = async (row: Record<string, any>) => {
          try {
            await (supabaseAdmin.from("price_fetch_audit") as any).insert({
              job_name: "snapshot-daily-prices",
              duration_ms: Date.now() - startedAt,
              ...row,
            });
          } catch {
            /* never let audit break the job */
          }
        };

        const { getLiveMetalPrices } = await import("@/lib/metalPrices.functions");
        const res = await getLiveMetalPrices();
        if (!res.ok) {
          await logAudit({
            status: "error",
            primary_source: (res as any).tried?.[0] ?? null,
            error_message: res.error,
            metadata: { stage: "fetch_metals", tried: (res as any).tried ?? [] },
          });
          return new Response(JSON.stringify({ ok: false, error: res.error, tried: res.tried }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }

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
          await logAudit({
            status: "error",
            primary_source: res.source,
            records_written: 0,
            error_message: `db upsert: ${error.message}`,
            metadata: { stage: "db_upsert" },
          });
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        await logAudit({
          status: "success",
          primary_source: res.source,
          records_written: rows.length,
          metadata: { date: today },
        });

        // نتيجة كتابة سجلّ التدقيق كانت مُهمَلة كلياً: فشلها يترك فجوة
        // صامتة في سجلٍّ وُجد ليُثبت ما جرى. لا نُسقط العملية الأصلية
        // بسببه — الرصد نجح — لكن يجب أن يظهر في السجل.
        const { error: auditErr } = await supabaseAdmin.from("sharia_audit_log").insert({
          user_id: null,
          action: "snapshot_daily_prices",
          payload: { date: today, source: res.source, rows: rows.length },
        });
        if (auditErr) console.error("audit log write failed (sharia_audit_log):", auditErr);

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
