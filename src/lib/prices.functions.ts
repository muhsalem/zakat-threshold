import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import {
  NISAB_PRICES_COLUMNS,
  NISAB_PRICES_LIVE_EVENT,
  NISAB_PRICES_ORDER_COLUMN,
  toPublicNisab,
} from "@/lib/nisabPrices";

const currencySchema = z.object({
  // ISO 4217 حرفياً 3 أحرف — كانت تصل بلا أي تحقق شكل/طول وتُدرَج مباشرة
  // بعنوان URL خارجي (frankfurter.app)، فيقدر أي مستدعٍ يُرسل قيمة حرة.
  currency: z
    .string()
    .regex(/^[A-Za-z]{3}$/, "currency must be a 3-letter ISO code")
    .optional()
    .transform((v) => (v ?? "USD").toUpperCase()),
});

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

// أخير: قيمة محفوظة في قاعدة البيانات (آخر nisab_prices).
// اللقطات تُحفظ بالدولار، فتُرجع بالدولار ويحوّلها المستدعي بسعر الصرف.
// كان الترتيب بعمود recorded_at غير الموجود فيسقط الاستعلام بصمت، وكانت
// القيمة الدولارية تُعرض كأنها بالعملة المطلوبة.
async function fetchDbFallback(): Promise<{
  goldUsdPerGram: number;
  silverUsdPerGram: number;
  recordedAt: string;
} | null> {
  try {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await sb
      .from("nisab_prices")
      .select(NISAB_PRICES_COLUMNS)
      .eq("currency", "USD")
      .eq("event", NISAB_PRICES_LIVE_EVENT)
      .order(NISAB_PRICES_ORDER_COLUMN, { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const latest = toPublicNisab(data);
    if (!latest) return null;
    return {
      goldUsdPerGram: latest.gold_price_per_gram,
      silverUsdPerGram: latest.silver_price_per_gram,
      recordedAt: latest.recorded_at,
    };
  } catch {
    return null;
  }
}

export const getLivePrices = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => currencySchema.parse(data ?? {}))
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
    // لعملة غير الدولار بلا سعر صرف لا نعرض الرقم الدولاري كأنه بعملتها
    const db = currency === "USD" || fxSource !== "fixed" ? await fetchDbFallback() : null;
    if (db) {
      return {
        currency,
        goldPerGram: db.goldUsdPerGram * fxRate,
        silverPerGram: db.silverUsdPerGram * fxRate,
        goldUsdPerOunce: db.goldUsdPerGram * OUNCE_TO_GRAM,
        silverUsdPerOunce: db.silverUsdPerGram * OUNCE_TO_GRAM,
        fxRate,
        fetchedAt: db.recordedAt,
        source: "cached:nisab_prices",
        fallback: true,
      };
    }

    throw new Error("جميع مزودي الأسعار غير متاحين حالياً، حاول مرة أخرى لاحقاً");
  });
