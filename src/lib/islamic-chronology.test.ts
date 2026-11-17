/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getAnyHijriYearDetails,
  ISLAMIC_CHRONOLOGY,
  PAR_WEIGHT_RATIO,
  weightRatio,
} from "./islamic-chronology.ts";
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

describe("early Islamic par", () => {
  it("10 dirhams per dinar is 7 by weight, so 20 dinars equal 200 dirhams in value", () => {
    assert.equal(PAR_WEIGHT_RATIO, 7);
    assert.equal(85 * PAR_WEIGHT_RATIO, 595);
  });

  it("the prophetic-era model uses the weight ratio, not the exchange rate", () => {
    assert.equal(getAnyHijriYearDetails(5, "SA", 3.75).goldToSilverRatio, 7);
    assert.equal(getAnyHijriYearDetails(30, "SA", 3.75).goldToSilverRatio, 7);
    assert.equal(ISLAMIC_CHRONOLOGY[0]!.goldToSilverRatio, 7);
  });

  it("the modelled ratio rises monotonically before 1925 CE", () => {
    let prev = 0;
    for (let y = 2; y <= 1342; y += 20) {
      const r = getAnyHijriYearDetails(y, "SA", 3.75).goldToSilverRatio;
      assert.ok(r >= prev, `year ${y}: ${r} < ${prev}`);
      prev = r;
    }
  });

  it("weightRatio converts dirhams per dinar by the coin weights", () => {
    assert.equal(weightRatio(12), 8.4);
  });
});
