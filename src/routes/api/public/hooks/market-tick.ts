import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Per-minute recorder: schedule a POST here every minute with the cron secret. Pages that
 * fetch fresh prices also record opportunistically, so this guarantees a row even when
 * nobody is visiting.
 */
export const Route = createFileRoute("/api/public/hooks/market-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;

        const { getLivePrices } = await import("@/lib/prices.functions");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { recordMarketTick } = await import("@/lib/market-tick.server");
        try {
          const prices = await getLivePrices();
          const result = await recordMarketTick(supabaseAdmin, prices);
          return Response.json({ ok: true, ...result, status: prices.consensus?.status ?? null });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : String(error) },
            { status: 503 },
          );
        }
      },
    },
  },
});
