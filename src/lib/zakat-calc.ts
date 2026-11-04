import { KARATS, ZAKAT_RATE } from "./nisab";
import { ZAKAT_RATE_SOLAR } from "./hijri";

export type JewelryRule = "include" | "exclude" | "";

export type ZakatInputs = {
  cash: number;
  business: number;
  investments: number;
  longTerm: number;
  /** Percent (0–100) of a long-term holding that is zakatable (the company's liquid assets). */
  longTermPct: number;
  /** Debts owed to you that you expect to be repaid. */
  receivables: number;
  /** Debts you owe that are due now or fall due within your hawl. */
  debts: number;
  goldG: number;
  karat: number;
  jewelryG: number;
  /** "" = not chosen yet: worn jewellery is left out until the user decides. */
  jewelryRule: JewelryRule;
  silverG: number;
  standard: "silver" | "gold";
  solarYear: boolean;
};

export type ZakatPrices = {
  goldGram: number;
  silverGram: number;
  /** Nisab value in the user's currency for each standard. */
  nisabGold: number;
  nisabSilver: number;
};

/** Parses a user-typed number; anything unusable counts as zero and never goes negative. */
export function toAmount(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function computeZakat(input: ZakatInputs, prices: ZakatPrices | null) {
  const purity = KARATS.find((k) => k.k === input.karat)?.purity ?? 1;
  const zakatableGoldG = input.goldG + (input.jewelryRule === "include" ? input.jewelryG : 0);
  const goldValue = prices ? zakatableGoldG * prices.goldGram * purity : 0;
  const silverValue = prices ? input.silverG * prices.silverGram : 0;
  const metals = goldValue + silverValue;
  const pct = Math.min(Math.max(input.longTermPct, 0), 100);
  const longTermValue = input.longTerm * (pct / 100);
  const gross =
    input.cash + input.business + input.investments + longTermValue + input.receivables + metals;
  const net = gross - input.debts;
  const nisab = prices ? (input.standard === "silver" ? prices.nisabSilver : prices.nisabGold) : 0;
  // No verdict until live prices (and hence the nisab) are known.
  const above = prices != null && net > 0 && net >= nisab;
  const rate = input.solarYear ? ZAKAT_RATE_SOLAR : ZAKAT_RATE;
  return {
    metals,
    net,
    nisab,
    above,
    rate,
    due: above ? net * rate : 0,
    /** Jewellery was entered but no ruling chosen, so it is not counted yet. */
    jewelryUndecided: input.jewelryG > 0 && input.jewelryRule === "",
  };
}
