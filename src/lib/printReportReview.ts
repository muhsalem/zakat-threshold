/**
 * Print Report → Sharia Review Adapter
 * ------------------------------------
 * يولّد المراجعة الشرعية الشاملة (شرعية · امتثال · حوكمة) من بيانات تقرير
 * الزكاة النهائي (PrintReportData) — فتظهر في التقرير المطبوع وPDF وExcel.
 *
 * مبدأ مهم: أرقام التقرير (الوعاء/النصاب/الزكاة/المعدل) هي المعتمدة —
 * لا يُعاد حسابها هنا؛ يُبنى منها كائن الحساب مباشرةً، بينما تُستخدم
 * بنود التقرير لفحوص الكشف (ربا/محرمات) وسياق الفئات.
 */
import {
  classifyTrialBalance,
  computeZakatFromTrialBalance,
  type ClassifiedRow,
  type TrialBalanceRow,
  type ZakatComputation,
} from "./erp/zakatMapping";
import { runShariaComplianceReview, type ShariaReviewResult } from "./shariaAudit";
import type { PrintReportData } from "@/components/zakat/PrintReport";

export function buildReviewFromPrintReport(data: PrintReportData): ShariaReviewResult {
  // 1) بنود التقرير → صفوف ميزان للفحص النصي والفئوي
  const tbRows: TrialBalanceRow[] = data.rows.map((r, i) => ({
    code: String(i + 1),
    name: r.label,
    balance: Math.abs(r.gross) || 0,
  }));
  if (data.debts > 0) {
    tbRows.push({
      code: "D1",
      name: "الديون والالتزامات المخصومة من الوعاء",
      balance: -Math.abs(data.debts),
    });
  }

  const classified: ClassifiedRow[] = classifyTrialBalance(tbRows, "generic").map((row) => ({
    ...row,
    // بنود التقرير مُدخلة ومُراجعة قصداً (ليست دفتر أستاذ خاماً) — لا نعدّ
    // غير المتطابق مع الكلمات المفتاحية "غير مصنف" حتى لا يُنبَّه زوراً
    source: row.source === "default" ? ("provider_rule" as const) : row.source,
  }));

  // 2) كائن الحساب: أرقام التقرير المعتمدة + توزيع الفئات من البنود للسياق فقط
  const contextTotals = computeZakatFromTrialBalance(classified, {
    nisab: data.moneyNisab,
    calendar: data.calendarBasis,
  }).totalsByCategory;

  const computation: ZakatComputation = {
    totalsByCategory: contextTotals,
    zakatableAssets: +data.monetaryGross.toFixed(2),
    deductibleLiabilities: +Math.abs(data.debts).toFixed(2),
    zakatBase: +data.monetaryBase.toFixed(2),
    nisab: +data.moneyNisab.toFixed(2),
    eligible: data.monetaryBase >= data.moneyNisab && data.moneyNisab > 0,
    rate: data.effectiveRate,
    zakatDue: +data.totalZakat.toFixed(2),
    standard: "AAOIFI-35",
    rowCount: classified.length,
  };

  // 3) المراجعة الموحّدة نفسها المستخدمة في الرفع وERP والذكاء الاصطناعي
  return runShariaComplianceReview({
    rows: classified,
    computation,
    hawlComplete: data.hawlComplete,
    calendar: data.calendarBasis,
  });
}
