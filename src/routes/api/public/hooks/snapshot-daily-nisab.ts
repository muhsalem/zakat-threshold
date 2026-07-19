import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";
import { JURISDICTIONS } from "@/lib/jurisdictions";

/**
 * Snapshot يومي لنِصاب الذهب والفضة لكل الدول إلى `nisab_daily_history`.
 * - يجلب السعر العالمي للذهب/الفضة بالدولار/جرام من `getLiveMetalPrices`.
 * - يجلب أسعار صرف الدولار مقابل كل عملات الدول عبر frankfurter.app بطلب واحد.
 * - يحسب النصاب: ذهب = 85g × سعر الجرام، فضة = 595g × سعر الجرام (كلاهما بالعملة المحلية).
 * - يُدرج (upsert) صفاً واحداً لكل دولة لتاريخ اليوم.
 * يُستدعى من pg_cron مرة يومياً.
 */

const GOLD_NISAB_GRAMS = 85;
const SILVER_NISAB_GRAMS = 595;

async function fetchAllFxFromUsd(currencies: string[]): Promise<Record<string, number>> {
  const unique = Array.from(new Set(currencies.filter((c) => c && c !== "USD")));
  const rates: Record<string, number> = { USD: 1 };
  if (unique.length === 0) return rates;

  // Primary: frankfurter.app (ECB, ~30 major currencies).
  try {
    const url = `https://api.frankfurter.app/latest?from=USD&to=${unique.join(",")}`;
    const res = await fetch(url);
    if (res.ok) {
      const j = (await res.json()) as { rates?: Record<string, number> };
      for (const c of unique) {
        const v = j.rates?.[c];
        if (v && v > 0) rates[c] = v;
      }
    }
  } catch {
    /* ignore, try fallback */
  }

  // Fallback: open.er-api.com covers pegged/exotic currencies frankfurter omits
  // (SAR, AED, EGP, JOD, KWD, PKR, QAR, …). Only fill in what we're still missing.
  const missing = unique.filter((c) => !(c in rates));
  if (missing.length > 0) {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (res.ok) {
        const j = (await res.json()) as { rates?: Record<string, number> };
        for (const c of missing) {
          const v = j.rates?.[c];
          if (v && v > 0) rates[c] = v;
        }
      }
    } catch {
      /* ignore */
    }
  }

  return rates;
}

export const Route = createFileRoute("/api/public/hooks/snapshot-daily-nisab")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = rateLimit(request, { key: "snapshot-daily-nisab", limit: 6, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter);

        const { getLiveMetalPrices } = await import("@/lib/metalPrices.functions");
        const metals = await getLiveMetalPrices();
        if (!metals.ok) {
          return new Response(
            JSON.stringify({ ok: false, error: metals.error, tried: metals.tried }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }

        const jurisdictions = Object.values(JURISDICTIONS);
        const currencies = jurisdictions.map((j) => j.currency);
        const fx = await fetchAllFxFromUsd(currencies);

        const today = new Date().toISOString().slice(0, 10);
        const rows = jurisdictions.map((j) => {
          const rate = fx[j.currency] ?? 1;
          const gold = +(metals.gold24PerGram * rate).toFixed(6);
          const silver = +(metals.silverPerGram * rate).toFixed(6);
          return {
            price_date: today,
            country_code: j.code,
            currency: j.currency,
            gold_price_per_gram: gold,
            silver_price_per_gram: silver,
            gold_nisab_value: +(gold * GOLD_NISAB_GRAMS).toFixed(2),
            silver_nisab_value: +(silver * SILVER_NISAB_GRAMS).toFixed(2),
            fx_rate_usd: rate,
            source: `${metals.source} + frankfurter.app`,
          };
        });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("nisab_daily_history")
          .upsert(rows, { onConflict: "price_date,country_code" });

        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Audit: system snapshot event (user_id null → system entry).
        await supabaseAdmin.from("sharia_audit_log").insert({
          user_id: null,
          action: "snapshot_daily_nisab",
          payload: {
            date: today,
            countries: rows.length,
            source: metals.source,
          },
        });

        return new Response(
          JSON.stringify({
            ok: true,
            date: today,
            countries: rows.length,
            source: metals.source,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
      GET: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            hint: "POST to snapshot today's per-country gold & silver nisab into nisab_daily_history",
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
    },
  },
});
