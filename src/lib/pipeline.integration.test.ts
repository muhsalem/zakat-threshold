/**
 * اختبار تكامل عبر الوحدات — يمر بالسلسلة الكاملة: منهجية شركة → تحقق
 * متقاطع → مبلغ الزكاة → حمولة تقرير → بصمة محتوى. كل وحدة من هذه
 * مُختبَرة منفردة في ملفها الخاص، لكن لا اختبار كان يؤكد أن مخرجات كل
 * مرحلة تتوافق فعلياً مع مدخلات المرحلة التالية (عقود البيانات بين
 * الوحدات) — هذا هو الفراغ الذي يسدّه هذا الملف.
 */
import { describe, it, expect } from "vitest";
import {
  computeBaseByMethodology,
  crossCheckMethodologies,
  type CategoryTotals,
} from "./zakat/corporate-methodologies";
import { ZAKAT_RATE } from "./zakat";
import { computeContentHash } from "./pdf/engine";
import type { ReportPayload } from "./pdf/types";

function sampleTotals(overrides: Partial<CategoryTotals> = {}): CategoryTotals {
  return {
    cash: 200_000,
    receivables: 50_000,
    inventory: 80_000,
    investments: 20_000,
    current_liabilities: 60_000,
    long_term_liabilities: 100_000,
    equity: 300_000,
    fixed_assets: 150_000,
    prepayments: 10_000,
    ...overrides,
  } as CategoryTotals;
}

describe("خط أنابيب زكاة الشركات الكامل — من المنهجية إلى بصمة التقرير", () => {
  it("منهجية صافي الأصول المتداولة تُنتج وعاءً موجباً منطقياً من المدخلات", () => {
    const totals = sampleTotals();
    const result = computeBaseByMethodology(totals, "net-current-assets");
    // الأصول الزكوية = 200,000 + 50,000 + 80,000 + 20,000 = 350,000
    // الالتزامات المخصومة = 60,000 (لا قسط طويل أجل مستحق هنا)
    expect(result.zakatableAssets).toBe(350_000);
    expect(result.deductibleLiabilities).toBe(60_000);
    expect(result.zakatBase).toBe(290_000);
  });

  it("التحقق المتقاطع يكتشف تطابق/تباعد المنهجيتين لنفس المدخلات الواقعية", () => {
    const totals = sampleTotals();
    const check = crossCheckMethodologies(totals);
    // net-assets هنا = (equity 300k + lt 100k) - (fixed 150k + prepaid 10k) = 240,000
    // net-current-assets = 290,000 → فرق حقيقي 50,000 (تصنيف حسابات غير متسق، لا خطأ في الاختبار)
    expect(check.difference).toBe(50_000);
    expect(check.matched).toBe(false);
  });

  it("مدخلات متسقة محاسبياً (الميزانية متوازنة فعلاً) تُنتج تطابقاً بين المنهجيتين", () => {
    // net-current-assets = 350,000 - 60,000 = 290,000
    // net-assets = equity + lt - fixed(150k) - prepaid(10k) → يجب أن يساوي 290,000
    // إذن equity + lt = 290,000 + 160,000 = 450,000
    const totals = sampleTotals({ equity: 450_000, long_term_liabilities: 0 });
    const check = crossCheckMethodologies(totals);
    expect(check.matched).toBe(true);
    expect(check.difference).toBe(0);
  });

  it("مبلغ الزكاة المستحق = الوعاء × 2.5%، ويتدفق حتى بصمة تقرير حتمية", async () => {
    const totals = sampleTotals();
    const { zakatBase } = computeBaseByMethodology(totals, "net-current-assets");
    const zakatDue = +(zakatBase * ZAKAT_RATE).toFixed(2);
    expect(zakatDue).toBe(7_250); // 290,000 × 0.025

    const payload: ReportPayload = {
      report_uid: "RPT-2026-000001",
      verify_token: "00000000-0000-0000-0000-000000000000",
      kind: "declaration",
      title: "تقرير زكاة شركة — اختبار تكامل",
      issued_at: "2026-01-01T00:00:00.000Z",
      issuer_name: "نِصاب",
      owner: { name: "شركة اختبار" },
      meta: { currency: "SAR", hijri_year: "1447هـ", gregorian_date: "2026-01-01" },
      inputs: [],
      assets: [],
      calc_steps: [],
      deductions: [],
      results: [{ label: "الزكاة المستحقة", value: `${zakatDue} SAR`, emphasize: true }],
      sharia_refs: [],
      version: 1,
      content_hash: "",
    } as unknown as ReportPayload;

    const hash1 = await computeContentHash(payload);
    const hash2 = await computeContentHash(payload);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);

    // لو تغيّر الوعاء الزكوي (خطأ إدخال بيانات مثلاً) — يجب أن تتغيّر البصمة أيضاً،
    // كي لا يبقى تقرير قديم يبدو "موثَّقاً" لبيانات محدَّثة فعلياً.
    const changedZakatDue = +((zakatBase + 1000) * ZAKAT_RATE).toFixed(2);
    const changedPayload = {
      ...payload,
      results: [{ label: "الزكاة المستحقة", value: `${changedZakatDue} SAR`, emphasize: true }],
    };
    const hash3 = await computeContentHash(changedPayload);
    expect(hash3).not.toBe(hash1);
  });
});
