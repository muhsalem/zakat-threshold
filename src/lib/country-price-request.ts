import { z } from "zod";

export const countryPriceRequestSchema = z.object({
  kind: z.enum(["hourly", "local-slots", "egypt-hourly"]).default("local-slots"),
}).strict();

/** The temporary Egypt check never claims to have completed a local 11/23 slot. */
export function requestedPriceCountries(kind: z.infer<typeof countryPriceRequestSchema>["kind"]): ReadonlySet<string> | null {
  return kind === "egypt-hourly" ? new Set(["EG"]) : null;
}