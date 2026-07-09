import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const OUNCE_TO_GRAM = 31.1034768;

export type LivePrices = {
  currency: string;
  goldPerGram: number;
  silverPerGram: number;
  goldUsdPerOunce: number;
  silverUsdPerOunce: number;
  fxRate: number;
  fetchedAt: string;
  source: string;
  fallback?: boolean;
};

async function fetchGoldApi(): Promise<{ gold: number; silver: number } | null> {
  try {
    const [g, s] = await Promise.all([
      fetch("https://api.gold-api.com/price/XAU", { headers: { accept: "application/json" } }),
      fetch("https://api.gold-api.com/price/XAG", { headers: { accept: "application/json" } }),
    ]);
    if (!g.ok || !s.ok) return null;
    const gj = (await g.json()) as { price: number };
    const sj = (await s.json()) as { price: number };
    return { gold: Number(gj.price), silver: Number(sj.price) };
  } catch {
    return null;
  }
}

// Fallback: coingecko — PAXG = 1 oz gold (لا يتطلب مفتاحاً)
async function fetchMetalsLive(): Promise<{ gold: number; silver: number } | null> {
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd",
      { headers: { accept: "application/json" } },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { "pax-gold"?: { usd?: number } };
    const goldOz = j["pax-gold"]?.usd;
    if (!goldOz) return null;
    return { gold: goldOz, silver: goldOz / 80 }; // نسبة فضة/ذهب تقريبية ~1:80
  } catch {
    return null;
  }
}

// أخير: قيمة محفوظة في قاعدة البيانات (آخر nisab_prices)
async function fetchDbFallback(
  currency: string,
): Promise<{ goldPerGram: number; silverPerGram: number } | null> {
  try {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await sb
      .from("nisab_prices")
      .select("gold_price, silver_price")
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      goldPerGram: Number(data.gold_price),
      silverPerGram: Number(data.silver_price),
    };
  } catch {
    return null;
  }
}

export const getLivePrices = createServerFn({ method: "GET" })
  .inputValidator((data: { currency?: string }) => ({
    currency: (data?.currency ?? "USD").toUpperCase(),
  }))
  .handler(async ({ data }): Promise<LivePrices> => {
    const currency = data.currency;

    // 1) محاولة المزود الأساسي ثم البديل
    let metals = await fetchGoldApi();
    let source = "gold-api.com";
    if (!metals) {
      metals = await fetchMetalsLive();
      source = "metalpriceapi.com";
    }

    // 2) تحويل العملة عبر frankfurter.app (مجاني، بدون مفتاح، موثوق)
    let fxRate = 1;
    let fxSource = "fixed";
    if (currency !== "USD") {
      try {
        const fxRes = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${currency}`);
        if (fxRes.ok) {
          const fxJson = (await fxRes.json()) as { rates?: Record<string, number> };
          const r = fxJson.rates?.[currency];
          if (r && r > 0) {
            fxRate = r;
            fxSource = "frankfurter.app";
          }
        }
      } catch {
        /* keep fxRate=1 */
      }
    }

    if (metals) {
      const goldPerGram = (metals.gold / OUNCE_TO_GRAM) * fxRate;
      const silverPerGram = (metals.silver / OUNCE_TO_GRAM) * fxRate;
      return {
        currency,
        goldPerGram,
        silverPerGram,
        goldUsdPerOunce: metals.gold,
        silverUsdPerOunce: metals.silver,
        fxRate,
        fetchedAt: new Date().toISOString(),
        source: `${source} + ${fxSource}`,
      };
    }

    // 3) خط دفاع أخير: آخر قيمة محفوظة في قاعدة البيانات
    const db = await fetchDbFallback(currency);
    if (db) {
      return {
        currency,
        goldPerGram: db.goldPerGram,
        silverPerGram: db.silverPerGram,
        goldUsdPerOunce: (db.goldPerGram / fxRate) * OUNCE_TO_GRAM,
        silverUsdPerOunce: (db.silverPerGram / fxRate) * OUNCE_TO_GRAM,
        fxRate,
        fetchedAt: new Date().toISOString(),
        source: "cached:nisab_prices",
        fallback: true,
      };
    }

    throw new Error("جميع مزودي الأسعار غير متاحين حالياً، حاول مرة أخرى لاحقاً");
  });
