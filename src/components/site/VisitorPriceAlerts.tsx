import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { createPriceUpdateTracker, type PublicPriceRow } from "@/lib/visitor-price-updates";

/** One public subscription per table, shared across all visitor pages. */
export function VisitorPriceAlerts() {
  const { country, lang } = useI18n();
  const client = useQueryClient();
  const navigate = useNavigate();
  useEffect(() => {
    const tracker = createPriceUpdateTracker(country);
    let disposed = false;
    let ready = false;
    const pending: { table: string; row: PublicPriceRow }[] = [];
    const receive = (table: string, row: PublicPriceRow) => {
      if (disposed) return;
      if (!ready) {
        pending.push({ table, row });
        return;
      }
      if (!tracker.accept(table, row)) return;
      void client.invalidateQueries({ queryKey: ["local-quote", country] });
      toast.info(lang === "ar" ? "تحديث أسعار الصاغة" : "Jeweller prices updated", {
        id: `jeweler-update-${country}`,
        description:
          lang === "ar"
            ? "تغيّرت الأسعار المعتمدة لبلدك."
            : "Approved prices for your country have changed.",
        duration: 15000,
        action: {
          label: lang === "ar" ? "تتبع أسعار اليوم" : "Today's prices",
          onClick: () => {
            void navigate({ to: "/today" });
          },
        },
      });
    };
    const channel = supabase.channel(`visitor-prices-${country}-${crypto.randomUUID()}`);
    for (const table of ["jeweler_feed", "public_price_quotes"] as const) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `country=eq.${country}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            void client.invalidateQueries({ queryKey: ["local-quote", country] });
            return;
          }
          receive(table, payload.new as PublicPriceRow);
        },
      );
    }
    channel.subscribe();
    void Promise.all([
      supabase
        .from("jeweler_feed")
        .select("id,country,currency,gold_gram,silver_gram,buyback_gram,silver_buyback_gram")
        .eq("country", country),
      supabase
        .from("public_price_quotes")
        .select("id,country,currency,gold_gram,silver_gram,buyback_gram")
        .eq("country", country)
        .order("created_at", { ascending: false })
        .limit(100),
    ]).then(([feed, quotes]) => {
      if (disposed) return;
      tracker.seed("jeweler_feed", feed.data ?? []);
      tracker.seed("public_price_quotes", quotes.data ?? []);
      ready = true;
      for (const event of pending) receive(event.table, event.row);
    });
    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
      toast.dismiss(`jeweler-update-${country}`);
    };
  }, [country, lang, client, navigate]);
  return null;
}
