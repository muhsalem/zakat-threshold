export type OfficialThreshold = {
  country: string;
  currency: string;
  announced_on: string;
  gold_nisab: number | null;
  silver_nisab: number | null;
  authority: string;
  source_url: string | null;
};

/** An old announcement is historical context, not a replacement for today's prices. */
export function resolveCalculatorThreshold(input: {
  official?: OfficialThreshold | null;
  country: string;
  currency: string;
  day: string;
  metal: "gold" | "silver";
  calculated?: number | null;
}) {
  const row = input.official;
  const announced = row?.[input.metal === "gold" ? "gold_nisab" : "silver_nisab"];
  if (row && row.country === input.country && row.currency === input.currency && row.announced_on === input.day && announced != null && Number.isFinite(announced) && announced > 0) {
    return { value: announced, origin: "official" as const, official: row };
  }
  const value = input.calculated;
  return { value: value != null && Number.isFinite(value) && value > 0 ? value : null, origin: "calculated" as const, official: null };
}