import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";
import type { Database } from "@/integrations/supabase/types";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300",
  "Content-Type": "application/json; charset=utf-8",
};

/**
 * GET /api/public/prices/history?metal=gold|silver&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=500
 * Public read-only export of the historical metal prices for integrators.
 */
export const Route = createFileRoute("/api/public/prices/history")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const rl = await rateLimit(request, { key: "prices-history", limit: 60, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter, CORS);

        const url = new URL(request.url);
        const metal = (url.searchParams.get("metal") || "").toLowerCase();
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 500), 1), 5000);
        // resolution=tick يقرأ السجل اللحظي (كل 5 دقائق) بدل التجميعة اليومية.
        // الافتراضي daily حفاظاً على توافق المستهلكين الحاليين للواجهة.
        const resolution = (url.searchParams.get("resolution") || "daily").toLowerCase();
        if (!["daily", "tick"].includes(resolution)) {
          return new Response(
            JSON.stringify({ ok: false, error: "resolution must be daily|tick" }),
            { status: 400, headers: CORS },
          );
        }
        const dateRe = /^\d{4}-\d{2}-\d{2}$/;
        if (metal && !["gold", "silver"].includes(metal)) {
          return new Response(JSON.stringify({ ok: false, error: "metal must be gold|silver" }), {
            status: 400,
            headers: CORS,
          });
        }
        if ((from && !dateRe.test(from)) || (to && !dateRe.test(to))) {
          return new Response(JSON.stringify({ ok: false, error: "dates must be YYYY-MM-DD" }), {
            status: 400,
            headers: CORS,
          });
        }

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        // metal_price_ticks ليس ضمن الأنواع المولَّدة بعد (هجرة جديدة)
        let q: any =
          resolution === "tick"
            ? (supabase.from("metal_price_ticks" as never) as any)
                .select("observed_at, bucket_5m, metal, price_per_gram, price_per_ounce, currency, source, reliability")
                .order("observed_at", { ascending: false })
                .limit(limit)
            : supabase
                .from("metal_prices_daily")
                .select("price_date, metal, price_usd_per_gram, currency, source, reliability")
                .order("price_date", { ascending: false })
                .limit(limit);

        if (metal) q = q.eq("metal", metal);
        if (resolution === "tick") {
          // الحدود تشمل اليوم كاملاً: من بدايته إلى نهايته بتوقيت UTC
          if (from) q = q.gte("observed_at", `${from}T00:00:00.000Z`);
          if (to) q = q.lte("observed_at", `${to}T23:59:59.999Z`);
        } else {
          if (from) q = q.gte("price_date", from);
          if (to) q = q.lte("price_date", to);
        }

        const { data, error } = await q;
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: "lookup_failed" }), {
            status: 500,
            headers: CORS,
          });
        }

        return new Response(
          JSON.stringify({
            ok: true,
            resolution,
            count: data?.length ?? 0,
            gold_nisab_grams: 85,
            silver_nisab_grams: 595,
            zakat_rate: 0.025,
            data: data ?? [],
            source: "Nisab historical archive 1975→present",
            generated_at: new Date().toISOString(),
          }),
          { headers: CORS },
        );
      },
    },
  },
});
