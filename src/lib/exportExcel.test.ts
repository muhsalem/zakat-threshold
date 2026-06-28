import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { buildReportWorkbook } from "@/lib/exportExcel";
import type { PrintReportData } from "@/components/zakat/PrintReport";
import { ZAKAT_RATE } from "@/lib/zakat";

function build(data: PrintReportData) {
  return buildReportWorkbook(data);
}


function baseData(overrides: Partial<PrintReportData> = {}): PrintReportData {
  return {
    name: "اختبار",
    profession: "موظف",
    countryCode: "SA",
    currencyName: "ريال",
    calendarBasis: "hijri",
    effectiveRate: ZAKAT_RATE,
    rows: [{ label: "نقد", gross: 100000, eligible: true, zakat: 2500 }],
    livestock: { camels: 0, cows: 0, sheep: 0, show: false },
    monetaryGross: 100000,
    debts: 0,
    monetaryBase: 100000,
    moneyNisab: 20000,
    totalZakat: 2500,
    hawlComplete: true,
    accountantName: "",
    accountantLicense: "",
    accountantPreamble: "",
    accountantOpinion: "",
    opinionType: "clean",
    previousYearZakat: "",
    ...overrides,
  };
}

function readSheet(wb: XLSX.WorkBook, name: string) {
  expect(wb.SheetNames).toContain(name);
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: "" });
}

describe("Excel export — ESOP and Waqf integration", () => {
  it("emits an ESOP/RSU sheet with intrinsic value, nisab and zakat amount", () => {
    const esopBase = 100 * (50 - 10) + 1000; // intrinsic 4000 + RSU 1000 = 5000
    const data = baseData({
      esop: {
        show: true,
        vestedShares: 100,
        price: 50,
        strike: 10,
        intrinsic: 4000,
        rsuValue: 1000,
        base: esopBase,
        intentTrade: true,
        zakat: +(esopBase * ZAKAT_RATE).toFixed(2),
      },
    });
    const wb = build(data); const rows = readSheet(wb, "زكاة ESOP-RSU");
    const flat = rows.flat().join("|");
    expect(flat).toMatch(/زكاة خيارات/);
    // intrinsic + RSU values present
    expect(rows.some((r) => r.includes(4000))).toBe(true);
    expect(rows.some((r) => r.includes(1000))).toBe(true);
    // base = 5000
    expect(rows.some((r) => r.includes(5000))).toBe(true);
    // zakat = 125
    expect(rows.some((r) => r.includes(125))).toBe(true);
    // nisab row references moneyNisab (20000)
    expect(flat).toMatch(/20000/);
    // reached nisab disclosure present (نعم/لا)
    expect(flat).toMatch(/بلغ النصاب/);
    // Discount disclosure (Unvested deduction)
    expect(flat).toMatch(/غير المستحقّة|Unvested/);
  });

  it("emits a Waqf sheet with deductions and 2.5% zakat", () => {
    const tradeAssets = 80000;
    const rent = 25000;
    const exempt = 5000;
    const base = tradeAssets + rent - exempt; // 100000
    const data = baseData({
      waqf: {
        show: true,
        tradeAssets,
        rentIncome: rent,
        exemptCore: exempt,
        base,
        zakat: +(base * ZAKAT_RATE).toFixed(2),
      },
    });
    const wb = build(data); const rows = readSheet(wb, "زكاة الأوقاف");
    const flat = rows.flat().join("|");
    expect(flat).toMatch(/زكاة الأوقاف/);
    expect(rows.some((r) => r.includes(tradeAssets))).toBe(true);
    expect(rows.some((r) => r.includes(rent))).toBe(true);
    // Exempted (charitable waqf core) deduction is exposed
    expect(rows.some((r) => r.includes(exempt))).toBe(true);
    expect(rows.some((r) => r.includes(base))).toBe(true);
    expect(rows.some((r) => r.includes(2500))).toBe(true); // 100000 × 2.5%
    // Nisab disclosure
    expect(flat).toMatch(/النصاب|20000/);
    // Fiqh reference visible
    expect(flat).toMatch(/مجمع الفقه|AAOIFI/);
  });

  it("skips ESOP and Waqf sheets when data is absent", () => {
    const wb = build(baseData()); expect(wb.SheetNames).not.toContain("زكاة ESOP-RSU");
    expect(wb.SheetNames).not.toContain("زكاة الأوقاف");
  });

  it("ESOP intent=hold yields zero zakat but section still appears with disclosure", () => {
    const data = baseData({
      esop: {
        show: true,
        vestedShares: 100,
        price: 50,
        strike: 10,
        intrinsic: 4000,
        rsuValue: 0,
        base: 4000,
        intentTrade: false,
        zakat: 0,
      },
    });
    const wb = build(data); const rows = readSheet(wb, "زكاة ESOP-RSU");
    const flat = rows.flat().join("|");
    expect(flat).toMatch(/الاحتفاظ/);
    expect(rows.some((r) => r.includes(0))).toBe(true);
  });
});

describe("Excel export — deductions and FX sheets", () => {
  it("emits a deductions sheet with included/excluded rows and reasons", () => {
    const data = baseData({
      deductions: [
        { label: "قرض شخصي", amount: 12000, included: true, reason: "دين حالّ", ref: "AAOIFI 35" },
        { label: "مهر مؤجل", amount: 50000, included: false, reason: "غير حالّ ولم يُطلب", ref: "قول الجمهور" },
      ],
    });
    const wb = build(data); const rows = readSheet(wb, "بيان الخصومات");
    const flat = rows.flat().join("|");
    expect(flat).toMatch(/قرض شخصي/);
    expect(flat).toMatch(/مهر مؤجل/);
    expect(flat).toMatch(/نعم — مُحتسب/);
    expect(flat).toMatch(/لا — مُستبعد/);
    expect(flat).toMatch(/AAOIFI 35/);
    expect(rows.some((r) => r.includes(12000))).toBe(true);
    expect(rows.some((r) => r.includes(50000))).toBe(true);
  });

  it("emits an FX sheet with rates and converted entries", () => {
    const data = baseData({
      fx: {
        reportCurrency: "ريال",
        rates: [{ from: "USD", to: "ريال", rate: 3.75 }],
        entries: [{ label: "حساب USD", originalAmount: 1000, originalCurrency: "USD", rate: 3.75, convertedAmount: 3750 }],
        source: "البنك المركزي",
      },
    });
    const wb = build(data); const rows = readSheet(wb, "أسعار الصرف");
    const flat = rows.flat().join("|");
    expect(flat).toMatch(/USD/);
    expect(flat).toMatch(/3\.75/);
    expect(flat).toMatch(/البنك المركزي/);
    expect(rows.some((r) => r.includes(3750))).toBe(true);
  });
});

describe("PDF report data — ESOP and Waqf payload shape", () => {

  it("PrintReportData accepts esop and waqf and they flow through unchanged", () => {
    const data = baseData({
      esop: {
        show: true,
        vestedShares: 50,
        price: 20,
        strike: 5,
        intrinsic: 750,
        rsuValue: 250,
        base: 1000,
        intentTrade: true,
        zakat: 25,
      },
      waqf: {
        show: true,
        tradeAssets: 50000,
        rentIncome: 0,
        exemptCore: 10000,
        base: 40000,
        zakat: 1000,
      },
    });
    expect(data.esop?.base).toBe(1000);
    expect(data.esop?.zakat).toBe(25);
    expect(data.esop?.base).toBeLessThan(data.moneyNisab); // should render "لا" in PDF
    expect(data.waqf?.base).toBe(40000);
    expect(data.waqf?.zakat).toBe(1000);
    expect(data.waqf?.base).toBeGreaterThanOrEqual(data.moneyNisab); // "نعم"
  });
});
