import { GOLD_NISAB_G, SILVER_NISAB_G } from "./nisab";
import type { Overrides, ScopeOverride } from "./overrides";

export type PriceOrigin = "manual" | "local" | "global";
export type PricePreference = "local" | "global";
export const ALTERNATIVE_SILVER_NISAB_G = 612.36;

export function resolveGram(spot: number, manual: boolean, local: number | null | undefined, prefer: PricePreference = "local") {
  if (manual) return { gram: spot, origin: "manual" as PriceOrigin };
  if (prefer === "local" && local != null && Number.isFinite(local) && local > 0) return { gram: local, origin: "local" as PriceOrigin };
  return { gram: spot, origin: "global" as PriceOrigin };
}

/** A quoted purchase price is the jeweller's bid to buy the visitor's metal. */
export function valuationQuote(bid: number | null | undefined, ask: number | null | undefined) {
  if (bid != null && Number.isFinite(bid) && bid > 0) return bid;
  return ask != null && Number.isFinite(ask) && ask > 0 ? ask : null;
}

export function manualMetals(overrides: Overrides, scope: ScopeOverride | undefined, currency: string) {
  const manualRate = scope?.rate != null || overrides.rates?.[currency] != null;
  return {
    gold: manualRate || scope?.goldUsdOz != null || overrides.goldUsdOz != null,
    silver: manualRate || scope?.silverUsdOz != null || overrides.silverUsdOz != null,
  };
}

export function nisabTotals(goldGram: number, silverGram: number, silverWeight = SILVER_NISAB_G) {
  const gold = goldGram * GOLD_NISAB_G;
  const silver = silverGram * silverWeight;
  return { goldGram, silverGram, gold, silver, lower: Math.min(gold, silver), ratio: goldGram / silverGram };
}