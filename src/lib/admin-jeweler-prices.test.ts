import assert from "node:assert/strict";
import { it } from "node:test";
import { adminJewelerPriceSchema } from "./admin-jeweler-prices";
const input = { country: "EG", currency: "EGP", gold: 7000, silver: null, goldBuyback: 6900, silverBuyback: null, source: "صائغ معتمد", reason: "تحديث سعر اليوم" };
it("allows a single metal with its matching currency", () => assert.equal(adminJewelerPriceSchema.safeParse(input).success, true));
it("rejects missing prices and mismatched currency", () => {
  assert.equal(adminJewelerPriceSchema.safeParse({ ...input, gold: null }).success, false);
  assert.equal(adminJewelerPriceSchema.safeParse({ ...input, currency: "SAR" }).success, false);
});
it("rejects nonpositive prices and buyback above sale", () => {
  assert.equal(adminJewelerPriceSchema.safeParse({ ...input, gold: 0 }).success, false);
  assert.equal(adminJewelerPriceSchema.safeParse({ ...input, goldBuyback: 7100 }).success, false);
});