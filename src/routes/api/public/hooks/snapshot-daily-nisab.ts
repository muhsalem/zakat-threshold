import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";
import { JURISDICTIONS } from "@/lib/jurisdictions";

const GOLD_NISAB_GRAMS = 85;
const SILVER_NISAB_GRAMS = 595;

type FxResult = {
  rates: Record<string, number>;
  primary_source: string;
  fallback_source: string | null;
  fallback_used: boolean;
  missing: string[];
  errors: string[];
  http_statuses: number[];
};

async function fetchAllFxFromUsd(currencies: string[]): Promise<FxResult> {
  const unique = Array.from(new Set(currencies.filter((c) => c && c !== "USD")));
  const rates: Record<string, number> = { USD: 1 };
  const errors: string[] = [];
  const httpStatuses: number[] = [];
  let fallbackUsed = false;
  let fallbackSource: string | null = null;

  if (unique.length === 0) {
    return {
      rates,
      primary_source: "frankfurter.app",
      fallback_source: null,
      fallback_used: false,
      missing: [],
      errors,
      http_statuses: httpStatuses,
    };
  }

  try {
    const url = `https://api.frankfurter.app/latest?from=USD&to=${unique.join(",")}`;
    const res = await fetch(url);
    httpStatuses.push(res.status);
    if (res.ok) {
      const j = (await res.json()) as { rates?: Record<string, number> };
      for (const c of unique) {
        const v = j.rates?.[c];
        if (v && v > 0) rates[c] = v;
      }
    } else {
      errors.push(`frankfurter HTTP ${res.status}`);
    }
  } catch (e: any) {
    errors.push(`frankfurter: ${e?.message ?? String(e)}`);
  }

  const missing = unique.filter((c) => !(c in rates));
  if (missing.length > 0) {
    fallbackUsed = true;
    fallbackSource = "open.er-api.com";
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      httpStatuses.push(res.status);
      if (res.ok) {
        const j = (await res.json()) as { rates?: Record<string, number> };
        for (const c of missing) {
          const v = j.rates?.[c];
          if (v && v > 0) rates[c] = v;
        }
      } else {
        errors.push(`open.er-api HTTP ${res.status}`);
      }
    } catch (e: any) {
      errors.push(`open.er-api: ${e?.message ?? String(e)}`);
    }
  }

  const stillMissing = unique.filter((c) => !(c in rates));
  return {
    rates,
    primary_source: "frankfurter.app",
    fallback_source: fallbackSource,
    fallback_used: fallbackUsed,
    missing: stillMissing,
    errors,
    http_statuses: httpStatuses,
  };
}

export const Route = createFileRoute("/api/public/hooks/snapshot-daily-nisab")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = rateLimit(request, { key: "snapshot-daily-nisab", limit: 6, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter);

        const startedAt = Date.now();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const logAudit = async (row: Record<string, any>) => {
          try {
            await (supabaseAdmin.from("price_fetch_audit") as any).insert({
              job_name: "snapshot-daily-nisab",
              duration_ms: Date.now() - startedAt,
              ...row,
            });
          } catch {
            /* never let audit break the job */
          }
        };

        const { getLiveMetalPrices } = await import("@/lib/metalPrices.functions");
        const metals = await getLiveMetalPrices();
        if (!metals.ok) {
          await logAudit({
            status: "error",
            primary_source: (metals as any).tried?.[0] ?? null,
            error_message: `metals: ${metals.error}`,
            metadata: { stage: "fetch_metals", tried: (metals as any).tried ?? [] },
          });
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
          const rate = fx.rates[j.currency] ?? 1;
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
            source: `${metals.source} + ${fx.primary_source}${fx.fallback_used ? ` + ${fx.fallback_source}` : ""}`,
          };
        });

        const { error } = await supabaseAdmin
          .from("nisab_daily_history")
          .upsert(rows, { onConflict: "price_date,country_code" });

        if (error) {
          await logAudit({
            status: "error",
            primary_source: `${metals.source} + ${fx.primary_source}`,
            fallback_source: fx.fallback_source,
            fallback_used: fx.fallback_used,
            currencies_requested: currencies,
            currencies_missing: fx.missing,
            records_written: 0,
            error_message: `db upsert: ${error.message}`,
            metadata: { stage: "db_upsert", fx_errors: fx.errors },
          });
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const status =
          fx.missing.length > 0 || fx.errors.length > 0 ? "partial" : "success";

        await logAudit({
          status,
          primary_source: `${metals.source} + ${fx.primary_source}`,
          fallback_source: fx.fallback_source,
          fallback_used: fx.fallback_used,
          currencies_requested: currencies,
          currencies_missing: fx.missing,
          records_written: rows.length,
          http_status: fx.http_statuses[0] ?? null,
          error_message: fx.errors.length > 0 ? fx.errors.join(" | ") : null,
          metadata: {
            date: today,
            metals_source: metals.source,
            fx_http_statuses: fx.http_statuses,
          },
        });

        await supabaseAdmin.from("sharia_audit_log").insert({
          user_id: null,
          action: "snapshot_daily_nisab",
          payload: {
            date: today,
            countries: rows.length,
            source: metals.source,
            fallback_used: fx.fallback_used,
            missing_currencies: fx.missing,
          },
        });

        return new Response(
          JSON.stringify({
            ok: true,
            date: today,
            countries: rows.length,
            source: metals.source,
            fallback_used: fx.fallback_used,
            missing_currencies: fx.missing,
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
