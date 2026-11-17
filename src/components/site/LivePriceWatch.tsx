import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PRICE_REFRESH_MS } from "@/lib/daily-nisab";
import { priceUpdateKeys, watchUtcDay, type PriceTable } from "@/lib/price-watch";

/** One public subscription for the whole app; no price writes or source fetch scheduling. */
export function LivePriceWatch() {
  const client = useQueryClient();
  useEffect(() => {
    const refresh = (keys: string[]) => {
      for (const key of keys) void client.invalidateQueries({ queryKey: [key] });
    };
    const refreshAll = () =>
      refresh([
        "live-prices",
        "local-quote",
        "official-nisab",
        "calculator-official-nisab",
        "previous-day-nisab",
      ]);
    const clock = watchUtcDay({
      now: () => new Date(),
      schedule: (callback, delay) => {
        const timer = window.setTimeout(callback, delay);
        return () => window.clearTimeout(timer);
      },
      refresh: refreshAll,
    });
    let channel = supabase.channel(`nisab-live-${crypto.randomUUID()}`);
    for (const table of ["jeweler_feed", "public_price_quotes", "official_nisab"] as PriceTable[]) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        clock.check();
        refresh(priceUpdateKeys(table));
      });
    }
    channel.subscribe((status) => {
      // Re-read after every successful connection, including reconnections with missed events.
      if (status === "SUBSCRIBED") {
        clock.check();
        refreshAll();
      }
    });
    const resume = () => {
      if (document.visibilityState === "hidden") return;
      clock.check();
      refreshAll();
    };
    // Official announcements also recover when realtime is temporarily unavailable.
    const fallback = window.setInterval(() => {
      clock.check();
      refresh(["official-nisab", "calculator-official-nisab"]);
    }, PRICE_REFRESH_MS);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      clock.stop();
      window.clearInterval(fallback);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
      void supabase.removeChannel(channel);
    };
  }, [client]);
  return null;
}
