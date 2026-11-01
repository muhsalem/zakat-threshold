import { z } from "zod";
import { COUNTRIES } from "./countries";
const price = z.number().finite().positive().max(1_000_000_000).nullable();
export const adminJewelerPriceSchema = z.object({
  country: z.string(), currency: z.string(), gold: price, silver: price,
  goldBuyback: price, silverBuyback: price,
  source: z.string().trim().min(3).max(200), reason: z.string().trim().min(3).max(300),
}).superRefine((value, ctx) => {
  if (!COUNTRIES.some(c => c.code === value.country && c.currency === value.currency)) ctx.addIssue({ code: "custom", message: "Invalid country/currency" });
  if (value.gold === null && value.silver === null) ctx.addIssue({ code: "custom", message: "Enter a metal price" });
  for (const [ask, bid] of [[value.gold, value.goldBuyback], [value.silver, value.silverBuyback]]) {
    if (bid !== null && (ask === null || bid > ask)) ctx.addIssue({ code: "custom", message: "Invalid buyback" });
  }
});