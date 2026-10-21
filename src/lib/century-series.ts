import { ANNUAL_METALS, type AnnualPoint } from "./long-history";
import { TROY_OUNCE_G } from "./nisab";

/** Gold was officially fixed (not a market price) up to and including 1971. */
export const OFFICIAL_GOLD_UNTIL = 1971;

export type CenturyPoint = {
  year: number;
  /** Price of one gram of pure metal in the chosen currency. */
  gold: number;
  silver: number;
  /** Grams of silver that one gram of gold is worth. */
  ratio: number;
  official: boolean;
  /** True for the live "today" point appended after the annual averages. */
  live?: boolean;
};

/**
 * Per-gram gold and silver prices over the last `years` years in a currency.
 * Annual USD/oz averages are converted with the single `rate` supplied, i.e. today's
 * exchange rate — the series compares metal prices, not historical local purchasing power.
 */
export function buildCenturySeries(
  rate: number,
  options: {
    years?: number;
    now?: Date;
    live?: { goldUsdOz: number; silverUsdOz: number } | undefined;
    annual?: AnnualPoint[];
  } = {},
): CenturyPoint[] {
  const { years = 100, now = new Date(), live, annual = ANNUAL_METALS } = options;
  if (!Number.isFinite(rate) || rate <= 0) return [];
  const thisYear = now.getUTCFullYear();
  const toGram = (usdOz: number) => (usdOz / TROY_OUNCE_G) * rate;
  const points: CenturyPoint[] = annual
    .filter((p) => p.year >= thisYear - years && p.gold > 0 && p.silver > 0)
    .sort((a, b) => a.year - b.year)
    .map((p) => ({
      year: p.year,
      gold: toGram(p.gold),
      silver: toGram(p.silver),
      ratio: p.gold / p.silver,
      official: p.year <= OFFICIAL_GOLD_UNTIL,
    }));
  if (live && live.goldUsdOz > 0 && live.silverUsdOz > 0) {
    const last = points[points.length - 1];
    // The live quote supersedes an annual average for the same calendar year.
    if (last && last.year >= thisYear) points.pop();
    points.push({
      year: thisYear,
      gold: toGram(live.goldUsdOz),
      silver: toGram(live.silverUsdOz),
      ratio: live.goldUsdOz / live.silverUsdOz,
      official: false,
      live: true,
    });
  }
  return points;
}
