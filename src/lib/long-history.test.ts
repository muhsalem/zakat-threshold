import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { LONG_RANGES } from "./prices.functions";
import { annualSince } from "./long-history";

describe("long history ranges", () => {
  it("supports the 75-year and 1000-year ranges", () => {
    assert.equal(LONG_RANGES["75y"], 75);
    assert.equal(LONG_RANGES["1000y"], 1000);
  });

  it("1000 years returns only recorded annual data, never fabricated years", () => {
    const points = annualSince(1000);
    assert.ok(points.length > 90);
    assert.equal(points[0]!.year, 1925);
    for (let i = 1; i < points.length; i += 1) {
      assert.equal(points[i]!.year - points[i - 1]!.year, 1);
    }
  });
});
