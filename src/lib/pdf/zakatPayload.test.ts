import { describe, it, expect } from "vitest";
import { buildZakatReportPayload, type ZakatPdfInput } from "./zakatPayload";

const base: ZakatPdfInput = {
  entity: "individual",
  name: "أحمد",
  currencyName: "EGP",
  calendarBasis: "hijri",
  effectiveRate: 0.025,
  rows: [
    { label: "زكاة الذهب", gross: 100000, nisab: 50000, eligible: true, zakat: 2500 },
    { label: "زكاة الفضة", gross: 1000, nisab: 5000, eligible: false, zakat: 0 },
  ],
  monetaryGross: 101000,
  debts: 1000,
  monetaryBase: 100000,
  moneyNisab: 50000,
  totalZakat: 2500,
  goldPricePerGram: 4000,
  deductions: [
    { label: "قرض شخصي", amount: 1000, included: true, reason: "دين حالّ", ref: "AAOIFI 35 §6" },
    { label: "رهن عقاري", amount: 500000, included: false, reason: "دين مؤجل طويل الأجل" },
  ],
};

describe("buildZakatReportPayload", () => {
  it("يبني الخطوات والنتائج بالعملة الصحيحة", () => {
    const p = buildZakatReportPayload(base);
    expect(p.calc_steps).toHaveLength(6);
    expect(p.results.at(-1)).toMatchObject({ emphasize: true });
    expect(p.results.at(-1)?.value).toContain("EGP");
  });

  it("يوثّق مصادر الأسعار والمنهجية", () => {
    const p = buildZakatReportPayload({
      ...base,
      fx: { reportCurrency: "EGP", rates: [{ from: "USD", rate: 48 }], source: "إدخال يدوي" },
    });
    expect(p.sources?.some((s) => s.label.includes("الذهب"))).toBe(true);
    expect(p.sources?.some((s) => s.label.includes("USD"))).toBe(true);
  });

  it("يستخرج الاستثناءات للبنود التي لم تبلغ النصاب والخصوم المرفوضة", () => {
    const p = buildZakatReportPayload(base);
    const codes = p.exceptions?.map((e) => e.code) ?? [];
    expect(codes).toContain("NISAB-NOT-REACHED");
    expect(codes).toContain("DEDUCTION-REJECTED");
  });

  it("يضيف استثناء عدم اكتمال الحول والوعاء السالب", () => {
    const p = buildZakatReportPayload({
      ...base,
      hawlComplete: false,
      monetaryBase: -100,
    });
    const codes = p.exceptions?.map((e) => e.code) ?? [];
    expect(codes).toContain("HAWL-INCOMPLETE");
    expect(codes).toContain("NEGATIVE-BASE");
  });

  it("لا يكرّر المراجع الشرعية", () => {
    const p = buildZakatReportPayload(base);
    const refs = p.sharia_refs.map((r) => r.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it("يعنون تقرير الشركات بالطريقة المختارة", () => {
    const p = buildZakatReportPayload({ ...base, entity: "company", method: "صافي الأصول" });
    expect(p.inputs.some((i) => i.value === "صافي الأصول")).toBe(true);
    expect(p.sources[0]?.value).toContain("صافي الأصول");
  });
});
