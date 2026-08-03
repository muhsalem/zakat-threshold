import { describe, it, expect } from "vitest";
import {
  applyValuationPolicy,
  DEFAULT_VALUATION_POLICY,
  type ValuationInput,
} from "./valuation-policy";

const items: ValuationInput[] = [
  { label: "بضاعة أ", cost: 100_000, marketValue: 130_000 },
  { label: "بضاعة ب", cost: 50_000, marketValue: 40_000, netRealizableValue: 36_000 },
];

describe("سياسة التقييم", () => {
  it("الأصل هو القيمة السوقية", () => {
    const r = applyValuationPolicy(items, { ...DEFAULT_VALUATION_POLICY, valuationDate: "2026-03-01" });
    expect(r.total).toBe(170_000);
    expect(r.totalDeltaVsMarket).toBe(0);
    expect(r.warnings).toEqual([]);
  });

  it("التكلفة التاريخية تُظهر الفرق عن السوق", () => {
    const r = applyValuationPolicy(items, {
      basis: "cost",
      valuationDate: "2026-03-01",
      justification: "قرار الهيئة الشرعية رقم 12",
      version: "1.0.0",
    });
    expect(r.total).toBe(150_000);
    expect(r.totalDeltaVsMarket).toBe(-20_000);
  });

  it("ينبّه عند اعتماد أساس غير سوقي بلا تسويغ", () => {
    const r = applyValuationPolicy(items, {
      basis: "cost",
      valuationDate: "2026-03-01",
      version: "1.0.0",
    });
    expect(r.warnings.some((w) => w.includes("تسويغ"))).toBe(true);
  });

  it("الأقل من التكلفة أو السوق يختار الأدنى لكل بند", () => {
    const r = applyValuationPolicy(items, {
      basis: "lower_of_cost_or_market",
      valuationDate: "2026-03-01",
      justification: "السياسة المحاسبية",
      version: "1.0.0",
    });
    expect(r.total).toBe(140_000);
  });

  it("صافي القيمة البيعية يستخدم القيمة المحددة", () => {
    const r = applyValuationPolicy([items[1]], {
      basis: "net_realizable",
      valuationDate: "2026-03-01",
      justification: "تكاليف بيع مؤكدة",
      version: "1.0.0",
    });
    expect(r.total).toBe(36_000);
  });

  it("يستخدم التكلفة عند غياب القيمة السوقية", () => {
    const r = applyValuationPolicy([{ label: "ج", cost: 10_000 }], {
      ...DEFAULT_VALUATION_POLICY,
      valuationDate: "2026-03-01",
    });
    expect(r.total).toBe(10_000);
  });

  it("كل سطر يحمل تعليلاً", () => {
    const r = applyValuationPolicy(items, {
      ...DEFAULT_VALUATION_POLICY,
      valuationDate: "2026-03-01",
    });
    expect(r.lines.every((l) => l.note.length > 10)).toBe(true);
  });
});
