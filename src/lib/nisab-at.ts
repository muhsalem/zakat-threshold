import { TROY_OUNCE_G } from "./nisab";
import { nisabTotals } from "./nisab-valuation";

export type NisabStandard = "default" | "tola";

/** Silver weight (and, through goldWeightFor, the paired gold weight) for a named standard. */
export const silverWeightFor = (standard: NisabStandard) => (standard === "tola" ? 612.36 : 595);

export type DerivedNisab = {
  goldGram: number;
  silverGram: number;
  gold: number;
  silver: number;
};

/**
 * A country's nisab at one recorded minute, derived from raw USD/oz and that day's
 * exchange rate. Nothing per country is stored, so every country has the full history.
 */
export function deriveNisab(input: {
  goldUsdOz: number;
  silverUsdOz: number;
  /** Units of the country's currency per US dollar. */
  rate: number;
  standard?: NisabStandard;
}): DerivedNisab | null {
  const { goldUsdOz, silverUsdOz, rate, standard = "default" } = input;
  if (![goldUsdOz, silverUsdOz, rate].every((v) => Number.isFinite(v) && v > 0)) return null;
  const goldGram = (goldUsdOz / TROY_OUNCE_G) * rate;
  const silverGram = (silverUsdOz / TROY_OUNCE_G) * rate;
  const totals = nisabTotals(goldGram, silverGram, silverWeightFor(standard));
  return { goldGram, silverGram, gold: totals.gold, silver: totals.silver };
}

/** Minutes between a requested instant and the recorded one (never negative). */
export function gapMinutes(requestedIso: string, recordedIso: string): number {
  const gap = Date.parse(requestedIso) - Date.parse(recordedIso);
  return Number.isFinite(gap) ? Math.max(0, Math.round(gap / 60_000)) : 0;
}

/** Truncates an instant to its UTC minute, the key under which a tick is stored. */
export function minuteStart(date: Date): string {
  return new Date(Math.floor(date.getTime() / 60_000) * 60_000).toISOString();
}
