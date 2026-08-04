import { describe, it, expect } from "vitest";
import {
  parseZakatCalcV1,
  validateRulesForInput,
  computeZakatV1,
  runZakatCalcV1,
  canonicalize,
} from "./v1-zakat";

const base = {
  goldPricePerGram24: 80,
  silverPricePerGramPure: 1,
  cashAndBank: 100_000,
  shortTermLiabilities: 10_000,
};

describe("Zakat API v1 — تحقق المدخلات", () => {
  it("يرفض القيم السالبة والحقول المجهولة بأخطاء حقلية", () => {
    const bad = parseZakatCalcV1({ ...base, cashAndBank: -5 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors[0].field).toBe("cashAndBank");

    const unknown = parseZakatCalcV1({ ...base, whatever: 1 });
    expect(unknown.ok).toBe(false);
  });

  it("يطبّق القيم الافتراضية (هجري/فضة/حول مكتمل)", () => {
    const ok = parseZakatCalcV1(base);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.calendar).toBe("hijri");
      expect(ok.data.nisabBasis).toBe("silver");
      expect(ok.data.hawlComplete).toBe(true);
    }
  });

  it("يشترط سعري الذهب والفضة", () => {
    expect(parseZakatCalcV1({ cashAndBank: 1000 }).ok).toBe(false);
  });
});

describe("Zakat API v1 — الحساب", () => {
  it("يحسب الوعاء والزكاة بمعدل 2.5% هجرياً", () => {
    const input = parseZakatCalcV1(base);
    if (!input.ok) throw new Error("invalid");
    const res = computeZakatV1(input.data);
    expect(res.breakdown.netZakatBase).toBe(90_000);
    expect(res.assessment.zakatDue).toBe(2_250);
  });

  it("لا زكاة إذا لم يكتمل الحول", () => {
    const input = parseZakatCalcV1({ ...base, hawlComplete: false });
    if (!input.ok) throw new Error("invalid");
    expect(computeZakatV1(input.data).assessment.zakatDue).toBe(0);
  });

  it("لا زكاة تحت النصاب", () => {
    const input = parseZakatCalcV1({ ...base, cashAndBank: 100, shortTermLiabilities: 0 });
    if (!input.ok) throw new Error("invalid");
    const res = computeZakatV1(input.data);
    expect(res.assessment.reachesNisab).toBe(false);
    expect(res.assessment.zakatDue).toBe(0);
  });
});

describe("Zakat API v1 — تحقق القواعد والاعتماد", () => {
  it("كل بند ذي قيمة تحكمه قاعدة مفعّلة → نتيجة معتمدة", () => {
    const input = parseZakatCalcV1(base);
    if (!input.ok) throw new Error("invalid");
    const rules = validateRulesForInput(input.data);
    expect(rules.catalogIssues).toEqual([]);
    expect(rules.checks.every((c) => c.applied)).toBe(true);
    expect(rules.certified).toBe(true);
  });

  it("حول غير مكتمل → نتيجة مبدئية لا معتمدة", () => {
    const input = parseZakatCalcV1({ ...base, hawlComplete: false });
    if (!input.ok) throw new Error("invalid");
    const rules = validateRulesForInput(input.data);
    expect(rules.certified).toBe(false);
    expect(rules.warnings.join()).toContain("الحول");
  });

  it("قواعد لم يحلّ سريانها بعد → تُحجب وتمنع الاعتماد", () => {
    const input = parseZakatCalcV1(base);
    if (!input.ok) throw new Error("invalid");
    const rules = validateRulesForInput(input.data, new Date("2000-01-01T00:00:00.000Z"));
    expect(rules.certified).toBe(false);
    expect(rules.checks.some((c) => !c.applied)).toBe(true);
  });
});

describe("Zakat API v1 — شهادة النتيجة", () => {
  it("البصمة حتمية لنفس المدخلات ومختلفة عند تغيّرها", async () => {
    const a = await runZakatCalcV1(base, { issuedAt: "2026-01-01T00:00:00.000Z" });
    const b = await runZakatCalcV1(base, { issuedAt: "2026-06-01T00:00:00.000Z" });
    const c = await runZakatCalcV1(
      { ...base, cashAndBank: 100_001 },
      { issuedAt: "2026-01-01T00:00:00.000Z" },
    );
    if (!a.ok || !b.ok || !c.ok) throw new Error("invalid");
    expect(a.payload.certificate.contentHash).toHaveLength(64);
    // وقت الإصدار لا يغيّر البصمة — الأرقام والإصدارات هي المرجع
    expect(b.payload.certificate.contentHash).toBe(a.payload.certificate.contentHash);
    expect(c.payload.certificate.contentHash).not.toBe(a.payload.certificate.contentHash);
    expect(a.payload.certificate.status).toBe("certified");
  });

  it("مدخلات غير صالحة → 422 مع تفاصيل الحقول", async () => {
    const out = await runZakatCalcV1({ cashAndBank: "x" });
    expect(out.status).toBe(422);
    expect(out.payload.status).toBe("error");
  });

  it("التسلسل الحتمي لا يتأثر بترتيب المفاتيح", () => {
    expect(canonicalize({ b: 1, a: [2, { d: 4, c: 3 }] })).toBe(
      canonicalize({ a: [2, { c: 3, d: 4 }], b: 1 }),
    );
  });
});
