import { describe, it, expect } from "vitest";
import { buildExceptionsQueue } from "./exceptionsQueue";
import type { ClassifiedRow } from "./zakatMapping";

const rows: ClassifiedRow[] = [
  { code: "1010", name: "الصندوق", balance: 100_000, category: "cash", source: "provider_rule" },
  { code: "1210", name: "عملاء", balance: 200_000, category: "receivables", source: "keyword" },
  { code: "9999", name: "حساب وسيط", balance: 80_000, category: "excluded", source: "default" },
  {
    code: "1510",
    name: "محفظة أسهم",
    balance: 150_000,
    category: "investments",
    source: "keyword",
  },
  {
    code: "3110",
    name: "موردون",
    balance: -120_000,
    category: "current_liabilities",
    source: "provider_rule",
  },
];

describe("طابور الاستثناءات", () => {
  it("يرفع الحسابات غير المصنَّفة كاستثناء حاجب", () => {
    const q = buildExceptionsQueue(rows);
    const unclassified = q.items.find((i) => i.reason === "unclassified");
    expect(unclassified?.code).toBe("9999");
    expect(unclassified?.severity).toBe("blocking");
  });

  it("يمنع الاعتماد عند وجود استثناء حاجب", () => {
    expect(buildExceptionsQueue(rows).canApprove).toBe(false);
  });

  it("يسمح بالاعتماد عند خلو الميزان من الاستثناءات الحاجبة", () => {
    const clean: ClassifiedRow[] = [
      { code: "1010", name: "الصندوق", balance: 100_000, category: "cash", source: "provider_rule" },
      {
        code: "3110",
        name: "موردون",
        balance: -50_000,
        category: "current_liabilities",
        source: "provider_rule",
      },
    ];
    const q = buildExceptionsQueue(clean);
    expect(q.canApprove).toBe(true);
    expect(q.blockingCount).toBe(0);
  });

  it("يحجب التصنيف بالكلمات المفتاحية للمبالغ الجوهرية", () => {
    const q = buildExceptionsQueue(rows);
    expect(q.items.some((i) => i.reason === "low_confidence" && i.code === "1210")).toBe(true);
  });

  it("يستوجب بتّاً شرعياً لفئة الاستثمارات", () => {
    const q = buildExceptionsQueue(rows);
    const sharia = q.items.find((i) => i.reason === "requires_sharia_review");
    expect(sharia?.code).toBe("1510");
    expect(sharia?.severity).toBe("blocking");
  });

  it("يكشف إشارة الرصيد المخالفة لطبيعة الحساب", () => {
    const q = buildExceptionsQueue([
      { code: "1010", name: "الصندوق", balance: -5000, category: "cash", source: "provider_rule" },
    ]);
    expect(q.items.some((i) => i.reason === "sign_anomaly")).toBe(true);
  });

  it("ينبّه على المبالغ الجوهرية المستبعدة من الوعاء", () => {
    const q = buildExceptionsQueue([
      {
        code: "1610",
        name: "مباني",
        balance: 900_000,
        category: "fixed_assets",
        source: "provider_rule",
      },
      { code: "1010", name: "الصندوق", balance: 1000, category: "cash", source: "provider_rule" },
    ]);
    expect(q.items.some((i) => i.reason === "material_excluded")).toBe(true);
  });

  it("يحسب المبلغ المتأثر بالاستثناءات", () => {
    const q = buildExceptionsQueue(rows);
    expect(q.affectedAmount).toBeGreaterThan(0);
  });

  it("يتعامل مع ميزان فارغ", () => {
    const q = buildExceptionsQueue([]);
    expect(q.items).toEqual([]);
    expect(q.canApprove).toBe(true);
  });
});
