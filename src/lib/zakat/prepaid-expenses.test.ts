import { describe, it, expect } from "vitest";
import {
  runPrepaidExpenses,
  PREPAID_PRESETS,
  type PrepaidExpenseInput,
} from "./prepaid-expenses";

const items: PrepaidExpenseInput[] = [
  { id: "1", label: "إيجار مقدم", unusedBalance: 24_000, recoverability: "service_only" },
  { id: "2", label: "تأمينات مستردّة", unusedBalance: 15_000, recoverability: "refundable" },
  { id: "3", label: "دفعة متنازع عليها", unusedBalance: 9_000, recoverability: "doubtful" },
];

describe("Prepaid Expenses — المصروفات المدفوعة مقدماً", () => {
  it("يضيف الأرصدة القابلة للاسترداد للوعاء", () => {
    const r = runPrepaidExpenses([items[1]]);
    expect(r.lines[0].treatment).toBe("add_full");
    expect(r.totalAddable).toBe(15_000);
    expect(r.netBaseEffect).toBe(15_000);
  });

  it("لا يضيف المنافع غير المستردّة", () => {
    const r = runPrepaidExpenses([items[0]]);
    expect(r.lines[0].treatment).toBe("no_effect");
    expect(r.totalAddable).toBe(0);
    expect(r.totalIgnored).toBe(24_000);
  });

  it("يؤجّل المشكوك في استرداده حتى القبض", () => {
    const r = runPrepaidExpenses([items[2]]);
    expect(r.lines[0].treatment).toBe("defer_until_received");
    expect(r.totalDeferred).toBe(9_000);
    expect(r.netBaseEffect).toBe(0);
  });

  it("لا يفترض إضافة كل الأرصدة تلقائياً", () => {
    const r = runPrepaidExpenses(items);
    expect(r.totalAddable).toBe(15_000);
    expect(r.totalIgnored).toBe(24_000);
    expect(r.totalDeferred).toBe(9_000);
  });

  it("منهجية الاحتياط تضيف كل الأرصدة", () => {
    const r = runPrepaidExpenses(items, "all-assets");
    expect(r.totalAddable).toBe(48_000);
    expect(r.lines.every((l) => l.treatment === "add_full")).toBe(true);
  });

  it("منهجية عدم الإضافة تُلغي الأثر", () => {
    const r = runPrepaidExpenses(items, "none");
    expect(r.netBaseEffect).toBe(0);
    expect(r.totalIgnored).toBe(48_000);
  });
});

describe("Prepaid Expenses — الحواف والتوثيق", () => {
  it("يتعامل مع قائمة فارغة", () => {
    const r = runPrepaidExpenses([]);
    expect(r.netBaseEffect).toBe(0);
    expect(r.lines).toEqual([]);
  });

  it("يتجاهل المبالغ السالبة", () => {
    const r = runPrepaidExpenses([
      { id: "x", label: "خطأ", unusedBalance: -1000, recoverability: "refundable" },
    ]);
    expect(r.totalAddable).toBe(0);
  });

  it("كل سطر يحمل معرّف قاعدة وتعليلاً", () => {
    const r = runPrepaidExpenses(items);
    expect(r.lines.every((l) => l.ruleId.startsWith("ZR-PPE-") && l.rationale.length > 10)).toBe(
      true,
    );
  });

  it("القوالب الجاهزة تغطي الأفراد والشركات", () => {
    expect(PREPAID_PRESETS.some((p) => p.scope === "individual" || p.scope === "both")).toBe(true);
    expect(PREPAID_PRESETS.some((p) => p.scope === "company" || p.scope === "both")).toBe(true);
    expect(new Set(PREPAID_PRESETS.map((p) => p.key)).size).toBe(PREPAID_PRESETS.length);
  });
});
