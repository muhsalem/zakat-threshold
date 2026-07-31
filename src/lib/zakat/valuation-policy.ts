/**
 * Valuation Policy — سياسة تقييم الأصول
 * --------------------------------------
 * يسدّ الفجوة (17): أساس التقييم (تكلفة / سوق / صافي قيمة بيعية) لم يكن
 * قابلاً للاختيار ولا موثّقاً في التقرير. الآن يُختار صراحةً ويُطبع.
 *
 * ملاحظة شرعية: الأصل في تقويم عروض التجارة القيمة السوقية يوم وجوب
 * الزكاة (AAOIFI 35). اعتماد التكلفة أو صافي القيمة البيعية يحتاج
 * تسويغاً موثّقاً ويُرفع تنبيه في ورقة العمل.
 */

export type ValuationBasis = "market" | "cost" | "lower_of_cost_or_market" | "net_realizable";

export interface ValuationPolicy {
  basis: ValuationBasis;
  /** تاريخ التقويم — يجب أن يوافق تاريخ وجوب الزكاة */
  valuationDate: string;
  /** مبرر اعتماد أساس غير السوقي */
  justification?: string;
  version: string;
}

export const VALUATION_BASIS_LABELS: Record<ValuationBasis, string> = {
  market: "القيمة السوقية يوم الوجوب (الأصل)",
  cost: "التكلفة التاريخية",
  lower_of_cost_or_market: "الأقل من التكلفة أو السوق",
  net_realizable: "صافي القيمة البيعية",
};

export interface ValuationInput {
  label: string;
  cost: number;
  marketValue?: number;
  netRealizableValue?: number;
}

export interface ValuationLine {
  label: string;
  basis: ValuationBasis;
  appliedValue: number;
  /** الفرق عن القيمة السوقية — يوضّح أثر اختيار الأساس */
  deltaVsMarket: number;
  note: string;
}

function resolveValue(item: ValuationInput, basis: ValuationBasis): { value: number; note: string } {
  const market = item.marketValue ?? item.cost;
  const nrv = item.netRealizableValue ?? market;
  switch (basis) {
    case "market":
      return { value: market, note: "قُوِّم بالقيمة السوقية يوم وجوب الزكاة." };
    case "cost":
      return {
        value: item.cost,
        note: "قُوِّم بالتكلفة التاريخية — يحتاج تسويغاً موثّقاً في ورقة العمل.",
      };
    case "lower_of_cost_or_market":
      return {
        value: Math.min(item.cost, market),
        note: "قُوِّم بالأقل من التكلفة أو السوق وفق السياسة المحاسبية المعتمدة.",
      };
    case "net_realizable":
      return { value: nrv, note: "قُوِّم بصافي القيمة البيعية بعد خصم تكاليف البيع." };
  }
}

export interface ValuationResult {
  policy: ValuationPolicy;
  lines: ValuationLine[];
  total: number;
  totalAtMarket: number;
  /** أثر اختيار الأساس على الوعاء مقارنةً بالقيمة السوقية */
  totalDeltaVsMarket: number;
  warnings: string[];
}

export function applyValuationPolicy(
  items: ValuationInput[],
  policy: ValuationPolicy,
): ValuationResult {
  const lines: ValuationLine[] = items.map((item) => {
    const market = item.marketValue ?? item.cost;
    const { value, note } = resolveValue(item, policy.basis);
    return {
      label: item.label,
      basis: policy.basis,
      appliedValue: +value.toFixed(2),
      deltaVsMarket: +(value - market).toFixed(2),
      note,
    };
  });

  const total = lines.reduce((s, l) => s + l.appliedValue, 0);
  const totalAtMarket = items.reduce((s, i) => s + (i.marketValue ?? i.cost), 0);

  const warnings: string[] = [];
  if (policy.basis !== "market" && !policy.justification) {
    warnings.push(
      "اعتُمد أساس تقويم غير القيمة السوقية دون تسويغ موثّق — يلزم تبرير من المراجع.",
    );
  }
  if (Math.abs(total - totalAtMarket) / Math.max(totalAtMarket, 1) > 0.1) {
    warnings.push("فارق التقويم عن القيمة السوقية يتجاوز 10% — يُفصح عنه في التقرير.");
  }

  return {
    policy,
    lines,
    total: +total.toFixed(2),
    totalAtMarket: +totalAtMarket.toFixed(2),
    totalDeltaVsMarket: +(total - totalAtMarket).toFixed(2),
    warnings,
  };
}

export const DEFAULT_VALUATION_POLICY: ValuationPolicy = {
  basis: "market",
  valuationDate: "",
  version: "1.0.0",
};
