/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getAnyHijriYearDetails } from "./islamic-chronology.ts";
import { calculateYearNisab } from "./historical-nisab.ts";

describe("hijri-year nisab model", () => {
  it("gives no money values for years without recorded market prices", () => {
    for (const year of [2, 77, 800, 1300]) {
      const d = getAnyHijriYearDetails(year, "SA", 3.75);
      assert.equal(d.priced, false, `year ${year}`);
      assert.equal(d.goldNisabLocal, 0);
      assert.equal(d.silverNisabLocal, 0);
      assert.equal(d.ratioIsEstimate, true);
    }
  });

  it("prices years inside the recorded series from the real annual data", () => {
    const d = getAnyHijriYearDetails(1391, "SA", 3.75); // 1971
    assert.equal(d.priced, true);
    assert.equal(d.gregorianYear, 1971);
    assert.equal(d.goldPriceUsdOz, 40.62);
    assert.equal(d.silverPriceUsdOz, 1.55);
    assert.ok(Math.abs(d.goldToSilverRatio - 26.2) < 0.05);
    assert.equal(d.ratioIsEstimate, false);
  });

  it("never declares a nisab for an unpriced Gregorian year", () => {
    const n = calculateYearNisab(1800, false, 3.75);
    assert.equal(n.priced, false);
    assert.equal(n.goldNisab, 0);
    // A year that is recorded is priced.
    assert.equal(calculateYearNisab(1990, false, 3.75).priced, true);
  });
});
