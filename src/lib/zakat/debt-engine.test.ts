import { describe, it, expect } from "vitest";
import { runDebtEngine, type DebtInput } from "./debt-engine";

const payables: DebtInput[] = [
  { id: "1", label: "موردون", type: "trade_payable", amount: 50_000 },
  { id: "2", label: "قرض طويل", type: "long_term_loan", amount: 400_000, dueWithinHawl: 60_000 },
  { id: "3", label: "جاري الشركاء", type: "shareholder_loan", amount: 90_000 },
];

describe("Debt Engine — الالتزامات", () => {
  it("يخصم الالتزامات التشغيلية بالكامل", () => {
    const r = runDebtEngine([payables[0]]);
    expect(r.lines[0].treatment).toBe("deduct_full");
    expect(r.totalDeductible).toBe(50_000);
  });

  it("يخصم القسط المستحق فقط من القرض طويل الأجل", () => {
    const r = runDebtEngine([payables[1]]);
    expect(r.lines[0].treatment).toBe("deduct_due_portion");
    expect(r.totalDeductible).toBe(60_000);
  });

  it("لا يخصم القرض طويل الأجل بلا قسط مصرَّح به", () => {
    const r = runDebtEngine([payables[2]]);
    expect(r.lines[0].treatment).toBe("no_effect");
    expect(r.totalDeductible).toBe(0);
  });

  it("لا يفترض خصم كل الديون تلقائياً", () => {
    const r = runDebtEngine(payables);
    // 50k + 60k فقط، وليس 540k
    expect(r.totalDeductible).toBe(110_000);
    expect(r.netBaseEffect).toBe(-110_000);
  });

  it("منهجية الخصم الكامل تخصم كل الأرصدة", () => {
    const r = runDebtEngine(payables, "full-deduction");
    expect(r.totalDeductible).toBe(540_000);
    expect(r.lines.every((l) => l.treatment === "deduct_full")).toBe(true);
  });

  it("منهجية عدم الخصم تُلغي أثر الديون", () => {
    const r = runDebtEngine(payables, "no-deduction");
    expect(r.totalDeductible).toBe(0);
    expect(r.netBaseEffect).toBe(0);
  });
});

describe("Debt Engine — الذمم المدينة", () => {
  it("يضيف الدين المرجو للوعاء", () => {
    const r = runDebtEngine([
      { id: "r1", label: "عملاء", type: "trade_receivable", amount: 30_000 },
    ]);
    expect(r.lines[0].treatment).toBe("add_full");
    expect(r.totalAddable).toBe(30_000);
  });

  it("يؤجّل الدين المشكوك فيه حتى القبض", () => {
    const r = runDebtEngine([
      { id: "r2", label: "ديون متعثرة", type: "doubtful_receivable", amount: 20_000 },
    ]);
    expect(r.lines[0].treatment).toBe("defer_until_received");
    expect(r.totalAddable).toBe(0);
    expect(r.totalDeferred).toBe(20_000);
  });

  it("يحترم علم التحصيل الصريح", () => {
    const r = runDebtEngine([
      { id: "r3", label: "عملاء", type: "trade_receivable", amount: 10_000, collectible: false },
    ]);
    expect(r.lines[0].treatment).toBe("defer_until_received");
  });
});

describe("Debt Engine — الحواف", () => {
  it("يتعامل مع قائمة فارغة", () => {
    const r = runDebtEngine([]);
    expect(r.netBaseEffect).toBe(0);
    expect(r.lines).toEqual([]);
  });

  it("يقصّ القسط المستحق عند تجاوزه الرصيد", () => {
    const r = runDebtEngine([
      { id: "x", label: "قرض", type: "long_term_loan", amount: 1000, dueWithinHawl: 5000 },
    ]);
    expect(r.totalDeductible).toBe(1000);
  });

  it("يتجاهل المبالغ السالبة", () => {
    const r = runDebtEngine([{ id: "y", label: "خطأ", type: "trade_payable", amount: -500 }]);
    expect(r.totalDeductible).toBe(0);
  });

  it("كل سطر يحمل معرّف قاعدة وتعليلاً", () => {
    const r = runDebtEngine(payables);
    expect(r.lines.every((l) => l.ruleId.startsWith("ZR-") && l.rationale.length > 10)).toBe(true);
  });
});
