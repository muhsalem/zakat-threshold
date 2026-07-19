import { describe, it, expect } from "vitest";
import { runShariaComplianceReview } from "./shariaAudit";
import {
  classifyTrialBalance,
  computeZakatFromTrialBalance,
  type TrialBalanceRow,
} from "./erp/zakatMapping";

const CLEAN_TB: TrialBalanceRow[] = [
  { code: "1010", name: "النقد بالصندوق", balance: 100000 },
  { code: "1100", name: "ذمم مدينة - عملاء", balance: 50000 },
  { code: "1200", name: "مخزون بضاعة", balance: 80000 },
  { code: "2100", name: "موردون - ذمم دائنة", balance: -60000 },
];

function review(
  tb: TrialBalanceRow[],
  opts: { nisab?: number; totals?: { debit: number; credit: number } } = {},
) {
  const rows = classifyTrialBalance(tb, "generic");
  const calc = computeZakatFromTrialBalance(rows, { nisab: opts.nisab ?? 85000, calendar: "hijri" });
  return runShariaComplianceReview({
    rows,
    computation: calc,
    totals: opts.totals,
    hawlComplete: null,
    calendar: "hijri",
  });
}

describe("runShariaComplianceReview() — المراجعة الشرعية الشاملة", () => {
  it("ميزان نظيف: لا مخالفات ودرجة مرتفعة", () => {
    const r = review(CLEAN_TB);
    expect(r.counts.violation).toBe(0);
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.grade).toBe("ممتاز");
    expect(r.findings.find((f) => f.id === "riba_clear")).toBeTruthy();
  });

  it("يكشف البنود الربوية ويوجب التطهير", () => {
    const r = review([...CLEAN_TB, { code: "4200", name: "فوائد بنكية دائنة", balance: -5000 }]);
    const riba = r.findings.find((f) => f.id === "riba_detected");
    expect(riba).toBeTruthy();
    expect(riba!.severity).toBe("violation");
    expect(riba!.detail).toContain("التطهير");
    expect(r.counts.violation).toBeGreaterThanOrEqual(1);
    expect(r.grade).not.toBe("ممتاز");
  });

  it("يكشف الأنشطة المحرمة", () => {
    const r = review([...CLEAN_TB, { code: "5100", name: "مشتريات تبغ وسجائر", balance: 20000 }]);
    const h = r.findings.find((f) => f.id === "haram_activity");
    expect(h).toBeTruthy();
    expect(h!.severity).toBe("violation");
  });

  it("يرصد اختلال توازن الميزان كمخالفة حوكمة", () => {
    const r = review(CLEAN_TB, { totals: { debit: 230000, credit: 100000 } });
    expect(r.findings.find((f) => f.id === "balance_broken")?.severity).toBe("violation");
  });

  it("يوثق توازن الميزان عند تساوي الطرفين", () => {
    const r = review(CLEAN_TB, { totals: { debit: 230000, credit: 230000 } });
    expect(r.findings.find((f) => f.id === "balance_ok")?.severity).toBe("pass");
  });

  it("امتثال: الأصول الثابتة مستبعدة والمعدل صحيح والنصاب مفحوص", () => {
    const r = review(CLEAN_TB);
    expect(r.findings.find((f) => f.id === "fixed_assets_excluded")?.severity).toBe("pass");
    expect(r.findings.find((f) => f.id === "rate_correct")?.severity).toBe("pass");
    expect(r.findings.find((f) => f.id === "nisab_checked")?.severity).toBe("pass");
  });

  it("حوكمة: غياب النصاب يولّد تنبيهاً", () => {
    const r = review(CLEAN_TB, { nisab: 0 });
    expect(r.findings.find((f) => f.id === "nisab_missing")?.severity).toBe("warning");
  });

  it("حوكمة: نسبة عالية من الحسابات غير المصنفة تولّد تنبيهاً", () => {
    const messy: TrialBalanceRow[] = [
      { code: "1", name: "غامض أ", balance: 1000 },
      { code: "2", name: "غامض ب", balance: 2000 },
      { code: "3", name: "غامض ج", balance: 3000 },
      { code: "1010", name: "نقد", balance: 500 },
    ];
    const r = review(messy);
    const f = r.findings.find((x) => x.id === "unclassified_high");
    expect(f?.severity).toBe("warning");
    expect(f?.accounts?.length).toBeGreaterThan(0);
  });

  it("كل نتيجة تحمل مرجعاً شرعياً/معيارياً", () => {
    const r = review(CLEAN_TB);
    for (const f of r.findings) expect(f.reference.length).toBeGreaterThan(3);
  });
});
