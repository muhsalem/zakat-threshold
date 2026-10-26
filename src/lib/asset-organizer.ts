import { z } from "zod";

export const assetCategories = ["cash", "business", "investments", "longTerm", "receivables", "debts", "goldG", "jewelryG", "silverG", "unmapped"] as const;
export const assetInputSchema = z.object({ description: z.string().trim().min(10).max(5000), currency: z.string().regex(/^[A-Z]{3}$/), lang: z.string().min(2).max(3) });
export const assetOutputSchema = z.object({ items: z.array(z.object({ label: z.string().min(1).max(200), category: z.enum(assetCategories), amount: z.number().finite().nonnegative().max(1e12).nullable(), unit: z.enum(["currency", "grams", "unknown"]), currency: z.string().nullable(), review: z.string().min(1).max(600) })).max(40) });
export type AssetItem = z.infer<typeof assetOutputSchema>["items"][number];
export type AssetValues = Partial<Record<Exclude<AssetItem["category"], "unmapped">, number>>;

export function aggregateReviewedAssets(items: AssetItem[], approved: boolean[], currency: string): AssetValues {
  const result: AssetValues = {};
  items.forEach((item, index) => {
    if (!approved[index]) return;
    if (item.category === "unmapped" || item.amount === null || !Number.isFinite(item.amount) || item.amount < 0) throw new Error("Review missing amount or category");
    const metal = ["goldG", "jewelryG", "silverG"].includes(item.category);
    if (metal ? item.unit !== "grams" : item.unit !== "currency" || item.currency !== currency) throw new Error("Review units or currency");
    result[item.category] = (result[item.category] ?? 0) + item.amount;
  });
  return result;
}