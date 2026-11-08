import { GOLD_NISAB_G, SILVER_NISAB_G, perGram, KARATS } from "./nisab";

export const NISAB_CSV_HEADER =
  "country,currency,gold_nisab,silver_nisab,lower_nisab,gold_gram_24k,gold_gram_21k,silver_gram,updated_at";

const k21 = KARATS.find((k) => k.k === 21)?.purity ?? 0.875;

const money = (value: number) => value.toFixed(2);

/** One CSV row for `IMPORTDATA` in Excel and Google Sheets. Numbers only, a dot as separator. */
export function nisabCsv(input: {
  country: string;
  currency: string;
  goldUsdOz: number;
  silverUsdOz: number;
  ratePerUsd: number;
  updatedAt: string;
}): string {
  const gold = perGram(input.goldUsdOz, input.ratePerUsd);
  const silver = perGram(input.silverUsdOz, input.ratePerUsd);
  const goldNisab = gold * GOLD_NISAB_G;
  const silverNisab = silver * SILVER_NISAB_G;
  const row = [
    input.country,
    input.currency,
    money(goldNisab),
    money(silverNisab),
    money(Math.min(goldNisab, silverNisab)),
    money(gold),
    money(gold * k21),
    money(silver),
    input.updatedAt,
  ].join(",");
  return `${NISAB_CSV_HEADER}\n${row}\n`;
}
