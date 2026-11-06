import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import {
  ALTERNATIVE_GOLD_NISAB_G,
  goldWeightFor,
  manualMetals,
  nisabTotals,
  resolveGram,
  valuationQuote,
  comparePublishedBuyback,
} from "./nisab-valuation";

describe("country nisab valuation", () => {
  test("compares published purchase proceeds against the selected nisab", () => {
    assert.deepEqual(comparePublishedBuyback(6900, 85, 595000), { gram: 6900, proceeds: 586500, threshold: 595000, difference: -8500 });
    assert.equal(comparePublishedBuyback(98, 595, 60000)?.proceeds, 58310);
    assert.equal(comparePublishedBuyback(98, 612.36, 60000)?.proceeds, 60011.28);
  });
  test("does not invent a published purchase price when it is missing or invalid", () => {
    for (const bid of [null, undefined, 0, -10, NaN]) assert.equal(comparePublishedBuyback(bid, 85, 595000), null);
    assert.equal(comparePublishedBuyback(6900, 85, null)?.difference, null);
  });
  test("uses the local purchase quote, not the sale quote, when available", () => {
    assert.equal(valuationQuote(6900, 7029), 6900);
    assert.equal(nisabTotals(valuationQuote(6900, 7029) ?? 0, 98).gold, 586500);
  });
  test("falls back to the available ask, then global, without inventing a bid", () => {
    assert.equal(valuationQuote(null, 103), 103);
    assert.equal(valuationQuote(null, null), null);
    assert.deepEqual(resolveGram(100, false, valuationQuote(null, null)), {
      gram: 100,
      origin: "global",
    });
  });
  test("a gold-only manual override does not disable local silver", () => {
    const manual = manualMetals({ goldUsdOz: 3100 }, undefined, "EGP");
    assert.deepEqual(manual, { gold: true, silver: false });
    assert.equal(resolveGram(120, manual.gold, 110).gram, 120);
    assert.equal(resolveGram(4, manual.silver, 98).gram, 98);
  });
  test("uses 595 grams by default and 612.36 grams only when chosen", () => {
    assert.equal(nisabTotals(100, 10).silver, 5950);
    assert.equal(nisabTotals(100, 10, 612.36).silver, 6123.6);
  });
  test("recalculates gold and silver when their gram prices change", () => {
    assert.equal(nisabTotals(110, 9).gold - nisabTotals(100, 10).gold, 850);
    assert.equal(nisabTotals(110, 9).silver - nisabTotals(100, 10).silver, -595);
  });
  test("the tola silver standard pairs with the 87.48 g gold standard", () => {
    assert.equal(goldWeightFor(595), 85);
    assert.equal(goldWeightFor(612.36), ALTERNATIVE_GOLD_NISAB_G);
    assert.equal(nisabTotals(100, 10, 612.36).gold, 8748);
    assert.equal(nisabTotals(100, 10).gold, 8500);
  });
  test("a zero silver price does not produce an infinite ratio", () => {
    assert.equal(nisabTotals(100, 0).ratio, 0);
    assert.equal(nisabTotals(100, 10).ratio, 10);
  });
});
