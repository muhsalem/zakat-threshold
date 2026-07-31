import { describe, it, expect } from "vitest";
import {
  computeBaseByMethodology,
  crossCheckMethodologies,
  CORPORATE_METHODOLOGIES,
  type CategoryTotals,
} from "./corporate-methodologies";

const totals: CategoryTotals = {
  cash: 200_000,
  receivables: 150_000,
  inventory: 300_000,
  investments: 50_000,
  fixed_assets: 500_000,
  prepayments: 20_000,
  current_liabilities: 180_000,
  long_term_liabilities: 300_000,
  equity: 740_000,
  excluded: 0,
};

describe("منهجيات زكاة الشركات", () => {
  it("صافي الأصول المتداولة يحسب الوعاء الصحيح", () => {
    const r = computeBaseByMethodology(totals, "net-current-assets");
    expect(r.zakatableAssets).toBe(700_000);
    expect(r.deductibleLiabilities).toBe(180_000);
    expect(r.zakatBase).toBe(520_000);
  });

  it("يخصم القسط المستحق من القرض طويل الأجل عند تمريره", () => {
    const r = computeBaseByMethodology(totals, "net-current-assets", {
      longTermDueWithinHawl: 40_000,
    });
    expect(r.deductibleLiabilities).toBe(220_000);
    expect(r.zakatBase).toBe(480_000);
  });

  it("صافي الموجودات يصل لنتيجة مقاربة", () => {
    const r = computeBaseByMethodology(totals, "net-assets");
    // (740000 + 300000) − (500000 + 20000) = 520000
    expect(r.zakatBase).toBe(520_000);
  });

  it("المنهجيتان تتطابقان في ميزان متسق", () => {
    const check = crossCheckMethodologies(totals);
    expect(check.matched).toBe(true);
    expect(check.difference).toBe(0);
  });

  it("يكشف الخلل عند تصنيف غير متسق", () => {
    const broken = { ...totals, fixed_assets: 100_000 };
    const check = crossCheckMethodologies(broken);
    expect(check.matched).toBe(false);
    expect(check.note).toContain("خلل");
  });

  it("لا ينتج وعاءً سالباً", () => {
    const negative: CategoryTotals = { ...totals, current_liabilities: 5_000_000 };
    expect(computeBaseByMethodology(negative, "net-current-assets").zakatBase).toBe(0);
  });

  it("كل منهجية توثّق مصدرها وصيغتها وإصدارها", () => {
    for (const m of Object.values(CORPORATE_METHODOLOGIES)) {
      expect(m.sourceId).toMatch(/^SRC-/);
      expect(m.formulaAr.length).toBeGreaterThan(10);
      expect(m.version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("ينتج خطوات قابلة للتدقيق", () => {
    const r = computeBaseByMethodology(totals, "net-current-assets");
    expect(r.steps.length).toBeGreaterThan(3);
    expect(r.steps.filter((s) => s.sign === "−").length).toBeGreaterThan(0);
  });
});
