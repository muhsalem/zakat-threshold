import { describe, expect, it } from "vitest";

import { LONG_RANGES } from "./prices.functions";
import { annualSince } from "./long-history";

describe("long history ranges", () => {
  it("supports the 75-year and 1000-year ranges", () => {
    expect(LONG_RANGES["75y"]).toBe(75);
    expect(LONG_RANGES["1000y"]).toBe(1000);
  });

  it("1000 years returns only recorded annual data, never fabricated years", () => {
    const points = annualSince(1000);
    expect(points.length).toBeGreaterThan(90);
    expect(points[0]!.year).toBe(1925);
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i]!.year - points[i - 1]!.year).toBe(1);
    }
  });
});
