// Pure calculation helpers extracted from IndividualTab.
// Each function is deterministic, side-effect-free, and unit-testable.
//
// Naming stays aligned with the شرعي terminology used in the UI:
//   - grams24 = وزن مكافئ بعيار 24
//   - nisab   = الحد الأدنى الشرعي (85 جم ذهب أو 595 جم فضة)
//   - hawl    = حَوْل (اكتمال السنة القمرية)

import {
  ZAKAT_RATE,
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
  karatToPure24,
} from "@/lib/zakat";

// ─────────────────────────────────────────────────────────────────────────────
// الذهب
// ─────────────────────────────────────────────────────────────────────────────

export interface GoldHoldings {
  /** ذهب ادّخار (خاضع للزكاة اتفاقاً). */
  savings?: { grams: number; karat: number }[];
  /** حلي زينة (خاضع عند الشافعية والجمهور خلاف ذلك — يمرَّر كمِعطى). */
  jewelry?: { grams: number; karat: number }[];
  /** يُحسب الحلي ضمن الوعاء؟ (يعكس رأي المذهب المختار). */
  includeJewelry: boolean;
  /** الجنيهات الذهبية (كلٌّ ≈ 8.5 جم عيار 21). */
  coins?: {
    full?: number; // 8.5 جم @21
    half?: number; // 4.25 جم @21
    quarter?: number; // 2.125 جم @21
    custom?: { pieces: number; gramsEach: number; karat: number };
  };
}

const COIN_FULL_G21 = 8.5;
const COIN_HALF_G21 = 4.25;
const COIN_QUARTER_G21 = 2.125;

/** يحسب الوزن المكافئ بعيار 24 لجميع القطع الذهبية المدخلة. */
export function goldGrams24(h: GoldHoldings): number {
  const sumPieces = (pieces: { grams: number; karat: number }[] = []) =>
    pieces.reduce((s, p) => s + karatToPure24(p.grams, p.karat), 0);

  const savings = sumPieces(h.savings);
  const jewelry = h.includeJewelry ? sumPieces(h.jewelry) : 0;

  const c = h.coins ?? {};
  const coinsG =
    karatToPure24((c.full ?? 0) * COIN_FULL_G21, 21) +
    karatToPure24((c.half ?? 0) * COIN_HALF_G21, 21) +
    karatToPure24((c.quarter ?? 0) * COIN_QUARTER_G21, 21) +
    (c.custom ? karatToPure24(c.custom.pieces * c.custom.gramsEach, c.custom.karat) : 0);

  return round(savings + jewelry + coinsG, 6);
}

/** الحد الأدنى الشرعي للذهب مقوّماً بالنقد الرائج. */
export function goldNisabValue(pricePerGram24: number): number {
  return GOLD_NISAB_GRAMS * pricePerGram24;
}

/** يحسب زكاة الذهب على أساس القيمة النقدية للذهب المُقاس بعيار 24. */
export function goldZakat(params: {
  holdings: GoldHoldings;
  pricePerGram24: number;
}): { grams24: number; value: number; nisabValue: number; eligible: boolean; zakat: number } {
  const grams24 = goldGrams24(params.holdings);
  const value = grams24 * params.pricePerGram24;
  const nisabValue = goldNisabValue(params.pricePerGram24);
  const eligible = grams24 >= GOLD_NISAB_GRAMS;
  const zakat = eligible ? round(value * ZAKAT_RATE, 2) : 0;
  return { grams24, value, nisabValue, eligible, zakat };
}

// ─────────────────────────────────────────────────────────────────────────────
// الفضة
// ─────────────────────────────────────────────────────────────────────────────

export interface SilverPiece {
  grams: number;
  /** نقاء الفضة بالنسبة الألفية (‰). 999 = نقيّة، 925 = ستيرلينج. */
  purity: number;
}

/** يحوّل قطعة فضة بأي نقاء إلى ما يعادلها من الفضة النقية (‰1000). */
export function silverToPure(grams: number, purity: number): number {
  if (!grams || !purity) return 0;
  return (grams * purity) / 1000;
}

/** إجمالي الفضة النقية. */
export function silverGramsPure(pieces: SilverPiece[]): number {
  return round(pieces.reduce((s, p) => s + silverToPure(p.grams, p.purity), 0), 6);
}

export function silverZakat(params: {
  pieces: SilverPiece[];
  pricePerGramPure: number;
}): { grams: number; value: number; nisabValue: number; eligible: boolean; zakat: number } {
  const grams = silverGramsPure(params.pieces);
  const value = grams * params.pricePerGramPure;
  const nisabValue = SILVER_NISAB_GRAMS * params.pricePerGramPure;
  const eligible = grams >= SILVER_NISAB_GRAMS;
  const zakat = eligible ? round(value * ZAKAT_RATE, 2) : 0;
  return { grams, value, nisabValue, eligible, zakat };
}

// ─────────────────────────────────────────────────────────────────────────────
// الديون والخصومات
// ─────────────────────────────────────────────────────────────────────────────

export interface DebtItem {
  /** المبلغ الأصلي. */
  amount: number;
  /**
   * نوع الدين:
   *  - "current": حالّ (يُخصم كاملاً).
   *  - "installment": مؤجّل بأقساط (يُخصم قسط سنة واحدة فقط).
   *  - "excluded": مستبعد بقرار المستخدم (لا يُخصم).
   */
  kind: "current" | "installment" | "excluded";
  /** لأقساط: عدد أشهر التقسيط المتبقية. */
  remainingMonths?: number;
}

/**
 * يحسب مبلغ الخصم لكل بند:
 *   - الحال: كامل المبلغ.
 *   - القسط: min(المبلغ الكلي, قسط شهري × 12).
 *   - المستبعد: صفر.
 */
export function debtDeductionAmount(d: DebtItem): number {
  if (!d.amount || d.amount <= 0) return 0;
  if (d.kind === "excluded") return 0;
  if (d.kind === "current") return d.amount;
  // installment
  const months = Math.max(1, d.remainingMonths ?? 12);
  const monthly = d.amount / months;
  return Math.min(d.amount, round(monthly * 12, 2));
}

/** إجمالي كل الخصومات القابلة للحسم من الوعاء. */
export function totalDeductions(items: DebtItem[]): number {
  return round(items.reduce((s, d) => s + debtDeductionAmount(d), 0), 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// الوعاء الصافي وقاعدة "الأنفع للفقراء"
// ─────────────────────────────────────────────────────────────────────────────

/** الوعاء الصافي بعد خصم الديون (لا يكون سالباً). */
export function netMonetaryBase(gross: number, deductions: number): number {
  return Math.max(0, round(gross - deductions, 2));
}

/**
 * النصاب المُعتمد وفق قاعدة "الأنفع للفقراء" (الأدنى بين نصابَي الذهب والفضة).
 * كلاهما مقوَّم بالنقد الرائج، فيُختار الأقل حتى تجب الزكاة بأقرب فرصة.
 */
export function effectiveMoneyNisab(goldNisabVal: number, silverNisabVal: number): number {
  const g = Number.isFinite(goldNisabVal) && goldNisabVal > 0 ? goldNisabVal : Infinity;
  const s = Number.isFinite(silverNisabVal) && silverNisabVal > 0 ? silverNisabVal : Infinity;
  const min = Math.min(g, s);
  return Number.isFinite(min) ? min : 0;
}

/** زكاة الوعاء النقدي بعد الخصومات مقارنةً بالنصاب الأنفع. */
export function monetaryZakat(params: {
  grossAssets: number;
  deductions: number;
  goldNisabValue: number;
  silverNisabValue: number;
}): { base: number; nisab: number; eligible: boolean; zakat: number } {
  const base = netMonetaryBase(params.grossAssets, params.deductions);
  const nisab = effectiveMoneyNisab(params.goldNisabValue, params.silverNisabValue);
  const eligible = base >= nisab && nisab > 0;
  const zakat = eligible ? round(base * ZAKAT_RATE, 2) : 0;
  return { base, nisab, eligible, zakat };
}

// ─────────────────────────────────────────────────────────────────────────────
// helper
// ─────────────────────────────────────────────────────────────────────────────

function round(n: number, digits: number): number {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}
