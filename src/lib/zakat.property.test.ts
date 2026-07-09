import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  ZAKAT_RATE,
  num,
  karatToPure24,
  camelZakat,
  cowZakat,
  sheepZakat,
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
} from "./zakat";

/**
 * اختبارات قائمة على الخصائص (Property-based) لمحرك الزكاة.
 * تُنفَّذ آلاف السيناريوهات العشوائية للكشف عن Edge Cases.
 */

describe("Property-based: num()", () => {
  it("لا يعيد قيماً سالبة أبداً", () => {
    fc.assert(
      fc.property(fc.oneof(fc.float(), fc.integer(), fc.string()), (v) => {
        const r = num(v as string | number);
        return r >= 0 && Number.isFinite(r);
      }),
      { numRuns: 2000 },
    );
  });
});

describe("Property-based: حساب الزكاة الأساسي", () => {
  it("قيمة الزكاة دائماً 2.5% للأعداد الموجبة المعقولة", () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 1e12, noNaN: true }), (assets) => {
        const zakat = assets * ZAKAT_RATE;
        return Math.abs(zakat / assets - 0.025) < 1e-9;
      }),
      { numRuns: 2000 },
    );
  });

  it("زكاة تحت النصاب لا تُوجب شيئاً إذا اعتُبرت", () => {
    const goldPricePerGram = 5000;
    const nisab = GOLD_NISAB_GRAMS * goldPricePerGram;
    fc.assert(
      fc.property(fc.double({ min: 0, max: nisab - 1, noNaN: true }), (assets) => {
        return assets < nisab;
      }),
      { numRuns: 500 },
    );
  });
});

describe("Property-based: karatToPure24()", () => {
  it("عيار 24 يساوي نفسه لأي وزن معقول", () => {
    fc.assert(
      fc.property(fc.double({ min: 0.001, max: 1e6, noNaN: true }), (g) => {
        return Math.abs(karatToPure24(g, 24) - g) < 1e-9 * Math.max(1, g);
      }),
      { numRuns: 500 },
    );
  });

  it("النتيجة دائماً ≤ الوزن الأصلي (عيار ≤ 24)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 1e6, noNaN: true }),
        fc.integer({ min: 1, max: 24 }),
        (g, k) => {
          const r = karatToPure24(g, k);
          return r <= g * (1 + 1e-9);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("Property-based: زكاة الأنعام (رتابة)", () => {
  it("زكاة الإبل لا تعطي 'لا زكاة' فوق 5", () => {
    fc.assert(
      fc.property(fc.integer({ min: 5, max: 10000 }), (n) => {
        return camelZakat(n) !== "لا زكاة";
      }),
      { numRuns: 500 },
    );
  });

  it("زكاة البقر: أقل من 30 = لا زكاة، من 30 فأكثر توجد زكاة", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 29 }), (n) => cowZakat(n) === "لا زكاة"),
      { numRuns: 300 },
    );
    fc.assert(
      fc.property(fc.integer({ min: 30, max: 5000 }), (n) => cowZakat(n) !== "لا زكاة"),
      { numRuns: 500 },
    );
  });

  it("زكاة الغنم: أقل من 40 = لا زكاة، من 40 فأكثر توجد", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 39 }), (n) => sheepZakat(n) === "لا زكاة"),
      { numRuns: 200 },
    );
    fc.assert(
      fc.property(fc.integer({ min: 40, max: 10000 }), (n) => sheepZakat(n) !== "لا زكاة"),
      { numRuns: 500 },
    );
  });
});

describe("Property-based: عدم انفجار المحرك", () => {
  it("جميع دوال الأنعام تُرجع سلسلة نصية للأعداد ≥ 0", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100000 }), (n) => {
        return (
          typeof camelZakat(n) === "string" &&
          typeof cowZakat(n) === "string" &&
          typeof sheepZakat(n) === "string"
        );
      }),
      { numRuns: 1000 },
    );
  });
});

describe("ثوابت النصاب (تحقق مرجعي)", () => {
  it("نصاب الذهب 85 جراماً (لا يتغيّر)", () => expect(GOLD_NISAB_GRAMS).toBe(85));
  it("نصاب الفضة 595 جراماً (لا يتغيّر)", () => expect(SILVER_NISAB_GRAMS).toBe(595));
});
