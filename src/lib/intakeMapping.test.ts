import { describe, it, expect, beforeEach } from "vitest";
import {
  aggregateIntake,
  buildIndividualPrefill,
  savePrefill,
  consumePrefill,
  INDIVIDUAL_PREFILL_KEY,
  type IntakeDetails,
} from "./intakeMapping";

function baseDetails(overrides: Partial<IntakeDetails> = {}): IntakeDetails {
  return {
    mode: "comprehensive",
    cash: 10000,
    bankAccounts: 40000,
    savingsBonds: 5000,
    cryptoValue: 2000,
    gold: 3000,
    goldGrams: 100,
    goldKarat: 21,
    silverGrams: 700,
    jewelryPersonal: 8000,
    investments: 1000,
    stocksTrading: 20000,
    stocksLongTerm: 60000,
    mutualFunds: 4000,
    sukuk: 6000,
    realEstateTrading: 150000,
    realEstateRental: 500000,
    rentalIncomeAnnual: 36000,
    agricultureType: "rainfed",
    agricultureValue: 12000,
    livestockCamels: 6,
    livestockCattle: 0,
    livestockSheep: 45,
    salaryMonthly: 9000,
    endOfServiceBenefits: 0,
    inventory: 30000,
    businessAssets: 15000,
    businessLiabilities: 7000,
    receivables: 11000,
    receivablesDoubtful: 0,
    debts: 9000,
    esopVestedValue: 0,
    bills: 0,
    rikazMetals: 0,
    notes: "ملاحظة العميل",
    ...overrides,
  };
}

describe("aggregateIntake() — التجميع الفقهي الصحيح", () => {
  const { breakdown, reviewFlags } = aggregateIntake(baseDetails());

  it("النقد = نقد + بنوك + شهادات + عملات رقمية", () => {
    expect(breakdown.cash).toBe(10000 + 40000 + 5000 + 2000);
  });

  it("الاستثمارات تضم المتاجرة فقط — لا الأسهم طويلة الأجل ولا دخل الإيجار", () => {
    expect(breakdown.investments).toBe(1000 + 20000 + 4000 + 6000 + 150000);
  });

  it("عروض التجارة = مخزون + أصول تشغيلية، والديون تشمل التزامات النشاط", () => {
    expect(breakdown.inventory).toBe(30000 + 15000);
    expect(breakdown.debts).toBe(9000 + 7000);
  });

  it("البنود ذات المعالجة الخاصة تُستبعد مع أعلام مراجعة", () => {
    const joined = reviewFlags.join(" | ");
    expect(joined).toContain("أسهم طويلة الأجل");
    expect(joined).toContain("دخل إيجاري");
    expect(joined).toContain("زروع وثمار");
    expect(joined).toContain("أنعام");
    expect(joined).toContain("حلي شخصي");
    expect(joined).toContain("راتب");
  });

  it("التفاصيل الكاملة محفوظة بنيوياً في breakdown.details", () => {
    expect(breakdown.details?.goldGrams).toBe(100);
    expect(breakdown.details?.goldKarat).toBe(21);
    expect(breakdown.details?.livestockSheep).toBe(45);
  });

  it("نموذج نظيف بلا بنود خاصة → لا أعلام", () => {
    const clean = aggregateIntake(
      baseDetails({
        stocksLongTerm: 0,
        rentalIncomeAnnual: 0,
        realEstateRental: 0,
        agricultureType: "none",
        agricultureValue: 0,
        livestockCamels: 0,
        livestockSheep: 0,
        goldGrams: 0,
        silverGrams: 0,
        jewelryPersonal: 0,
        salaryMonthly: 0,
      }),
    );
    expect(clean.reviewFlags).toHaveLength(0);
  });
});

describe("buildIndividualPrefill() — حمولة الحاسبة الشاملة", () => {
  const client = {
    id: "c1",
    name: "عميل تجريبي",
    country: "SA",
    hawlDate: "2026-11-01",
    breakdown: aggregateIntake(baseDetails()).breakdown,
  };
  const p = buildIndividualPrefill(client);

  it("يمرر الهوية والحول والذهب بالوزن والعيار", () => {
    expect(p.clientName).toBe("عميل تجريبي");
    expect(p.hawlDate).toBe("2026-11-01");
    expect(p.goldGrams).toBe(100);
    expect(p.goldKarat).toBe(21);
    expect(p.silverGrams).toBe(700);
  });

  it("يمرر الأنعام بالعدد والزراعة بنوع الري", () => {
    expect(p.camels).toBe(6);
    expect(p.sheep).toBe(45);
    expect(p.cows).toBeUndefined();
    expect(p.agricultureType).toBe("rainfed");
    expect(p.agricultureValue).toBe(12000);
  });

  it("الملاحظات تتضمن أعلام قرار المحاسب وتفاصيل الإدخال اليدوي", () => {
    expect(p.notes).toContain("بنود تحتاج قرار المحاسب");
    expect(p.notes).toContain("أسهم طويلة الأجل");
    expect(p.notes).toContain("ملاحظات العميل");
  });

  it("عميل بلا details (مُدخل يدوياً) → حمولة من المجاميع فقط بلا انهيار", () => {
    const manual = buildIndividualPrefill({
      id: "c2",
      name: "يدوي",
      breakdown: {
        cash: 1000,
        gold: 0,
        investments: 0,
        inventory: 500,
        receivables: 200,
        debts: 100,
      },
    });
    expect(manual.inventory).toBe(500);
    expect(manual.goldGrams).toBeUndefined();
    expect(manual.notes).toContain("يدوي");
  });
});

describe("savePrefill/consumePrefill — تسليم لمرة واحدة", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      get length() {
        return store.size;
      },
    } as Storage;
  });

  it("يُستهلك مرة واحدة ثم يختفي", () => {
    savePrefill({ clientId: "c1", clientName: "أحمد", notes: "ن" });
    expect(localStorage.getItem(INDIVIDUAL_PREFILL_KEY)).toBeTruthy();
    const first = consumePrefill();
    expect(first?.clientName).toBe("أحمد");
    expect(consumePrefill()).toBeNull();
  });

  it("حمولة تالفة → null بلا انهيار", () => {
    localStorage.setItem(INDIVIDUAL_PREFILL_KEY, "{بيانات معطوبة");
    expect(consumePrefill()).toBeNull();
  });
});
