import type { SupabaseClient } from "@supabase/supabase-js";

import type { LivePrices } from "./prices.functions";
import { minuteStart } from "./nisab-at";

export type TickResult = { recorded: boolean; reason?: string };

/**
 * Writes the current market price as the row for its UTC minute. The primary key is the
 * minute, so concurrent servers and repeated calls record each minute exactly once.
 * Returns instead of throwing when the table has not been migrated, so price serving never
 * depends on history storage.
 */
export async function recordMarketTick(
  db: SupabaseClient,
  prices: LivePrices,
  now = new Date(),
): Promise<TickResult> {
  const { goldUsdOz, silverUsdOz } = prices;
  if (!(goldUsdOz > 0) || !(silverUsdOz > 0)) return { recorded: false, reason: "invalid price" };
  const { error } = await db.from("market_ticks").insert({
    ts: minuteStart(now),
    gold_usd_oz: goldUsdOz,
    silver_usd_oz: silverUsdOz,
    source: prices.metalsSource,
    status: prices.consensus?.status ?? "single",
    deviation_pct: prices.consensus?.deviationPct ?? 0,
    quality: prices.metals.quality,
  });
  if (!error) return { recorded: true };
  if (error.code === "23505") return { recorded: false, reason: "minute already recorded" };
  if (error.code === "42P01" || error.code === "PGRST205") {
    return { recorded: false, reason: "market_ticks table not migrated yet" };
  }
  return { recorded: false, reason: error.message };
}

let lastMinute = "";
let pausedUntil = 0;
let snapshotDay = "";

/**
 * Called after each fresh price fetch. Records at most one tick per minute per server and
 * the day's raw snapshot once per day. Never throws and never delays a response by more
 * than a few seconds.
 */
export async function recordTickOpportunistically(prices: LivePrices): Promise<void> {
  try {
    if (!process.env["SUPABASE_SERVICE_ROLE_KEY"] || Date.now() < pausedUntil) return;
    const now = new Date();
    const minute = minuteStart(now);
    if (minute === lastMinute) return;
    lastMinute = minute;

    const work = (async () => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const result = await recordMarketTick(supabaseAdmin, prices, now);
      if (result.reason?.includes("not migrated") || result.reason?.includes("JWT")) {
        pausedUntil = Date.now() + 10 * 60_000; // do not hammer a missing table
      }
      const day = minute.slice(0, 10);
      if (snapshotDay !== day) {
        snapshotDay = day;
        const { recordPriceSnapshot } = await import("./price-snapshot.server");
        await recordPriceSnapshot(supabaseAdmin, day).catch(() => undefined);
      }
    })();
    await Promise.race([work, new Promise((resolve) => setTimeout(resolve, 4_000))]);
  } catch {
    pausedUntil = Date.now() + 5 * 60_000;
  }
}
