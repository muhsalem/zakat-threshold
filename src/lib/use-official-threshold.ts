import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PRICE_REFRESH_MS } from "./daily-nisab";

export function useOfficialThreshold(country: string, currency: string, day: string) {
  return useQuery({
    queryKey: ["calculator-official-nisab", country, currency, day],
    enabled: Boolean(day),
    staleTime: PRICE_REFRESH_MS,
    refetchInterval: PRICE_REFRESH_MS,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_nisab")
        .select("country,currency,announced_on,gold_nisab,silver_nisab,authority,source_url")
        .eq("country", country)
        .eq("currency", currency)
        .lte("announced_on", day)
        .order("announced_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error("Could not load official threshold");
      return data;
    },
  });
}
