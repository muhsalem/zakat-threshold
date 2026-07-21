import { describe, it, expect } from "vitest";
import {
  classifyTrialBalance,
  computeZakatFromTrialBalance,
  GREGORIAN_RATE,
  HIJRI_RATE,
  type TrialBalanceRow,
} from "./zakatMapping";

const ODOO_TB: TrialBalanceRow[] = [
  { code: "1010", name: "Cash on Hand", balance: 100000, erpType: "asset_cash" },
  { code: "1100", name: "Accounts Receivable", balance: 50000, erpType: "asset_receivable" },
  { code: "1200", name: "مخزون البضاعة", balance: 80000, erpType: "asset_current" },
  { code: "1300", name: "Prepaid Rent", balance: 5000, erpType: "asset_prepayments" },
  { code: "1500", name: "Equipment", balance: 200000, erpType: "asset_fixed" },
  { code: "2100", name: "Accounts Payable", balance: -60000, erpType: "liability_payable" },
  { code: "2500", name: "LT Loan", balance: -90000, erpType: "liability_non_current" },
  { code: "3000", name: "Capital", balance: -285000, erpType: "equity" },
];

describe("classifyTrialBalance() — Odoo عبر account_type", () => {
  const rows = classifyTrialBalance(ODOO_TB, "odoo");
  const byCode = Object.fromEntries(rows.map((r) => [r.code, r]));

  it("النقد والذمم من نوع الحساب الرسمي", () => {
    expect(byCode["1010"].category).toBe("cash");
    expect(byCode["1100"].category).toBe("receivables");
  });
  it("asset_current تُنقَّح بالكلمات المفتاحية إلى مخزون", () => {
    expect(byCode["1200"].category).toBe("inventory");
    expect(byCode["1200"].source).toBe("keyword");
  });
  it("الأصول الثابتة والمقدمات غير زكوية", () => {
    expect(byCode["1500"].category).toBe("fixed_assets");
    expect(byCode["1300"].category).toBe("prepayments");
  });
  it("الالتزامات: قصيرة تُخصم وطويلة لا تُخصم", () => {
    expect(byCode["2100"].category).toBe("current_liabilities");
    expect(byCode["2500"].category).toBe("long_term_liabilities");
  });
});

describe("classifyTrialBalance() — SAP عبر الأكواد والكلمات", () => {
  it("يصنف بالكلمة المفتاحية العربية أولاً ثم بنطاق الكود", () => {
    const rows = classifyTrialBalance(
      [
        { code: "100010", name: "الصندوق الرئيسي", balance: 1000 },
        { code: "140000", name: "Raw Materials Store", balance: 2000 },
        { code: "310000", name: "Vendors Domestic", balance: -500 },
        { code: "410000", name: "Revenue Domestic", balance: -9999 },
      ],
      "sap",
    );
    expect(rows[0].category).toBe("cash");
    expect(rows[1].category).toBe("inventory");
    expect(rows[2].category).toBe("current_liabilities");
    expect(rows[3].category).toBe("excluded");
  });

  it("يصنف العملات الرقمية/المشفّرة استثماراً زكوياً لا غير مصنف", () => {
    const rows = classifyTrialBalance(
      [
        { code: "1600", name: "محفظة عملات رقمية", balance: 30000 },
        { code: "1601", name: "Bitcoin Wallet", balance: 20000 },
      ],
      "generic",
    );
    expect(rows[0].category).toBe("investments");
    expect(rows[0].source).toBe("keyword");
    expect(rows[1].category).toBe("investments");
  });
});

describe("classifyTrialBalance() — التجاوزات اليدوية", () => {
  it("التجاوز يتقدم على قاعدة المزوّد", () => {
    const rows = classifyTrialBalance(ODOO_TB, "odoo", { "1300": "cash" });
    const prepaid = rows.find((r) => r.code === "1300")!;
    expect(prepaid.category).toBe("cash");
    expect(prepaid.source).toBe("override");
  });
});

describe("computeZakatFromTrialBalance() — AAOIFI 35", () => {
  const rows = classifyTrialBalance(ODOO_TB, "odoo");

  it("الوعاء = (نقد + ذمم + مخزون) − التزامات قصيرة", () => {
    const c = computeZakatFromTrialBalance(rows);
    // 100000 + 50000 + 80000 = 230000 زكوي − 60000 خصوم قصيرة = 170000
    expect(c.zakatableAssets).toBe(230000);
    expect(c.deductibleLiabilities).toBe(60000);
    expect(c.zakatBase).toBe(170000);
  });

  it("الزكاة الهجرية 2.5%", () => {
    const c = computeZakatFromTrialBalance(rows, { calendar: "hijri" });
    expect(c.rate).toBe(HIJRI_RATE);
    expect(c.zakatDue).toBe(+(170000 * 0.025).toFixed(2));
  });

  it("الزكاة الميلادية 2.577%", () => {
    const c = computeZakatFromTrialBalance(rows, { calendar: "gregorian" });
    expect(c.rate).toBe(GREGORIAN_RATE);
    expect(c.zakatDue).toBe(+(170000 * 0.02577).toFixed(2));
  });

  it("دون النصاب → لا زكاة", () => {
    const c = computeZakatFromTrialBalance(rows, { nisab: 999999 });
    expect(c.eligible).toBe(false);
    expect(c.zakatDue).toBe(0);
  });

  it("الوعاء لا يكون سالباً عند تضخم الالتزامات", () => {
    const heavy = classifyTrialBalance(
      [
        { code: "1010", name: "Cash", balance: 1000, erpType: "asset_cash" },
        { code: "2100", name: "Payables", balance: -50000, erpType: "liability_payable" },
      ],
      "odoo",
    );
    const c = computeZakatFromTrialBalance(heavy);
    expect(c.zakatBase).toBe(0);
    expect(c.zakatDue).toBe(0);
  });

  it("الأرصدة المعاكسة لا تشوّه الوعاء (contra accounts)", () => {
    const contra = classifyTrialBalance(
      [
        { code: "1010", name: "Cash", balance: 10000, erpType: "asset_cash" },
        // بنك مكشوف: أصل نقدي برصيد دائن — يجب ألا يضاف موجباً
        { code: "1020", name: "Bank Overdraft", balance: -3000, erpType: "asset_cash" },
      ],
      "odoo",
    );
    const c = computeZakatFromTrialBalance(contra);
    expect(c.zakatableAssets).toBe(10000);
  });
});
