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

const TODAY = new Date("2026-01-01T00:00:00Z");
const iso = (monthsAhead: number) =>
  new Date(TODAY.getTime() + monthsAhead * 30.4375 * 86400000).toISOString().slice(0, 10);

describe("Prepaid Expenses — تاريخ التحصيل والمدة", () => {
  it("المسترد المتوقع تحصيله داخل الحول يُضاف للوعاء", () => {
    const r = runPrepaidExpenses(
      [{ id: "a", label: "تأمين مسترد", unusedBalance: 10_000, recoverability: "refundable", expectedDurationMonths: 6 }],
      "aaoifi-35",
      TODAY,
    );
    expect(r.lines[0].treatment).toBe("add_full");
    expect(r.lines[0].beyondHawl).toBe(false);
    expect(r.netBaseEffect).toBe(10_000);
  });

  it("المسترد بعد أكثر من 12 شهراً يُؤجَّل حتى القبض", () => {
    const r = runPrepaidExpenses(
      [{ id: "a", label: "دفعة مورد", unusedBalance: 10_000, recoverability: "refundable", expectedDurationMonths: 24 }],
      "aaoifi-35",
      TODAY,
    );
    expect(r.lines[0].ruleId).toBe("ZR-PPE-011");
    expect(r.totalDeferred).toBe(10_000);
    expect(r.netBaseEffect).toBe(0);
  });

  it("يشتق المدة من تاريخ التحصيل عند غياب عدد الأشهر", () => {
    const r = runPrepaidExpenses(
      [{ id: "a", label: "دفعة", unusedBalance: 5_000, recoverability: "refundable", expectedRecoveryDate: iso(18) }],
      "aaoifi-35",
      TODAY,
    );
    expect(r.lines[0].beyondHawl).toBe(true);
    expect(r.totalDeferred).toBe(5_000);
  });

  it("تغيّر الفترة بين الأعوام يقلب المعالجة من تأجيل إلى إضافة", () => {
    const item: PrepaidExpenseInput = {
      id: "a",
      label: "دفعة",
      unusedBalance: 8_000,
      recoverability: "refundable",
      expectedRecoveryDate: iso(18),
    };
    const y1 = runPrepaidExpenses([item], "aaoifi-35", TODAY);
    const y2 = runPrepaidExpenses([item], "aaoifi-35", new Date("2027-01-01T00:00:00Z"));
    expect(y1.totalDeferred).toBe(8_000);
    expect(y2.totalAddable).toBe(8_000);
  });
});

describe("Prepaid Expenses — التحقق من التعارض", () => {
  it("يمنع منفعة غير مستردّة مع تاريخ تحصيل", () => {
    const r = runPrepaidExpenses(
      [{ id: "a", label: "إيجار", unusedBalance: 1_000, recoverability: "service_only", expectedRecoveryDate: iso(3) }],
      "aaoifi-35",
      TODAY,
    );
    expect(r.issues.some((i) => i.code === "PPE-V-010" && i.level === "error")).toBe(true);
  });

  it("ينبّه على المسترد بلا تاريخ ولا مدة", () => {
    const r = runPrepaidExpenses(
      [{ id: "a", label: "تأمين", unusedBalance: 1_000, recoverability: "refundable" }],
      "aaoifi-35",
      TODAY,
    );
    expect(r.issues.some((i) => i.code === "PPE-V-011")).toBe(true);
  });

  it("ينبّه على تاريخ تحصيل فائت", () => {
    const r = runPrepaidExpenses(
      [{ id: "a", label: "دفعة", unusedBalance: 1_000, recoverability: "refundable", expectedDurationMonths: -4 }],
      "aaoifi-35",
      TODAY,
    );
    expect(r.issues.some((i) => i.code === "PPE-V-012")).toBe(true);
  });

  it("ينبّه على مشكوك فيه رغم تحصيل وشيك", () => {
    const r = runPrepaidExpenses(
      [{ id: "a", label: "نزاع", unusedBalance: 1_000, recoverability: "doubtful", expectedDurationMonths: 2 }],
      "aaoifi-35",
      TODAY,
    );
    expect(r.issues.some((i) => i.code === "PPE-V-013")).toBe(true);
  });

  it("يرفض المدة خارج النطاق والتاريخ غير الصالح", () => {
    const r = runPrepaidExpenses(
      [
        { id: "a", label: "x", unusedBalance: 1, recoverability: "refundable", expectedDurationMonths: 900 },
        { id: "b", label: "y", unusedBalance: 1, recoverability: "refundable", expectedRecoveryDate: "غير-تاريخ" },
      ],
      "aaoifi-35",
      TODAY,
    );
    expect(r.issues.some((i) => i.code === "PPE-V-002")).toBe(true);
    expect(r.issues.some((i) => i.code === "PPE-V-003")).toBe(true);
  });
});

describe("Prepaid Expenses — حواف القيم", () => {
  it("القيم الصفرية لا تغيّر الوعاء", () => {
    const r = runPrepaidExpenses(
      [{ id: "a", label: "صفر", unusedBalance: 0, recoverability: "refundable", expectedDurationMonths: 1 }],
      "aaoifi-35",
      TODAY,
    );
    expect(r.netBaseEffect).toBe(0);
    expect(r.totalBalances).toBe(0);
  });

  it("القيم السالبة الكبيرة تُصفَّر ويُرفع خطأ", () => {
    const r = runPrepaidExpenses(
      [{ id: "a", label: "خطأ", unusedBalance: -9_999_999_999, recoverability: "refundable", expectedDurationMonths: 3 }],
      "aaoifi-35",
      TODAY,
    );
    expect(r.netBaseEffect).toBe(0);
    expect(r.totalBalances).toBe(0);
    expect(r.issues.some((i) => i.code === "PPE-V-001" && i.level === "error")).toBe(true);
  });

  it("القيم غير الرقمية (NaN/Infinity) تُصفَّر", () => {
    const r = runPrepaidExpenses(
      [
        { id: "a", label: "n", unusedBalance: Number.NaN, recoverability: "refundable", expectedDurationMonths: 1 },
        { id: "b", label: "i", unusedBalance: Number.POSITIVE_INFINITY, recoverability: "refundable", expectedDurationMonths: 1 },
      ],
      "aaoifi-35",
      TODAY,
    );
    expect(r.totalBalances).toBe(0);
  });

  it("إجمالي الأرصدة يساوي مجموع الفئات الثلاث", () => {
    const r = runPrepaidExpenses(items, "aaoifi-35", TODAY);
    expect(r.totalBalances).toBe(r.totalAddable + r.totalDeferred + r.totalIgnored);
  });
});
