import { createFileRoute } from "@tanstack/react-router";
import { freshness, overall, httpStatusFor, type CheckResult } from "@/lib/health/checks";
import { isPreviewOrigin, SITE_URL } from "@/lib/siteUrl";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const BOOT = Date.now();

/**
 * فحص صحة حقيقي.
 *
 * كان يعيد ok:true دائماً مع فحوص نصّية ثابتة لا تقيس شيئاً — فالمراقبة
 * تُظهر أخضر بينما خطّافات الأسعار متوقّفة منذ أيام. الآن يقيس تقادُم
 * البيانات فعلياً ويعيد 503 عند السقوط ليلتقطه المراقب دون قراءة الجسم.
 *
 * العتبات: الرصد اللحظي كل 5 دقائق → تحذير بعد 20 دقيقة (4 دورات فائتة)،
 * وسقوط بعد ساعة. التجميعة اليومية → تحذير بعد 26 ساعة، وسقوط بعد 50.
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const checks: Record<string, CheckResult> = {};

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // آخر رصد لحظي — metal_price_ticks خارج الأنواع المولَّدة بعد
          const { data: tick, error: tickErr } = await (
            supabaseAdmin.from("metal_price_ticks" as never) as any
          )
            .select("observed_at")
            .order("observed_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          checks.price_ticks = tickErr
            ? { status: "down", age_seconds: null, detail: `تعذّرت القراءة: ${tickErr.message}` }
            : freshness(tick?.observed_at, {
                degradedAfterSec: 20 * 60,
                downAfterSec: 60 * 60,
                label: "الرصد اللحظي",
              });

          // آخر تجميعة يومية
          const { data: daily, error: dailyErr } = await supabaseAdmin
            .from("metal_prices_daily")
            .select("updated_at")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          checks.daily_prices = dailyErr
            ? { status: "down", age_seconds: null, detail: `تعذّرت القراءة: ${dailyErr.message}` }
            : freshness(daily?.updated_at, {
                degradedAfterSec: 26 * 3600,
                downAfterSec: 50 * 3600,
                label: "التجميعة اليومية",
              });

          checks.database = { status: "ok", age_seconds: null, detail: "الاتصال قائم" };
        } catch (e) {
          checks.database = {
            status: "down",
            age_seconds: null,
            detail: `تعذّر الاتصال: ${(e as Error).message}`,
          };
        }

        // نطاق المعاينة ليس عطلاً لكنه ليس جاهزية إنتاج
        checks.site_origin = isPreviewOrigin()
          ? { status: "degraded", age_seconds: null, detail: "ما زال على نطاق معاينة" }
          : { status: "ok", age_seconds: null, detail: SITE_URL };

        const status = overall(Object.values(checks).map((c) => c.status));

        return new Response(
          JSON.stringify({
            ok: status !== "down",
            status,
            service: "zakat-calculator",
            version: "1.0.0",
            uptime_ms: Date.now() - BOOT,
            time: new Date().toISOString(),
            runtime: "cloudflare-workers",
            checks,
          }),
          { status: httpStatusFor(status), headers: CORS },
        );
      },
    },
  },
});
