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
  } catch { return null; }
}

// Fallback: metals.dev free echo endpoint (no key, best-effort)
async function fetchMetalsLive(): Promise<{ gold: number; silver: number } | null> {
  try {
    const r = await fetch("https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=XAU,XAG");
    if (!r.ok) return null;
    const j = (await r.json()) as { rates?: { XAU?: number; XAG?: number } };
    const xau = j.rates?.XAU, xag = j.rates?.XAG;
    if (!xau || !xag) return null;
    // rates are units-per-USD; invert to USD per oz
    return { gold: 1 / xau, silver: 1 / xag };
  } catch { return null; }
}

// أخير: قيمة محفوظة في قاعدة البيانات (آخر nisab_prices)
async function fetchDbFallback(currency: string): Promise<{ goldPerGram: number; silverPerGram: number } | null> {
  try {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } }
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
  } catch { return null; }
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
    if (!metals) { metals = await fetchMetalsLive(); source = "metalpriceapi.com"; }

    // 2) تحويل العملة
    let fxRate = 1;
    if (currency !== "USD") {
      try {
        const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
        if (fxRes.ok) {
          const fxJson = (await fxRes.json()) as { rates?: Record<string, number> };
          fxRate = Number(fxJson.rates?.[currency] ?? 1) || 1;
        }
      } catch { /* keep fxRate=1 */ }
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
        source: `${source} + open.er-api.com`,
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
