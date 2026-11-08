import { createFileRoute } from "@tanstack/react-router";

import { withCronAuthorization } from "@/lib/cron-authorization.server";
import { COUNTRIES } from "@/lib/countries";
import { trackScheduledFeedRun } from "@/lib/scheduled-feed-run";

/**
 * Daily job: snapshot, official watch, follower alerts and the Facebook post. Prices belong to
 * the country-prices hook, so here they only fill countries that have no row for today yet.
 */
export const Route = createFileRoute("/api/public/hooks/jeweler-feed")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        withCronAuthorization(request, async () => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { notifyFeedAdmins, recordNisabHistory, saveJewelerFeed, scheduledRunSaver } =
            await import("@/lib/price-update.server");
          const saveRun = scheduledRunSaver(supabaseAdmin, "scheduled price update");
          return trackScheduledFeedRun(async () => {
            const today = new Date().toISOString().slice(0, 10);
            const { data: present, error: presentError } = await supabaseAdmin
              .from("nisab_history")
              .select("country")
              .eq("day", today);
            if (presentError) throw new Error("Could not read current history");
            const recorded = new Set((present ?? []).map((r) => r.country));
            const missing = new Set(COUNTRIES.map((c) => c.code).filter((c) => !recorded.has(c)));
            const { rows, alerts, errors } = missing.size
              ? await saveJewelerFeed(supabaseAdmin, today, missing)
              : { rows: [], alerts: [], errors: [] as string[] };

            // Raw daily snapshot (USD/oz, FX, source agreement). Never fails the whole job.
            const { recordPriceSnapshot } = await import("@/lib/price-snapshot.server");
            const snapshot = await recordPriceSnapshot(supabaseAdmin, today).catch((e) => ({
              recorded: false,
              reason: String(e),
              errors: [] as string[],
            }));
            if (
              "status" in snapshot &&
              (snapshot.status === "diverged" || snapshot.status === "warn")
            ) {
              errors.push(
                `مصادر الذهب والفضة متباعدة ${(snapshot.deviationPct ?? 0).toFixed(1)}% (${snapshot.status})`,
              );
            }

            await notifyFeedAdmins(supabaseAdmin, alerts, errors);

            const { watchOfficialSources } = await import("@/lib/official-watch.server");
            const official = await watchOfficialSources(supabaseAdmin);

            const history = missing.size
              ? await recordNisabHistory(supabaseAdmin, rows, today, missing)
              : { recorded: 0, source: "none", countries: [] as string[] };

            const { notifyNisabChanges, postDailyToFacebook } =
              await import("@/lib/daily-broadcast.server");
            const followers = await notifyNisabChanges(supabaseAdmin, today);
            const facebook = await postDailyToFacebook(supabaseAdmin, today).catch((e) => ({
              posted: false,
              reason: String(e),
            }));

            return Response.json({
              ok: true,
              idle: missing.size === 0,
              updated: history.countries,
              alerts,
              errors,
              official,
              history,
              snapshot,
              followers,
              facebook,
            });
          }, saveRun);
        }),
    },
  },
});
