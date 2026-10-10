import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { manualMetals, nisabTotals, resolveGram, valuationQuote } from "./nisab-valuation";

describe("country nisab valuation", () => {
  test("uses the local purchase quote, not the sale quote, when available", () => {
    assert.equal(valuationQuote(6900, 7029), 6900);
    assert.equal(nisabTotals(valuationQuote(6900, 7029) ?? 0, 98).gold, 586500);
  });
  test("falls back to the available ask, then global, without inventing a bid", () => {
    assert.equal(valuationQuote(null, 103), 103);
    assert.equal(valuationQuote(null, null), null);
    assert.deepEqual(resolveGram(100, false, valuationQuote(null, null)), { gram: 100, origin: "global" });
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
});