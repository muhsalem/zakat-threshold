import { describe, it, expect } from "vitest";
import {
  goldGrams24,
  goldNisabValue,
  goldZakat,
  silverToPure,
  silverGramsPure,
  silverZakat,
  debtDeductionAmount,
  totalDeductions,
  netMonetaryBase,
  effectiveMoneyNisab,
  monetaryZakat,
  type GoldHoldings,
  type SilverPiece,
  type DebtItem,
} from "./individual-calcs";
import { GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS, ZAKAT_RATE } from "@/lib/zakat";

// ─────────────────────────────────────────────────────────────────────────────
// الذهب
// ─────────────────────────────────────────────────────────────────────────────

describe("goldGrams24", () => {
  it("100 جم عيار 21 = 87.5 جم عيار 24", () => {
    expect(
      goldGrams24({ savings: [{ grams: 100, karat: 21 }], includeJewelry: false }),
    ).toBeCloseTo(87.5, 4);
  });

  it("يجمع عدة قطع بعيارات مختلفة (18 + 21 + 24)", () => {
    const g = goldGrams24({
      savings: [
        { grams: 40, karat: 18 }, // 30
        { grams: 40, karat: 21 }, // 35
        { grams: 20, karat: 24 }, // 20
      ],
      includeJewelry: false,
    });
    expect(g).toBeCloseTo(85, 4);
  });

  it("يستثني الحلي عندما includeJewelry=false", () => {
    const g = goldGrams24({
      savings: [{ grams: 50, karat: 24 }],
      jewelry: [{ grams: 100, karat: 24 }],
      includeJewelry: false,
    });
    expect(g).toBe(50);
  });

  it("يضمّ الحلي عندما includeJewelry=true (رأي الجمهور المُختار)", () => {
    const g = goldGrams24({
      savings: [{ grams: 50, karat: 24 }],
      jewelry: [{ grams: 100, karat: 24 }],
      includeJewelry: true,
    });
    expect(g).toBe(150);
  });

  it("الجنيه الكامل = 8.5 جم عيار 21 = 7.4375 جم عيار 24", () => {
    const g = goldGrams24({ includeJewelry: false, coins: { full: 1 } });
    expect(g).toBeCloseTo((8.5 * 21) / 24, 6);
  });

  it("مزيج جنيهات كامل/نصف/ربع", () => {
    const g = goldGrams24({
      includeJewelry: false,
      coins: { full: 2, half: 4, quarter: 8 },
    });
    // 2×8.5 + 4×4.25 + 8×2.125 = 17 + 17 + 17 = 51 جم عيار 21
    expect(g).toBeCloseTo((51 * 21) / 24, 6);
  });

  it("عملة مخصّصة (10 قطع × 4 جم عيار 22)", () => {
    const g = goldGrams24({
      includeJewelry: false,
      coins: { custom: { pieces: 10, gramsEach: 4, karat: 22 } },
    });
    expect(g).toBeCloseTo((10 * 4 * 22) / 24, 6);
  });

  it("مدخلات فارغة أو أصفار → 0", () => {
    expect(goldGrams24({ includeJewelry: false })).toBe(0);
    expect(goldGrams24({ savings: [], includeJewelry: false })).toBe(0);
    expect(goldGrams24({ savings: [{ grams: 0, karat: 24 }], includeJewelry: false })).toBe(0);
  });
});

describe("goldNisabValue", () => {
  it("قيمة النصاب = 85 × سعر الجرام عيار 24", () => {
    expect(goldNisabValue(3000)).toBe(85 * 3000);
  });
  it("سعر صفري → نصاب صفري", () => {
    expect(goldNisabValue(0)).toBe(0);
  });
});

describe("goldZakat", () => {
  const price = 3000;

  it("لا زكاة أقل من النصاب (84 جم @24)", () => {
    const r = goldZakat({
      holdings: { savings: [{ grams: 84, karat: 24 }], includeJewelry: false },
      pricePerGram24: price,
    });
    expect(r.eligible).toBe(false);
    expect(r.zakat).toBe(0);
    expect(r.grams24).toBe(84);
  });

  it("النصاب بالضبط (85 جم) → 2.5%", () => {
    const r = goldZakat({
      holdings: { savings: [{ grams: 85, karat: 24 }], includeJewelry: false },
      pricePerGram24: price,
    });
    expect(r.eligible).toBe(true);
    expect(r.zakat).toBeCloseTo(85 * price * ZAKAT_RATE, 2);
  });

  it("200 جم @24 → 200 × 3000 × 0.025", () => {
    const r = goldZakat({
      holdings: { savings: [{ grams: 200, karat: 24 }], includeJewelry: false },
      pricePerGram24: price,
    });
    expect(r.zakat).toBeCloseTo(15000, 2);
  });

  it("قيمة النصاب في المخرجات صحيحة", () => {
    const r = goldZakat({
      holdings: { savings: [{ grams: 100, karat: 24 }], includeJewelry: false },
      pricePerGram24: price,
    });
    expect(r.nisabValue).toBe(GOLD_NISAB_GRAMS * price);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// الفضة
// ─────────────────────────────────────────────────────────────────────────────

describe("silverToPure", () => {
  it("ستيرلينج 925‰ لِ 1000 جم = 925 جم نقيّة", () => {
    expect(silverToPure(1000, 925)).toBe(925);
  });
  it("نقاء صفري → 0", () => expect(silverToPure(500, 0)).toBe(0));
  it("وزن صفري → 0", () => expect(silverToPure(0, 999)).toBe(0));
});

describe("silverGramsPure", () => {
  it("يجمع عدة قطع بنقاءات مختلفة", () => {
    const pieces: SilverPiece[] = [
      { grams: 600, purity: 999 }, // 599.4
      { grams: 400, purity: 925 }, // 370
    ];
    expect(silverGramsPure(pieces)).toBeCloseTo(969.4, 4);
  });
  it("قائمة فارغة → 0", () => expect(silverGramsPure([])).toBe(0));
});

describe("silverZakat", () => {
  const price = 30;

  it("أقل من النصاب (500 جم نقيّة) → لا زكاة", () => {
    const r = silverZakat({
      pieces: [{ grams: 500, purity: 1000 }],
      pricePerGramPure: price,
    });
    expect(r.eligible).toBe(false);
    expect(r.zakat).toBe(0);
  });

  it("النصاب بالضبط (595 جم) → 2.5%", () => {
    const r = silverZakat({
      pieces: [{ grams: 595, purity: 1000 }],
      pricePerGramPure: price,
    });
    expect(r.eligible).toBe(true);
    expect(r.zakat).toBeCloseTo(595 * price * ZAKAT_RATE, 2);
  });

  it("قيمة النصاب المُعادَة صحيحة", () => {
    const r = silverZakat({ pieces: [], pricePerGramPure: price });
    expect(r.nisabValue).toBe(SILVER_NISAB_GRAMS * price);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// الديون والخصومات
// ─────────────────────────────────────────────────────────────────────────────

describe("debtDeductionAmount", () => {
  it("الحال يُخصم كاملاً", () => {
    expect(debtDeductionAmount({ amount: 10_000, kind: "current" })).toBe(10_000);
  });

  it("المستبعد يعطي 0", () => {
    expect(debtDeductionAmount({ amount: 999_999, kind: "excluded" })).toBe(0);
  });

  it("المؤجّل: قسط 12 شهراً من رصيد كبير — 60 شهر × قسط 1000 → يُخصم 12000 فقط", () => {
    // amount=60000, remainingMonths=60 → monthly=1000 → 12*1000 = 12000
    expect(debtDeductionAmount({ amount: 60_000, kind: "installment", remainingMonths: 60 })).toBe(
      12_000,
    );
  });

  it("المؤجّل بأقل من 12 شهراً → يُخصم كامل الرصيد المتبقّي", () => {
    // amount=6000, remainingMonths=6 → monthly=1000 → 12000, لكن capped بـ 6000
    expect(debtDeductionAmount({ amount: 6_000, kind: "installment", remainingMonths: 6 })).toBe(
      6_000,
    );
  });

  it("المؤجّل بدون remainingMonths يفترض 12 شهر → يُخصم كامل الرصيد", () => {
    expect(debtDeductionAmount({ amount: 5_000, kind: "installment" })).toBe(5_000);
  });

  it("مبلغ صفر أو سالب → 0", () => {
    expect(debtDeductionAmount({ amount: 0, kind: "current" })).toBe(0);
    expect(debtDeductionAmount({ amount: -100, kind: "current" })).toBe(0);
  });
});

describe("totalDeductions", () => {
  it("مزيج بنود", () => {
    const items: DebtItem[] = [
      { amount: 5_000, kind: "current" },
      { amount: 60_000, kind: "installment", remainingMonths: 60 }, // 12000
      { amount: 100_000, kind: "excluded" },
    ];
    expect(totalDeductions(items)).toBe(17_000);
  });

  it("قائمة فارغة → 0", () => expect(totalDeductions([])).toBe(0));
});

// ─────────────────────────────────────────────────────────────────────────────
// الوعاء الصافي و "الأنفع للفقراء"
// ─────────────────────────────────────────────────────────────────────────────

describe("netMonetaryBase", () => {
  it("50000 - 20000 = 30000", () => expect(netMonetaryBase(50_000, 20_000)).toBe(30_000));
  it("لا يكون سالباً", () => expect(netMonetaryBase(1_000, 5_000)).toBe(0));
});

describe("effectiveMoneyNisab (الأنفع للفقراء)", () => {
  it("يختار الأقل بين النصابين", () => {
    // ذهب 255000، فضة 17850 → يختار الفضة (أنفع للفقراء)
    expect(effectiveMoneyNisab(255_000, 17_850)).toBe(17_850);
  });

  it("عند تساوي القيمتين", () => {
    expect(effectiveMoneyNisab(20_000, 20_000)).toBe(20_000);
  });

  it("تجاهل قيمة صفرية/سالبة/غير محدودة", () => {
    expect(effectiveMoneyNisab(0, 17_850)).toBe(17_850);
    expect(effectiveMoneyNisab(255_000, -1)).toBe(255_000);
  });

  it("كلاهما غير صالح → 0", () => {
    expect(effectiveMoneyNisab(0, 0)).toBe(0);
  });
});

describe("monetaryZakat", () => {
  it("سيناريو كامل: وعاء يفوق نصاب الفضة → زكاة 2.5%", () => {
    const r = monetaryZakat({
      grossAssets: 50_000,
      deductions: 10_000,
      goldNisabValue: 255_000, // ذهب @3000 × 85
      silverNisabValue: 17_850, // فضة @30 × 595
    });
    expect(r.base).toBe(40_000);
    expect(r.nisab).toBe(17_850);
    expect(r.eligible).toBe(true);
    expect(r.zakat).toBe(1_000); // 40000 × 0.025
  });

  it("وعاء أقل من نصاب الفضة → لا زكاة", () => {
    const r = monetaryZakat({
      grossAssets: 20_000,
      deductions: 5_000,
      goldNisabValue: 255_000,
      silverNisabValue: 17_850,
    });
    expect(r.base).toBe(15_000);
    expect(r.eligible).toBe(false);
    expect(r.zakat).toBe(0);
  });

  it("الديون تُلغي وجوب الزكاة", () => {
    const r = monetaryZakat({
      grossAssets: 30_000,
      deductions: 30_000,
      goldNisabValue: 255_000,
      silverNisabValue: 17_850,
    });
    expect(r.base).toBe(0);
    expect(r.eligible).toBe(false);
    expect(r.zakat).toBe(0);
  });

  it("سيناريو تكاملي: ذهب + فضة + نقد وسائل — كل قسم على حِدَة", () => {
    // ذهب
    const gold = goldZakat({
      holdings: {
        savings: [{ grams: 100, karat: 21 }], // 87.5 @24 → أكبر من 85
        includeJewelry: false,
      },
      pricePerGram24: 3_000,
    });
    // فضة
    const silver = silverZakat({
      pieces: [{ grams: 700, purity: 999 }], // 699.3 → أكبر من 595
      pricePerGramPure: 30,
    });
    // نقد بعد ديون
    const money = monetaryZakat({
      grossAssets: 100_000,
      deductions: 25_000,
      goldNisabValue: goldNisabValue(3_000),
      silverNisabValue: SILVER_NISAB_GRAMS * 30,
    });

    expect(gold.eligible).toBe(true);
    expect(silver.eligible).toBe(true);
    expect(money.eligible).toBe(true);

    const total = round2(gold.zakat + silver.zakat + money.zakat);
    // 87.5×3000×0.025 = 6562.5
    // 699.3×30×0.025  = 524.475
    // (100k-25k)×0.025 = 1875
    expect(total).toBeCloseTo(6_562.5 + 524.48 + 1_875, 1);
  });
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
