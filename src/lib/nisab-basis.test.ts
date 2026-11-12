import { describe, expect, test } from "bun:test";
import { nisabBand, nisabZone, suggestedMetal } from "./nisab-basis";

describe("nisabBand", () => {
  test("silver is the cheaper nisab at today's ratio", () => {
    const b = nisabBand(8500, 640)!;
    expect(b.lowerMetal).toBe("silver");
    expect(b.lower).toBe(640);
    expect(b.higher).toBe(8500);
    expect(b.gap).toBe(7860);
    expect(b.multiple).toBeCloseTo(13.28, 2);
  });

  test("gold is the cheaper nisab if the ratio ever inverts", () => {
    const b = nisabBand(500, 600)!;
    expect(b.lowerMetal).toBe("gold");
    expect(b.higherMetal).toBe("silver");
  });

  test("unusable inputs give no band", () => {
    expect(nisabBand(0, 100)).toBeNull();
    expect(nisabBand(100, NaN)).toBeNull();
    expect(nisabBand(-1, 100)).toBeNull();
  });
});

describe("nisabZone", () => {
  const band = nisabBand(8500, 640);
  test("classifies against both nisabs", () => {
    expect(nisabZone(100, band)).toBe("below");
    expect(nisabZone(5000, band)).toBe("between");
    expect(nisabZone(9000, band)).toBe("above");
  });
  test("a net exactly at a nisab has reached it", () => {
    expect(nisabZone(640, band)).toBe("between");
    expect(nisabZone(8500, band)).toBe("above");
  });
  test("no verdict without a band", () => {
    expect(nisabZone(5000, null)).toBeNull();
  });
});

describe("suggestedMetal", () => {
  test("only schools whose text names the better-for-the-poor rule get a suggestion", () => {
    expect(suggestedMetal("hanafi")).toBe("lower");
    expect(suggestedMetal("hanbali")).toBe("lower");
    expect(suggestedMetal("shafii")).toBeNull();
    expect(suggestedMetal("maliki")).toBeNull();
  });
});
