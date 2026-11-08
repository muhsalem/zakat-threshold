import { createFileRoute } from "@tanstack/react-router";

import { withCronAuthorization } from "@/lib/cron-authorization.server";
import {
  PRICE_SLOT_GRACE_MINUTES,
  dueCountrySlots,
  pendingCountrySlots,
} from "@/lib/country-price-schedule";
import { trackScheduledFeedRun } from "@/lib/scheduled-feed-run";
import { countryPriceRequestSchema, requestedPriceCountries } from "@/lib/country-price-request";

/**
 * Managed POST every 15 minutes: UTC offsets reach quarter hours.
 * Each call refreshes only the countries that just reached 11:00 or 23:00 local time.
 */
export const Route = createFileRoute("/api/public/hooks/country-prices")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        withCronAuthorization(request, async () => {
          const input = countryPriceRequestSchema.safeParse(await request.json().catch(() => null));
          if (!input.success) return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
          const requested = requestedPriceCountries(input.data.kind);
          const idle = Response.json({ ok: true, idle: true, updated: [], errors: [] });
          const now = new Date();
          const slots = requested ? [] : dueCountrySlots(now);
          if (!requested && !slots.length) return idle;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const since = new Date(now.getTime() - (PRICE_SLOT_GRACE_MINUTES + 1) * 60_000);
          const { data: completed, error: readError } = await supabaseAdmin
            .from("country_price_updates")
            .select("country,local_date,local_hour")
            .gte("slot_at", since.toISOString());
          if (readError) {
            return Response.json({ ok: false, error: "slots_unavailable" }, { status: 503 });
          }
          const pending = pendingCountrySlots(slots, completed ?? []);
          if (!requested && !pending.length) return idle;

          const { notifyFeedAdmins, recordNisabHistory, saveJewelerFeed, scheduledRunSaver } =
            await import("@/lib/price-update.server");
          const saveRun = scheduledRunSaver(supabaseAdmin, requested ? "Egypt hourly price check" : "country price slot update");
          return trackScheduledFeedRun(async () => {
            const today = now.toISOString().slice(0, 10);
            const only = requested ?? new Set(pending.map((s) => s.country));
            const { rows, alerts, errors } = await saveJewelerFeed(supabaseAdmin, today, only);
            await notifyFeedAdmins(supabaseAdmin, alerts, errors);
            // An Egypt test must read a real local quote, not silently substitute spot.
            if (requested && !rows.some((row) => row.country === "EG")) {
              return Response.json({ ok: false, updated: [], errors: [...errors, "egypt_quote_unavailable"] }, { status: 503 });
            }
            const history = await recordNisabHistory(supabaseAdmin, rows, today, only);

            // Only recorded countries close their slot; the rest retry on the next call.
            const updated = new Set(history.countries);
            const closed = pending.filter((s) => updated.has(s.country));
            if (closed.length) {
              const { error } = await supabaseAdmin.from("country_price_updates").upsert(
                closed.map((s) => ({
                  country: s.country,
                  local_date: s.localDate,
                  local_hour: s.localHour,
                  time_zone: s.timeZone,
                  slot_at: s.slotAt,
                })),
                { onConflict: "country,local_date,local_hour", ignoreDuplicates: true },
              );
              if (error) throw new Error("Could not record price slots");
            }
            const left = pending.length - closed.length;
            if (left) errors.push(`${left} دولة لم تُحدَّث وستُعاد المحاولة`);
            return Response.json({ ok: true, updated: history.countries, alerts, errors, history });
          }, saveRun);
        }),
    },
  },
});
