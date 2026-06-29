import { createServerFn } from "@tanstack/react-start";

/**
 * أسعار الذهب والفضة اللحظية بالدولار/جرام مع سلسلة مصادر بديلة (Fallback).
 *
 * المصادر بالترتيب:
 *  1) gold-api.com  (XAU/XAG)
 *  2) metals.dev (public/free tier — يدعم XAU/XAG)
 *  3) coingecko (مؤشر مرجعي عبر pax-gold كحل أخير لتفادي الانقطاع)
 *
 * كل مصدر له timeout صغير، وننتقل تلقائياً إلى التالي عند الفشل،
 * مع إرجاع `source` و `tried` في الاستجابة من أجل الشفافية والتدقيق.
 */
const TROY_OZ_GRAMS = 31.1034768;

async function withTimeout<T>(p: Promise<T>, ms = 4500): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

type Pair = { gold24PerGram: number; silverPerGram: number };

async function fromGoldApi(): Promise<Pair> {
  const [g, s] = await Promise.all([
    withTimeout(fetch("https://api.gold-api.com/price/XAU", { headers: { accept: "application/json" } })),
    withTimeout(fetch("https://api.gold-api.com/price/XAG", { headers: { accept: "application/json" } })),
  ]);
  if (!g.ok || !s.ok) throw new Error("gold-api http " + g.status + "/" + s.status);
  const gj = (await g.json()) as { price: number };
  const sj = (await s.json()) as { price: number };
  return { gold24PerGram: gj.price / TROY_OZ_GRAMS, silverPerGram: sj.price / TROY_OZ_GRAMS };
}

async function fromMetalsDev(): Promise<Pair> {
  // واجهة عامة بدون مفتاح — نمط: https://api.metals.dev/v1/latest?api_key=... — نُسقط هذا
  // ونستخدم mirror مفتوح: metals-api.io يتطلب مفتاحاً، نعتمد بدلاً عنه على api.metalpriceapi.com sandbox.
  const r = await withTimeout(
    fetch("https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=XAU,XAG", {
      headers: { accept: "application/json" },
    })
  );
  if (!r.ok) throw new Error("metalpriceapi http " + r.status);
  const j = (await r.json()) as { rates?: { XAU?: number; XAG?: number } };
  const xau = j.rates?.XAU; // XAU is 1 USD = XAU oz (inverse)
  const xag = j.rates?.XAG;
  if (!xau || !xag) throw new Error("metalpriceapi missing rates");
  const goldOz = 1 / xau;
  const silverOz = 1 / xag;
  return { gold24PerGram: goldOz / TROY_OZ_GRAMS, silverPerGram: silverOz / TROY_OZ_GRAMS };
}

async function fromCoingecko(): Promise<Pair> {
  // PAXG = 1 oz gold (tokenized). يستخدم كحدّ أدنى لمنع انقطاع كامل.
  const r = await withTimeout(
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd", {
      headers: { accept: "application/json" },
    })
  );
  if (!r.ok) throw new Error("coingecko http " + r.status);
  const j = (await r.json()) as { "pax-gold"?: { usd?: number } };
  const goldOz = j["pax-gold"]?.usd;
  if (!goldOz) throw new Error("coingecko missing");
  // نسبة فضة/ذهب التاريخية ~ 1/80 — تقدير احتياطي فقط
  const silverOz = goldOz / 80;
  return { gold24PerGram: goldOz / TROY_OZ_GRAMS, silverPerGram: silverOz / TROY_OZ_GRAMS };
}

export const getLiveMetalPrices = createServerFn({ method: "GET" }).handler(async () => {
  const sources: Array<{ name: string; fn: () => Promise<Pair> }> = [
    { name: "gold-api.com", fn: fromGoldApi },
    { name: "metalpriceapi.com", fn: fromMetalsDev },
    { name: "coingecko-paxg", fn: fromCoingecko },
  ];
  const tried: Array<{ name: string; error: string }> = [];
  for (const s of sources) {
    try {
      const p = await s.fn();
      return {
        ok: true as const,
        currency: "USD",
        gold24PerGram: p.gold24PerGram,
        silverPerGram: p.silverPerGram,
        source: s.name,
        tried,
        updatedAt: new Date().toISOString(),
      };
    } catch (e) {
      tried.push({ name: s.name, error: (e as Error).message });
    }
  }
  return { ok: false as const, error: "all_sources_failed", tried };
});

/** معاملات تحويل عيارات الذهب من 24 → عيار آخر (نقاء = ك/24). */
export const KARAT_PURITY: Record<number, number> = {
  24: 24 / 24,
  22: 22 / 24,
  21: 21 / 24,
  18: 18 / 24,
  14: 14 / 24,
  10: 10 / 24,
};

export function goldPricePerGramByKarat(price24: number, karat: number): number {
  const f = KARAT_PURITY[karat] ?? karat / 24;
  return price24 * f;
}
