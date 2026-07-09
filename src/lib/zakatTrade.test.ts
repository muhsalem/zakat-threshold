import { describe, it, expect } from "vitest";
import {
  HONEY_NISAB_KG,
  honeyZakatableValue,
  netZakatable,
  livestockTradeBase,
  aggregateAgriTrade,
} from "./zakatTrade";
import { ZAKAT_RATE } from "./zakat";

describe("honeyZakatableValue() — نصاب العسل", () => {
  it("أقل من النصاب (653 كجم) → صفر", () => {
    expect(honeyZakatableValue({ kg: 100, pricePerKg: 200 })).toBe(0);
    expect(honeyZakatableValue({ kg: HONEY_NISAB_KG - 1, pricePerKg: 50 })).toBe(0);
  });
  it("عند بلوغ النصاب بالضبط → يُحتسب", () => {
    expect(honeyZakatableValue({ kg: HONEY_NISAB_KG, pricePerKg: 100 })).toBe(HONEY_NISAB_KG * 100);
  });
  it("فوق النصاب → كامل القيمة", () => {
    expect(honeyZakatableValue({ kg: 1000, pricePerKg: 150 })).toBe(150000);
  });
  it("قيم سالبة تُعامل كصفر", () => {
    expect(honeyZakatableValue({ kg: -10, pricePerKg: 100 })).toBe(0);
    expect(honeyZakatableValue({ kg: 1000, pricePerKg: -5 })).toBe(0);
  });
});

describe("netZakatable() — صافي الثروة السمكية/الدواجن", () => {
  it("التكلفة أكبر من القيمة (سالب) → صفر", () => {
    expect(netZakatable({ value: 500, cost: 800 })).toBe(0);
  });
  it("التكلفة تساوي القيمة → صفر", () => {
    expect(netZakatable({ value: 500, cost: 500 })).toBe(0);
  });
  it("ربح موجب → الفرق", () => {
    expect(netZakatable({ value: 1000, cost: 300 })).toBe(700);
  });
  it("لا قيم سالبة من المدخلات", () => {
    expect(netZakatable({ value: -100, cost: 50 })).toBe(0);
    expect(netZakatable({ value: 1000, cost: -200 })).toBe(1000);
  });
});

describe("livestockTradeBase() — أنعام للتجارة", () => {
  it("غير مفعّل → صفر مهما كانت القيمة", () => {
    expect(livestockTradeBase({ enabled: false, marketValue: 999999 })).toBe(0);
  });
  it("مفعّل → القيمة السوقية", () => {
    expect(livestockTradeBase({ enabled: true, marketValue: 50000 })).toBe(50000);
  });
  it("مفعّل بقيمة سالبة → صفر", () => {
    expect(livestockTradeBase({ enabled: true, marketValue: -1000 })).toBe(0);
  });
});

describe("aggregateAgriTrade() — منع الازدواج وتجميع لعروض التجارة", () => {
  it("جميع المصادر صفر → إجمالي صفر", () => {
    const r = aggregateAgriTrade({
      honey: { kg: 100, pricePerKg: 50 }, // دون النصاب
      fish: { value: 100, cost: 200 }, // سالب
      poultry: { value: 0, cost: 0 },
      livestock: { enabled: false, marketValue: 100000 },
    });
    expect(r.total).toBe(0);
    expect(r.zakat).toBe(0);
  });

  it("الدواجن للتجارة (مفعّلة) تدخل في القاعدة بنسبة 2.5%", () => {
    const r = aggregateAgriTrade({
      poultry: { value: 100000, cost: 20000 },
    });
    expect(r.poultry).toBe(80000);
    expect(r.total).toBe(80000);
    expect(r.zakat).toBeCloseTo(80000 * ZAKAT_RATE, 2); // 2000
  });

  it("الدواجن غير مُحدّدة (input غير ممرَّر) → لا تُحتسب", () => {
    const r = aggregateAgriTrade({ fish: { value: 5000, cost: 1000 } });
    expect(r.poultry).toBe(0);
    expect(r.total).toBe(4000);
  });

  it("سيناريو شامل: عسل بالنصاب + سمك ربح + دواجن خسارة + أنعام للتجارة", () => {
    const r = aggregateAgriTrade({
      honey: { kg: HONEY_NISAB_KG, pricePerKg: 100 }, // 65,300
      fish: { value: 20000, cost: 5000 }, // 15,000
      poultry: { value: 1000, cost: 5000 }, // 0 (خسارة)
      livestock: { enabled: true, marketValue: 200000 }, // 200,000
    });
    expect(r.honey).toBe(HONEY_NISAB_KG * 100);
    expect(r.fish).toBe(15000);
    expect(r.poultry).toBe(0);
    expect(r.livestock).toBe(200000);
    expect(r.total).toBe(HONEY_NISAB_KG * 100 + 15000 + 200000);
    expect(r.zakat).toBeCloseTo(r.total * ZAKAT_RATE, 2);
  });

  it("منع الازدواج: متى ضُمّت الأنعام للتجارة فلا تُحسب عيناً (مسؤولية المستدعي)", () => {
    // العقد: عند enabled=true تُحسب بالقيمة، وعلى المستدعي إخفاء الحساب العيني.
    // نتحقق هنا أن الأنعام للتجارة لا تساهم بصفر زائف.
    const r = aggregateAgriTrade({ livestock: { enabled: true, marketValue: 100000 } });
    expect(r.livestock).toBe(100000);
    expect(r.zakat).toBe(2500);
  });
});
