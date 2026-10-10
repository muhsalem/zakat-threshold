import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { PRICE_REFRESH_MS } from "./daily-nisab";

/** A local jeweller quote is considered current for 72 hours after approval. */
export const LOCAL_QUOTE_MAX_AGE_MS = 72 * 60 * 60 * 1000;

export type LocalQuote = {
  goldGram: number | null;
  silverGram: number | null;
  buybackGram: number | null;
  silverBuybackGram?: number | null;
  city: string;
  source: string;
  at: string;
  count: number;
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  const middle = s[m];
  if (middle == null) return null;
  return s.length % 2 ? middle : ((s[m - 1] ?? middle) + middle) / 2;
}

/**
 * Approved local jeweller quotes for a country (median of the last 72h),
 * or null when no current local quote exists.
 */
export function useLocalQuote(country: string, currency: string) {
  const client = useQueryClient();
  useEffect(() => {
    const refresh = () => { void client.invalidateQueries({ queryKey: ["local-quote", country, currency] }); };
    const channel = supabase.channel(`nisab-quotes-${country}-${currency}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jeweler_feed", filter: `country=eq.${country}` }, refresh)
      .subscribe();
    window.addEventListener("online", refresh);
    return () => { void supabase.removeChannel(channel); window.removeEventListener("online", refresh); };
  }, [client, country, currency]);
  return useQuery<LocalQuote | null>({
    queryKey: ["local-quote", country, currency],
    enabled: Boolean(country && currency),
    staleTime: PRICE_REFRESH_MS,
    refetchInterval: PRICE_REFRESH_MS,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const since = new Date(Date.now() - LOCAL_QUOTE_MAX_AGE_MS).toISOString();
      const { data: feed, error: feedError } = await supabase
        .from("jeweler_feed")
        .select("gold_gram, silver_gram, buyback_gram, silver_buyback_gram, source, fetched_at")
        .eq("country", country)
        .eq("currency", currency)
        .gte("fetched_at", since)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (feed?.gold_gram || feed?.silver_gram) {
        const n = (v: unknown) => (v == null ? null : Number(v));
        return {
          goldGram: n(feed.gold_gram),
          silverGram: n(feed.silver_gram),
          buybackGram: n(feed.buyback_gram),
          silverBuybackGram: n(feed.silver_buyback_gram),
          city: "",
          source: feed.source,
          at: feed.fetched_at,
          count: 1,
        };
      }
      const { data, error } = await supabase
        .from("public_price_quotes")
        .select("gold_gram, silver_gram, buyback_gram, city, source, reviewed_at, created_at")
        .eq("country", country)
        .eq("currency", currency)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      if (feedError) throw feedError;
      if (!data?.length) return null;
      const nums = (k: "gold_gram" | "silver_gram" | "buyback_gram") =>
        data.map((r) => r[k]).filter((v): v is number => typeof v === "number" && v > 0);
      const latest = data[0];
      if (!latest) return null;
      return {
        goldGram: median(nums("gold_gram")),
        silverGram: median(nums("silver_gram")),
        buybackGram: median(nums("buyback_gram")),
        city: latest.city ?? "",
        source: latest.source ?? "",
        at: latest.reviewed_at ?? latest.created_at ?? "",
        count: data.length,
      };
    },
  });
}
