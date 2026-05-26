import { createServerFn } from "@tanstack/react-start";

/**
 * Fetch live spot prices for gold (XAU) and silver (XAG) per gram in USD.
 * Source: https://api.gold-api.com (free, no key required).
 * Returns per-gram USD prices.
 */
export const getLiveMetalPrices = createServerFn({ method: "GET" }).handler(
  async () => {
    const TROY_OZ_GRAMS = 31.1034768;
    try {
      const [goldRes, silverRes] = await Promise.all([
        fetch("https://api.gold-api.com/price/XAU", { headers: { accept: "application/json" } }),
        fetch("https://api.gold-api.com/price/XAG", { headers: { accept: "application/json" } }),
      ]);
      if (!goldRes.ok || !silverRes.ok) throw new Error("upstream error");
      const gold = (await goldRes.json()) as { price: number };
      const silver = (await silverRes.json()) as { price: number };
      return {
        ok: true as const,
        currency: "USD",
        gold24PerGram: gold.price / TROY_OZ_GRAMS,
        silverPerGram: silver.price / TROY_OZ_GRAMS,
        updatedAt: new Date().toISOString(),
      };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }
);
