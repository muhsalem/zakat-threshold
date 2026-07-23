import { describe, it, expect } from "vitest";
import { calcLivestockZakat } from "./livestock";

describe("calcLivestockZakat — camels", () => {
  it("no zakat below 5 camels", () => {
    expect(calcLivestockZakat("camels", 4).belowNisab).toBe(true);
  });
  it("1 sheep at 5 camels", () => {
    const r = calcLivestockZakat("camels", 5);
    expect(r.due).toEqual([expect.objectContaining({ count: 1, description: "شاة" })]);
  });
  it("bint makhad at 25 camels", () => {
    expect(calcLivestockZakat("camels", 25).due[0].description).toBe("بنت مخاض");
  });
  it("hiqqah at 46 camels", () => {
    expect(calcLivestockZakat("camels", 46).due[0].description).toBe("حِقّة");
  });
});

describe("calcLivestockZakat — cattle", () => {
  it("no zakat below 30", () => {
    expect(calcLivestockZakat("cattle", 29).belowNisab).toBe(true);
  });
  it("1 tabee at 30", () => {
    expect(calcLivestockZakat("cattle", 30).due[0].description).toBe("تبيع أو تبيعة");
  });
  it("1 musinnah at 40", () => {
    expect(calcLivestockZakat("cattle", 40).due[0].description).toBe("مسنّة");
  });
  it("2 musinnah at 80", () => {
    expect(calcLivestockZakat("cattle", 80).due[0].count).toBe(2);
  });
});

describe("calcLivestockZakat — sheep", () => {
  it("no zakat below 40", () => {
    expect(calcLivestockZakat("sheep", 39).belowNisab).toBe(true);
  });
  it("1 sheep at 40", () => {
    expect(calcLivestockZakat("sheep", 40).due[0].count).toBe(1);
  });
  it("2 sheep at 121", () => {
    expect(calcLivestockZakat("sheep", 121).due[0].count).toBe(2);
  });
  it("3 sheep at 201", () => {
    expect(calcLivestockZakat("sheep", 201).due[0].count).toBe(3);
  });
  it("4 sheep at 400 (one per 100)", () => {
    expect(calcLivestockZakat("sheep", 400).due[0].count).toBe(4);
  });
});

describe("non-grazing herds", () => {
  it("routes to commercial trade note", () => {
    const r = calcLivestockZakat("sheep", 500, false);
    expect(r.due).toEqual([]);
    expect(r.note).toContain("عروض تجارة");
  });
});
