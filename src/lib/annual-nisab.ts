import { z } from "zod";
import { COUNTRIES } from "./countries";
import { DAY_MS, ZAKAT_RATE_SOLAR } from "./hijri";
import { gregorianToHijri, hijriToGregorian } from "./calendars";
import { SILVER_NISAB_G, ZAKAT_RATE } from "./nisab";
import { ALTERNATIVE_SILVER_NISAB_G, goldWeightFor } from "./nisab-valuation";

export const annualSearchSchema = z.object({
  country: z.string().default("EG").catch("EG"),
  calendar: z.enum(["gregorian", "hijri"]).default("gregorian").catch("gregorian"),
  year: z.coerce.number().int().min(2).max(9998).optional().catch(undefined),
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  metal: z.enum(["gold", "silver"]).default("silver").catch("silver"),
});
export type AnnualSearch = z.infer<typeof annualSearchSchema>;
export const annualRequestSchema = annualSearchSchema
  .refine((v) => COUNTRIES.some((c) => c.code === v.country), "Invalid country")
  .refine(
    (v) => !v.year || (v.calendar === "gregorian" ? v.year >= 1900 : v.year >= 1300),
    "Invalid year",
  );

export type HistoryDay = {
  id: string;
  day: string;
  country: string;
  currency: string;
  gold_gram: number | null;
  silver_gram: number | null;
  gold_nisab: number | null;
  silver_nisab: number | null;
  source: string | null;
};

export function yearWindow(year: number, calendar: "hijri" | "gregorian") {
  const start =
    calendar === "gregorian"
      ? new Date(Date.UTC(year, 0, 1))
      : hijriToGregorian({ year, month: 1, day: 1 });
  const end =
    calendar === "gregorian"
      ? new Date(Date.UTC(year + 1, 0, 1))
      : hijriToGregorian({ year: year + 1, month: 1, day: 1 });
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function daysOfYear(year: number, calendar: "hijri" | "gregorian") {
  const { start, end } = yearWindow(year, calendar);
  const result: string[] = [];
  for (let ms = Date.parse(`${start}T00:00:00Z`); ms < Date.parse(`${end}T00:00:00Z`); ms += DAY_MS)
    result.push(new Date(ms).toISOString().slice(0, 10));
  return result;
}

export function yearOf(day: string, calendar: "hijri" | "gregorian") {
  return calendar === "gregorian"
    ? Number(day.slice(0, 4))
    : gregorianToHijri(new Date(`${day}T00:00:00Z`)).year;
}

export function historicalValuation(
  row: HistoryDay | null | undefined,
  metal: "gold" | "silver",
  silverWeight = SILVER_NISAB_G,
) {
  if (!row) return null;
  const gram = metal === "gold" ? row.gold_gram : row.silver_gram;
  // A saved amount is not enough to reconstruct its underlying valuation standard.
  if (gram == null || !Number.isFinite(gram) || gram <= 0) return null;
  const weight = metal === "gold" ? goldWeightFor(silverWeight) : silverWeight;
  return { gram, weight, threshold: gram * weight };
}

export const personalCalculationSchema = z.object({
  historyId: z.string().uuid(),
  metal: z.enum(["gold", "silver"]),
  silverWeight: z.union([z.literal(SILVER_NISAB_G), z.literal(ALTERNATIVE_SILVER_NISAB_G)]),
  netWealth: z.number().finite().min(0).max(1e15),
  basis: z.enum(["hijri", "gregorian"]),
});

export function historicalDue(wealth: number, threshold: number, basis: "hijri" | "gregorian") {
  const rate = basis === "hijri" ? ZAKAT_RATE : ZAKAT_RATE_SOLAR;
  return { rate, due: wealth > 0 && wealth >= threshold ? wealth * rate : 0 };
}
