import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";
import type { Database } from "@/integrations/supabase/types";
import {
  GOLD_NISAB_GRAMS,
  NISAB_PRICES_COLUMNS,
  NISAB_PRICES_LIVE_EVENT,
  NISAB_PRICES_ORDER_COLUMN,
  SILVER_NISAB_GRAMS,
  toPublicNisab,
} from "@/lib/nisabPrices";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300",
  "Content-Type": "application/json; charset=utf-8",
};

export const Route = createFileRoute("/api/public/nisab")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const rl = await rateLimit(request, { key: "nisab", limit: 60, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter, CORS);
        const url = new URL(request.url);
        const currency = (url.searchParams.get("currency") || "USD").toUpperCase().slice(0, 6);

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const { data, error } = await supabase
          .from("nisab_prices")
          .select(NISAB_PRICES_COLUMNS)
          .eq("currency", currency)
          .eq("event", NISAB_PRICES_LIVE_EVENT)
          .order(NISAB_PRICES_ORDER_COLUMN, { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          return new Response(JSON.stringify({ ok: false, error: "lookup_failed" }), {
            status: 500,
            headers: CORS,
          });
        }

        return new Response(
          JSON.stringify({
            ok: true,
            currency,
            zakat_rate: 0.025,
            gold_grams: GOLD_NISAB_GRAMS,
            silver_grams: SILVER_NISAB_GRAMS,
            latest: toPublicNisab(data),
            source: "AAOIFI 35 / Bayt al-Zakat",
            generated_at: new Date().toISOString(),
          }),
          { headers: CORS },
        );
      },
    },
  },
});
