import type { Madhhab } from "./fiqh";

/**
 * The two nisab values in the user's currency, and where a net wealth falls against them.
 * Pure, no I/O. Which metal to measure by is a juristic choice, so this module never picks
 * one silently: it reports the band in which the choice changes the answer.
 */
export type NisabBand = {
  lower: number;
  higher: number;
  lowerMetal: "gold" | "silver";
  higherMetal: "gold" | "silver";
  /** higher − lower, in the user's currency. */
  gap: number;
  /** higher ÷ lower: how many times the dearer nisab exceeds the cheaper one. */
  multiple: number;
};

export function nisabBand(gold: number, silver: number): NisabBand | null {
  const ok = (n: number) => Number.isFinite(n) && n > 0;
  if (!ok(gold) || !ok(silver)) return null;
  const silverIsLower = silver <= gold;
  const lower = silverIsLower ? silver : gold;
  const higher = silverIsLower ? gold : silver;
  return {
    lower,
    higher,
    lowerMetal: silverIsLower ? "silver" : "gold",
    higherMetal: silverIsLower ? "gold" : "silver",
    gap: higher - lower,
    multiple: higher / lower,
  };
}

/**
 * below   — under both nisabs: nothing is due on either view.
 * between — over the cheaper nisab, under the dearer: due on one view only, so the choice matters.
 * above   — over both: due on either view.
 */
export type NisabZone = "below" | "between" | "above";

export function nisabZone(net: number, band: NisabBand | null): NisabZone | null {
  if (band == null || !Number.isFinite(net)) return null;
  if (net < band.lower) return "below";
  if (net < band.higher) return "between";
  return "above";
}

/**
 * What each school's text in `fiqh.ts` says about valuing trade goods: Hanafi and Hanbali take
 * whichever is better for the poor (in practice the cheaper nisab); Shafi'i takes the prevailing
 * currency of the place. No default is offered for the others, so the user must choose.
 */
export function suggestedMetal(madhhab: Madhhab): "lower" | null {
  return madhhab === "hanafi" || madhhab === "hanbali" ? "lower" : null;
}
