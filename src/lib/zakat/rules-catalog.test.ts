import { describe, it, expect } from "vitest";
import {
  ZAKAT_RULES,
  SHARIAH_SOURCES,
  RULES_CATALOG_VERSION,
  validateCatalog,
  evaluateRuleActivation,
  getActiveRules,
  getBlockedRules,
  getRule,
  getRulesForAsset,
  getHumanReviewRules,
  computeDivergenceImpact,
  getSource,
} from "./rules-catalog";

describe("سلامة كتالوج القواعد", () => {
  it("لا يحتوي على أي خلل بنيوي", () => {
    expect(validateCatalog()).toEqual([]);
  });

  it("كل قاعدة معتمدة مرتبطة بمصدر متحقَّق", () => {
    for (const rule of ZAKAT_RULES.filter((r) => r.approval === "approved")) {
      expect(getSource(rule.sourceId)?.verification).toBe("verified");
    }
  });

  it("معرّفات القواعد فريدة", () => {
    const ids = ZAKAT_RULES.map((r) => r.ruleId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("معرّفات المصادر فريدة", () => {
    const ids = SHARIAH_SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("للكتالوج إصدار معلن", () => {
    expect(RULES_CATALOG_VERSION).toMatch(/^\d{4}\.\d+\.\d+$/);
  });
});

describe("بوابة التفعيل", () => {
  it("تمنع القاعدة غير المعتمدة", () => {
    const crypto = getRule("ZR-CRYPTO-001")!;
    const res = evaluateRuleActivation(crypto);
    expect(res.active).toBe(false);
    expect(res.reasons.join(" ")).toContain("under_review");
  });

  it("تمنع القاعدة ذات المصدر غير المتحقَّق", () => {
    const crypto = getRule("ZR-CRYPTO-001")!;
    expect(evaluateRuleActivation(crypto).reasons.some((r) => r.includes("pending"))).toBe(true);
  });

  it("تمنع القاعدة قبل حلول تاريخ السريان", () => {
    const cash = getRule("ZR-CASH-001")!;
    const res = evaluateRuleActivation(cash, new Date("2025-01-01"));
    expect(res.active).toBe(false);
    expect(res.reasons.join(" ")).toContain("لم يحلّ");
  });

  it("تسمح بالقاعدة المستوفية للشروط", () => {
    expect(evaluateRuleActivation(getRule("ZR-CASH-001")!).active).toBe(true);
  });

  it("القواعد المفعّلة لا تشمل المحجوبة", () => {
    const active = getActiveRules().map((r) => r.ruleId);
    const blocked = getBlockedRules().map((b) => b.rule.ruleId);
    expect(active.some((id) => blocked.includes(id))).toBe(false);
    expect(blocked).toContain("ZR-CRYPTO-001");
  });

  it("تُرجع قواعد الأصل المطلوب فقط", () => {
    const gold = getRulesForAsset("gold");
    expect(gold.length).toBeGreaterThan(0);
    expect(gold.every((r) => r.assetType === "gold")).toBe(true);
  });

  it("تُحدد القواعد الموجبة للمراجعة البشرية", () => {
    const ids = getHumanReviewRules().map((r) => r.ruleId);
    expect(ids).toContain("ZR-STOCKS-HOLD-001");
    expect(ids).toContain("ZR-RE-RENTAL-001");
  });
});

describe("الأثر الرقمي للخلاف الفقهي", () => {
  it("يحسب الزكاة وفق كل قول ويقارنها بالمعتمد", () => {
    const rule = getRule("ZR-GOLD-JEWELRY-001")!;
    // حلي بقيمة 100000، باقي الوعاء 50000، المعتمد: لا زكاة في الحلي (factor 0)
    const impacts = computeDivergenceImpact(rule, 100_000, 50_000, 0.025, 0);
    expect(impacts).toHaveLength(2);

    const jumhur = impacts.find((i) => i.madhab === "majority")!;
    expect(jumhur.resultingBase).toBe(50_000);
    expect(jumhur.resultingZakat).toBe(1250);
    expect(jumhur.deltaVsSelected).toBe(0);

    const hanafi = impacts.find((i) => i.madhab === "hanafi")!;
    expect(hanafi.resultingBase).toBe(150_000);
    expect(hanafi.resultingZakat).toBe(3750);
    expect(hanafi.deltaVsSelected).toBe(2500);
  });

  it("يُرجع قائمة فارغة لقاعدة بلا خلاف", () => {
    expect(computeDivergenceImpact(getRule("ZR-CASH-001")!, 1000, 0, 0.025, 1)).toEqual([]);
  });

  it("لا ينتج وعاءً سالباً", () => {
    const rule = getRule("ZR-DEBT-SHORT-001")!;
    const impacts = computeDivergenceImpact(rule, -999_999, 1000, 0.025, 1);
    expect(impacts.every((i) => i.resultingBase >= 0)).toBe(true);
  });

  it("يُرفق نص المصدر مع كل قول", () => {
    const impacts = computeDivergenceImpact(
      getRule("ZR-GOLD-JEWELRY-001")!,
      1000,
      0,
      0.025,
      0,
    );
    expect(impacts.every((i) => i.sourceCitation.length > 5)).toBe(true);
  });
});
