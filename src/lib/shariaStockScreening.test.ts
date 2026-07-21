import { describe, it, expect } from "vitest";
import {
  computeStockAudit,
  compareExtracts,
  METHODOLOGIES,
  type StockAuditExtract,
} from "./shariaStockScreening";

function baseExtract(overrides: Partial<StockAuditExtract> = {}): StockAuditExtract {
  return {
    company: { name: "شركة تجريبية", period: "2026", activity: "تجارة" },
    statementType: "مجمعة",
    figures: {
      totalAssets: 1_000_000,
      totalLiabilities: 400_000,
      totalEquity: 600_000,
      totalRevenue: 500_000,
      interestIncome: 0,
      capitalizedInterest: 0,
      weightedShares: 100_000,
    },
    conventionalDebt: [],
    interestBearingDeposits: [],
    instruments: [],
    governance: [],
    violations: [],
    recommendations: [],
    contractReview: [],
    ...overrides,
  };
}

describe("computeStockAudit() — فحص توازن الميزانية", () => {
  it("ميزان متوازن (فارق صفر)", () => {
    const r = computeStockAudit(baseExtract(), { methodologyKey: "aaoifi" });
    expect(r.balanceOk).toBe(true);
    expect(r.balanceDiffPct).toBe(0);
  });

  it("ميزان مختل بفارق كبير", () => {
    const r = computeStockAudit(
      baseExtract({
        figures: {
          totalAssets: 1_000_000,
          totalLiabilities: 400_000,
          totalEquity: 700_000, // 400k+700k=1.1M ≠ 1M
          totalRevenue: 500_000,
          interestIncome: 0,
          capitalizedInterest: 0,
          weightedShares: 100_000,
        },
      }),
      { methodologyKey: "aaoifi" },
    );
    expect(r.balanceOk).toBe(false);
    expect(r.balanceDiffPct).toBeGreaterThan(2);
  });
});

describe("computeStockAudit() — منهجية AAOIFI (الأشد من الأصول/السوق)", () => {
  it("شركة نظيفة بلا ديون ربوية ولا إيرادات محرمة → لا مانع شرعاً", () => {
    const r = computeStockAudit(baseExtract(), { methodologyKey: "aaoifi" });
    expect(r.ratios.every((x) => x.status === "pass")).toBe(true);
    expect(r.verdictTone).toBe("pass");
    expect(r.verdict).toContain("لا يظهر");
  });

  it("ديون ربوية تتجاوز 30٪ من الأصول → حرام + يأخذ الأشد بين الأصول والسوق", () => {
    const r = computeStockAudit(
      baseExtract({ conventionalDebt: [{ name: "قرض بنكي", amount: 350_000 }] }),
      { methodologyKey: "aaoifi", marketCap: 900_000 },
    );
    const debtRatio = r.ratios[0];
    // 350k/1,000k = 35% (أصول) و 350k/900k ≈ 38.9% (سوق) → الأشد = السوق
    expect(debtRatio.vAssets).toBeCloseTo(35, 1);
    expect(debtRatio.vMarket).toBeCloseTo(38.888, 1);
    expect(debtRatio.judged).toBeCloseTo(38.888, 1);
    expect(debtRatio.denomUsed).toBe("القيمة السوقية");
    expect(debtRatio.status).toBe("fail");
    expect(r.verdictTone).toBe("fail");
    expect(r.verdict).toContain("لا يجوز الاستثمار");
  });

  it("ديون ربوية دون الحد قليلاً (بين 80% و100% من الحد) → تنبيه لا مخالفة", () => {
    // 25% من الأصول تساوي 250,000 — بين 80% (24%) و100% (30%) من الحد
    const r = computeStockAudit(
      baseExtract({ conventionalDebt: [{ name: "قرض", amount: 250_000 }] }),
      { methodologyKey: "aaoifi" },
    );
    expect(r.ratios[0].status).toBe("warning");
    expect(r.verdictTone).toBe("warn"); // شركة مختلطة — ديون موجودة لكن دون الحد
  });

  it("شركة مختلطة (ديون ضمن الحد لكن موجودة) → يجوز بشرط التطهير", () => {
    const r = computeStockAudit(
      baseExtract({
        conventionalDebt: [{ name: "قرض صغير", amount: 50_000 }],
        figures: {
          ...baseExtract().figures,
          interestIncome: 5_000,
        },
      }),
      { methodologyKey: "aaoifi" },
    );
    expect(r.verdictTone).toBe("warn");
    expect(r.verdict).toContain("مختلطة");
  });
});

describe("computeStockAudit() — منهجيتا DJIM/S&P (متوسط القيمة السوقية)", () => {
  it("تستخدم متوسط 36 شهراً كمقام عند توفره", () => {
    const r = computeStockAudit(
      baseExtract({ conventionalDebt: [{ name: "قرض", amount: 300_000 }] }),
      { methodologyKey: "djim", avgMarketCap: 1_200_000 },
    );
    expect(r.ratios[0].judged).toBeCloseTo(25, 1); // 300k/1.2M = 25%
    expect(r.ratios[0].denomUsed).toContain("متوسط القيمة السوقية");
  });

  it("تتراجع للقيمة السوقية الحالية إن غاب المتوسط، ثم للأصول كبديل اضطراري", () => {
    const withMc = computeStockAudit(baseExtract(), { methodologyKey: "sp", marketCap: 800_000 });
    expect(withMc.ratios[0].denomUsed).toContain("بديل عن متوسط");

    const withNoMc = computeStockAudit(baseExtract(), { methodologyKey: "sp" });
    expect(withNoMc.ratios[0].denomUsed).toContain("بديل اضطراري");
  });
});

describe("computeStockAudit() — نسبة الإيرادات غير المتوافقة", () => {
  it("تتجاوز 5٪ من الإيرادات → مخالفة", () => {
    const r = computeStockAudit(
      baseExtract({
        figures: { ...baseExtract().figures, interestIncome: 30_000, totalRevenue: 500_000 },
      }),
      { methodologyKey: "aaoifi" },
    );
    expect(r.ratios[2].judged).toBeCloseTo(6, 1);
    expect(r.ratios[2].status).toBe("fail");
  });
});

describe("computeStockAudit() — التطهير الواجب", () => {
  it("يجمع الفوائد الدائنة والمرسملة ويوزّعها على السهم", () => {
    const r = computeStockAudit(
      baseExtract({
        figures: {
          ...baseExtract().figures,
          interestIncome: 10_000,
          capitalizedInterest: 5_000,
          weightedShares: 100_000,
        },
      }),
      { methodologyKey: "aaoifi" },
    );
    expect(r.purification.total).toBe(15_000);
    expect(r.purification.perShare).toBeCloseTo(0.15, 4);
  });

  it("صفر أسهم مرجَّحة → نصيب السهم null بلا قسمة على صفر", () => {
    const r = computeStockAudit(
      baseExtract({
        figures: { ...baseExtract().figures, weightedShares: 0, interestIncome: 10_000 },
      }),
      { methodologyKey: "aaoifi" },
    );
    expect(r.purification.perShare).toBeNull();
  });
});

describe("computeStockAudit() — درجة الفرز 0-100", () => {
  it("شركة مثالية (نسب سليمة + أدوات متوافقة + حوكمة كاملة) تقارب 100", () => {
    const r = computeStockAudit(
      baseExtract({
        instruments: [{ name: "استثمار", amount: 100, classification: "متوافقة" }],
        governance: [
          { item: "هيئة رقابة شرعية", status: "yes" },
          { item: "تدقيق شرعي داخلي", status: "yes" },
        ],
      }),
      { methodologyKey: "aaoifi" },
    );
    expect(r.score).toBe(100);
  });

  it("شركة فاشلة في كل الأبعاد (النسب الثلاث + الأدوات + الحوكمة) تقارب الصفر", () => {
    const r = computeStockAudit(
      baseExtract({
        conventionalDebt: [{ name: "قرض ضخم", amount: 900_000 }], // يفشل نسبة الديون
        interestBearingDeposits: [{ name: "وديعة بفائدة", amount: 900_000 }], // يفشل نسبة الودائع
        figures: { ...baseExtract().figures, interestIncome: 100_000 }, // يفشل نسبة الإيرادات (20% > 5%)
        instruments: [{ name: "سندات ربوية", amount: 100, classification: "غير متوافقة" }],
        governance: [{ item: "هيئة رقابة شرعية", status: "no" }],
      }),
      { methodologyKey: "aaoifi" },
    );
    expect(r.ratios.every((x) => x.status === "fail")).toBe(true);
    expect(r.score).toBeLessThan(20);
  });
});

describe("computeStockAudit() — مقارنة المنهجيات الثلاث", () => {
  it("تُرجع نتيجة لكل منهجية بحدودها الخاصة على نفس الأرقام", () => {
    const r = computeStockAudit(
      baseExtract({ conventionalDebt: [{ name: "قرض", amount: 310_000 }] }),
      { methodologyKey: "aaoifi" },
    );
    expect(r.comparison).toHaveLength(3);
    const aaoifi = r.comparison.find((c) => c.methodology.key === "aaoifi")!;
    const djim = r.comparison.find((c) => c.methodology.key === "djim")!;
    // 31% أصول > حد AAOIFI (30%) لكن < حد DJIM (33.33%)
    expect(aaoifi.passAll).toBe(false);
    expect(djim.passAll).toBe(true);
  });
});

describe("compareExtracts() — التحقق بالاستخراج المزدوج", () => {
  it("استخراج واحد فقط → singlePass=true", () => {
    const r = compareExtracts(baseExtract(), null);
    expect(r.singlePass).toBe(true);
    expect(r.unconfirmed).toHaveLength(0);
  });

  it("استخراجان متطابقان → لا فروقات", () => {
    const e1 = baseExtract();
    const e2 = baseExtract();
    const r = compareExtracts(e1, e2);
    expect(r.singlePass).toBe(false);
    expect(r.unconfirmed).toHaveLength(0);
  });

  it("فارق جوهري (>1%) بين الاستخراجين → يُعلَّم غير مؤكد", () => {
    const e1 = baseExtract();
    const e2 = baseExtract({
      figures: { ...baseExtract().figures, totalAssets: 1_050_000 }, // 5% فرق
    });
    const r = compareExtracts(e1, e2);
    expect(r.unconfirmed.length).toBeGreaterThan(0);
    expect(r.unconfirmed[0].label).toBe("إجمالي الأصول");
  });

  it("فارق ضئيل جداً (<1%) لا يُعلَّم", () => {
    const e1 = baseExtract();
    const e2 = baseExtract({
      figures: { ...baseExtract().figures, totalAssets: 1_005_000 }, // 0.5% فرق
    });
    const r = compareExtracts(e1, e2);
    expect(r.unconfirmed).toHaveLength(0);
  });
});

describe("METHODOLOGIES — سلامة البيانات المرجعية", () => {
  it("الحدود الثلاثة (aaoifi/djim/sp) موجودة وموثقة بأسماء ومقامات", () => {
    for (const key of ["aaoifi", "djim", "sp"] as const) {
      const m = METHODOLOGIES[key];
      expect(m.name.length).toBeGreaterThan(3);
      expect(m.debtLimit).toBeGreaterThan(0);
      expect(m.incLimit).toBe(5); // بند الإيرادات غير المتوافقة موحّد بين المنهجيات الثلاث
    }
  });
});
