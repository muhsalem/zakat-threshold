import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { nisabBand, nisabZone, suggestedMetal } from "./nisab-basis";

describe("nisabBand", () => {
  test("silver is the cheaper nisab at today's ratio", () => {
    const b = nisabBand(8500, 640)!;
    assert.equal(b.lowerMetal, "silver");
    assert.equal(b.lower, 640);
    assert.equal(b.higher, 8500);
    assert.equal(b.gap, 7860);
    assert.ok(Math.abs(b.multiple - 13.28) < 0.005);
  });

  test("gold is the cheaper nisab if the ratio ever inverts", () => {
    const b = nisabBand(500, 600)!;
    assert.equal(b.lowerMetal, "gold");
    assert.equal(b.higherMetal, "silver");
  });

  test("unusable inputs give no band", () => {
    assert.equal(nisabBand(0, 100), null);
    assert.equal(nisabBand(100, NaN), null);
    assert.equal(nisabBand(-1, 100), null);
  });
});

describe("nisabZone", () => {
  const band = nisabBand(8500, 640);
  test("classifies against both nisabs", () => {
    assert.equal(nisabZone(100, band), "below");
    assert.equal(nisabZone(5000, band), "between");
    assert.equal(nisabZone(9000, band), "above");
  });
  test("a net exactly at a nisab has reached it", () => {
    assert.equal(nisabZone(640, band), "between");
    assert.equal(nisabZone(8500, band), "above");
  });
  test("no verdict without a band", () => {
    assert.equal(nisabZone(5000, null), null);
  });
});

describe("suggestedMetal", () => {
  test("only schools whose text names the better-for-the-poor rule get a suggestion", () => {
    assert.equal(suggestedMetal("hanafi"), "lower");
    assert.equal(suggestedMetal("hanbali"), "lower");
    assert.equal(suggestedMetal("shafii"), null);
    assert.equal(suggestedMetal("maliki"), null);
  });
});
