import { createServerFn } from "@tanstack/react-start";

const OUNCE_TO_GRAM = 31.1034768;

export type LivePrices = {
  currency: string;
  goldPerGram: number;
  silverPerGram: number;
  goldUsdPerOunce: number;
  silverUsdPerOunce: number;
  fxRate: number; // USD -> currency
  fetchedAt: string;
  source: string;
};

export const getLivePrices = createServerFn({ method: "GET" })
  .inputValidator((data: { currency?: string }) => ({
    currency: (data?.currency ?? "USD").toUpperCase(),
  }))
  .handler(async ({ data }): Promise<LivePrices> => {
    const currency = data.currency;

    // 1) Live spot prices (USD per troy ounce) — free, no key required
    const [goldRes, silverRes] = await Promise.all([
      fetch("https://api.gold-api.com/price/XAU", { headers: { accept: "application/json" } }),
      fetch("https://api.gold-api.com/price/XAG", { headers: { accept: "application/json" } }),
    ]);
    if (!goldRes.ok || !silverRes.ok) {
      throw new Error(`Price provider error: gold ${goldRes.status} / silver ${silverRes.status}`);
    }
    const goldJson = (await goldRes.json()) as { price: number };
    const silverJson = (await silverRes.json()) as { price: number };
    const goldUsdPerOunce = Number(goldJson.price);
    const silverUsdPerOunce = Number(silverJson.price);

    // 2) FX conversion when needed (open.er-api.com — free, no key)
    let fxRate = 1;
    if (currency !== "USD") {
      const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
      if (fxRes.ok) {
        const fxJson = (await fxRes.json()) as { rates?: Record<string, number> };
        fxRate = Number(fxJson.rates?.[currency] ?? 1) || 1;
      }
    }

    const goldPerGram = (goldUsdPerOunce / OUNCE_TO_GRAM) * fxRate;
    const silverPerGram = (silverUsdPerOunce / OUNCE_TO_GRAM) * fxRate;

    return {
      currency,
      goldPerGram,
      silverPerGram,
      goldUsdPerOunce,
      silverUsdPerOunce,
      fxRate,
      fetchedAt: new Date().toISOString(),
      source: "gold-api.com + open.er-api.com",
    };
  });
