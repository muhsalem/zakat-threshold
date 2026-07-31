/**
 * Corporate Zakat Methodologies — منهجيات زكاة الشركات
 * -----------------------------------------------------
 * يسدّ الفجوة (9): لا تُفرض منهجية واحدة. الشركة تختار منهجية،
 * وتُختم في التقرير باسمها وإصدارها ومصدرها.
 */

import type { ZakatCategory } from "@/lib/erp/zakatMapping";

export type CorporateMethodologyId =
  | "net-current-assets" // صافي الأصول المتداولة (الأشيع مؤسسياً)
  | "net-assets" // صافي الموجودات / رأس المال العامل
  | "net-invested-funds"; // صافي الأموال المستثمرة

export interface MethodologyDefinition {
  id: CorporateMethodologyId;
  labelAr: string;
  formulaAr: string;
  sourceId: string;
  reference: string;
  version: string;
  notes: string;
}

export const CORPORATE_METHODOLOGIES: Record<CorporateMethodologyId, MethodologyDefinition> = {
  "net-current-assets": {
    id: "net-current-assets",
    labelAr: "صافي الأصول المتداولة",
    formulaAr:
      "(نقد + ذمم مرجوّة + مخزون + استثمارات متاجرة) − (التزامات مستحقة خلال الحول)",
    sourceId: "SRC-AAOIFI-35",
    reference: "AAOIFI 35 — طريقة صافي الأصول المتداولة",
    version: "1.0.0",
    notes: "المنهجية الافتراضية. تنطلق من جانب الأصول وتناسب أغلب المنشآت التجارية.",
  },
  "net-assets": {
    id: "net-assets",
    labelAr: "صافي الموجودات (رأس المال العامل)",
    formulaAr:
      "(حقوق الملكية + الالتزامات طويلة الأجل) − (أصول ثابتة + مدفوعات مقدمة + خسائر مرحّلة)",
    sourceId: "SRC-AAOIFI-35",
    reference: "AAOIFI 35 — طريقة صافي الموجودات (مصادر التمويل)",
    version: "1.0.0",
    notes:
      "تنطلق من جانب الخصوم وتصل لنفس النتيجة نظرياً. تُستخدم للتحقق المتقاطع من الوعاء.",
  },
  "net-invested-funds": {
    id: "net-invested-funds",
    labelAr: "صافي الأموال المستثمرة",
    formulaAr: "(رأس المال + الاحتياطيات + الأرباح المبقاة) − (الأصول غير الزكوية)",
    sourceId: "SRC-AAOIFI-35",
    reference: "منهجية مؤسسية — تُوثَّق بقرار الهيئة الشرعية للجهة",
    version: "1.0.0",
    notes: "تُفعَّل فقط بقرار موثّق من الهيئة الشرعية للجهة، ولا تُستخدم افتراضياً.",
  },
};

export type CategoryTotals = Record<ZakatCategory, number>;

export interface MethodologyResult {
  methodology: MethodologyDefinition;
  zakatableAssets: number;
  deductibleLiabilities: number;
  zakatBase: number;
  /** خطوات مفصّلة للتفسير (Explainable Zakat) */
  steps: Array<{ label: string; sign: "+" | "−"; amount: number }>;
}

function sum(totals: CategoryTotals, cats: ZakatCategory[]): number {
  return cats.reduce((s, c) => s + (totals[c] ?? 0), 0);
}

/** يحسب الوعاء وفق المنهجية المختارة مع خطوات قابلة للتدقيق */
export function computeBaseByMethodology(
  totals: CategoryTotals,
  methodologyId: CorporateMethodologyId,
  extras: { longTermDueWithinHawl?: number; accumulatedLosses?: number } = {},
): MethodologyResult {
  const methodology = CORPORATE_METHODOLOGIES[methodologyId];
  const steps: MethodologyResult["steps"] = [];
  let assets = 0;
  let liabilities = 0;

  if (methodologyId === "net-current-assets") {
    const cats: ZakatCategory[] = ["cash", "receivables", "inventory", "investments"];
    for (const c of cats) {
      const v = totals[c] ?? 0;
      if (v) steps.push({ label: c, sign: "+", amount: v });
    }
    assets = sum(totals, cats);
    const due = extras.longTermDueWithinHawl ?? 0;
    liabilities = (totals.current_liabilities ?? 0) + due;
    if (totals.current_liabilities)
      steps.push({ label: "current_liabilities", sign: "−", amount: totals.current_liabilities });
    if (due) steps.push({ label: "قسط طويل الأجل مستحق خلال الحول", sign: "−", amount: due });
  } else if (methodologyId === "net-assets") {
    const equity = totals.equity ?? 0;
    const lt = totals.long_term_liabilities ?? 0;
    const fixed = totals.fixed_assets ?? 0;
    const prepaid = totals.prepayments ?? 0;
    const losses = extras.accumulatedLosses ?? 0;
    assets = equity + lt;
    liabilities = fixed + prepaid + losses;
    if (equity) steps.push({ label: "equity", sign: "+", amount: equity });
    if (lt) steps.push({ label: "long_term_liabilities", sign: "+", amount: lt });
    if (fixed) steps.push({ label: "fixed_assets", sign: "−", amount: fixed });
    if (prepaid) steps.push({ label: "prepayments", sign: "−", amount: prepaid });
    if (losses) steps.push({ label: "خسائر مرحّلة", sign: "−", amount: losses });
  } else {
    const equity = totals.equity ?? 0;
    const nonZakatable = (totals.fixed_assets ?? 0) + (totals.prepayments ?? 0);
    assets = equity;
    liabilities = nonZakatable;
    if (equity) steps.push({ label: "equity", sign: "+", amount: equity });
    if (nonZakatable) steps.push({ label: "أصول غير زكوية", sign: "−", amount: nonZakatable });
  }

  const zakatBase = Math.max(0, assets - liabilities);
  return {
    methodology,
    zakatableAssets: +assets.toFixed(2),
    deductibleLiabilities: +liabilities.toFixed(2),
    zakatBase: +zakatBase.toFixed(2),
    steps,
  };
}

/**
 * تحقق متقاطع بين منهجيتين — فرق كبير يعني خللاً في تصنيف الحسابات
 * وليس اختلافاً فقهياً. يُرفع تنبيه للمراجع.
 */
export function crossCheckMethodologies(
  totals: CategoryTotals,
  tolerance = 0.02,
): { matched: boolean; difference: number; ratio: number; note: string } {
  const a = computeBaseByMethodology(totals, "net-current-assets").zakatBase;
  const b = computeBaseByMethodology(totals, "net-assets").zakatBase;
  const difference = +(a - b).toFixed(2);
  const denom = Math.max(Math.abs(a), Math.abs(b), 1);
  const ratio = Math.abs(difference) / denom;
  return {
    matched: ratio <= tolerance,
    difference,
    ratio: +ratio.toFixed(4),
    note:
      ratio <= tolerance
        ? "المنهجيتان متطابقتان ضمن الحد المسموح — التصنيف متسق."
        : "فارق جوهري بين المنهجيتين يشير إلى خلل في تصنيف الحسابات ويستوجب مراجعة.",
  };
}
