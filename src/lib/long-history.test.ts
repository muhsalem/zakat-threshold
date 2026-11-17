import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { LONG_RANGES } from "./prices.functions";
import { ANNUAL_METALS, annualSince } from "./long-history";

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

describe("annual metals series guard", () => {
  it("has one point per year with no gaps", () => {
    for (let i = 1; i < ANNUAL_METALS.length; i++) {
      assert.equal(ANNUAL_METALS[i]!.year - ANNUAL_METALS[i - 1]!.year, 1);
    }
  });

  it("every price is positive and finite", () => {
    for (const p of ANNUAL_METALS) {
      assert.ok(Number.isFinite(p.gold) && p.gold > 0, `gold ${p.year}`);
      assert.ok(Number.isFinite(p.silver) && p.silver > 0, `silver ${p.year}`);
    }
  });

  it("a year-on-year move above 110% is a typing error until proven otherwise", () => {
    for (let i = 1; i < ANNUAL_METALS.length; i++) {
      const a = ANNUAL_METALS[i - 1]!;
      const b = ANNUAL_METALS[i]!;
      assert.ok(b.gold / a.gold < 2.1 && a.gold / b.gold < 2.1, `gold ${b.year}`);
      assert.ok(b.silver / a.silver < 2.1 && a.silver / b.silver < 2.1, `silver ${b.year}`);
    }
  });

  it("2024 and 2025 match the LBMA annual averages they were checked against", () => {
    const at = (y: number) => ANNUAL_METALS.find((p) => p.year === y)!;
    assert.ok(Math.abs(at(2025).gold - 3431.5) < 1);
    assert.ok(Math.abs(at(2025).silver - 40.03) < 0.05);
    assert.ok(Math.abs(at(2024).gold - 2386.2) < 1);
    assert.ok(Math.abs(at(2024).silver - 28.27) < 0.05);
  });
});
