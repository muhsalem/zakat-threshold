import { test } from "node:test";
import { strict as assert } from "node:assert";
import { aggregateReviewedAssets, assetInputSchema, assetOutputSchema, type AssetItem } from "./asset-organizer";
const cash: AssetItem = { label: "cash", category: "cash", amount: 10000, unit: "currency", currency: "EGP", review: "confirm" };
test("only confirmed assets populate calculator and debts stay separate", () => {
  assert.deepEqual(aggregateReviewedAssets([cash, { ...cash, amount: 2000 }, { ...cash, category: "debts", amount: 3000 }], [true, false, true], "EGP"), { cash: 10000, debts: 3000 });
});
test("same-category assets sum rather than overwrite one another", () => assert.deepEqual(aggregateReviewedAssets([cash, cash], [true, true], "EGP"), { cash: 20000 }));
test("unknown amounts and mixed currencies cannot silently enter calculation", () => {
  for (const item of [{ ...cash, amount: null }, { ...cash, currency: "USD" }, { ...cash, category: "unmapped" as const }]) assert.throws(() => aggregateReviewedAssets([item], [true], "EGP"));
});
test("metal values must be grams, not monetary values", () => {
  assert.throws(() => aggregateReviewedAssets([{ ...cash, category: "goldG" }], [true], "EGP"));
  assert.deepEqual(aggregateReviewedAssets([{ ...cash, category: "goldG", unit: "grams", amount: 85 }], [true], "EGP"), { goldG: 85 });
});
test("input and model output reject invalid data", () => {
  assert.equal(assetInputSchema.safeParse({ description: "x", currency: "EGP", lang: "ar" }).success, false);
  assert.equal(assetOutputSchema.safeParse({ items: [{ ...cash, amount: -10 }] }).success, false);
});