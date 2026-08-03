/**
 * Exceptions Queue — طابور الاستثناءات الإلزامي
 * ----------------------------------------------
 * يسدّ الفجوة (13): أي حساب لم تُصنّفه قاعدة صريحة، أو صُنّف بثقة منخفضة،
 * أو ارتبط بقاعدة توجب مراجعة بشرية — يُرفع تلقائياً هنا ويمنع الاعتماد
 * حتى يبتّ فيه المحاسب أو المراجع الشرعي.
 */

import { ZAKAT_CATEGORIES, type ClassifiedRow, type ZakatCategory } from "@/lib/erp/zakatMapping";

export type ExceptionSeverity = "blocking" | "warning" | "info";

export type ExceptionReason =
  | "unclassified" // لم تُطابقه أي قاعدة
  | "low_confidence" // صُنّف بالكلمات المفتاحية فقط
  | "material_excluded" // مبلغ جوهري خرج من الوعاء
  | "sign_anomaly" // رصيد بإشارة مخالفة لطبيعة الحساب
  | "requires_sharia_review"; // يحتاج بتّاً شرعياً

export interface ExceptionItem {
  code: string;
  name: string;
  balance: number;
  category: ZakatCategory;
  reason: ExceptionReason;
  severity: ExceptionSeverity;
  message: string;
  suggestion?: ZakatCategory;
}

export const EXCEPTION_REASON_LABELS: Record<ExceptionReason, string> = {
  unclassified: "غير مصنَّف",
  low_confidence: "تصنيف بثقة منخفضة",
  material_excluded: "مبلغ جوهري مستبعد",
  sign_anomaly: "إشارة رصيد غير متوقعة",
  requires_sharia_review: "يحتاج مراجعة شرعية",
};

export interface ExceptionsResult {
  items: ExceptionItem[];
  blockingCount: number;
  warningCount: number;
  /** المبلغ الإجمالي المتأثر بالاستثناءات */
  affectedAmount: number;
  /** هل يُسمح بالاعتماد؟ لا اعتماد مع وجود استثناء حاجب */
  canApprove: boolean;
}

export interface ExceptionsOptions {
  /** حد الأهمية النسبية: نسبة من إجمالي الأصول تُعدّ جوهرية */
  materialityRatio?: number;
  /** فئات تستوجب بتّاً شرعياً في هذه الجهة */
  shariaReviewCategories?: ZakatCategory[];
}

/** الفئات التي تُتوقع أرصدتها مدينة (موجبة) */
const DEBIT_NATURE: ZakatCategory[] = [
  "cash",
  "receivables",
  "inventory",
  "investments",
  "fixed_assets",
  "prepayments",
];

/** الفئات التي تُتوقع أرصدتها دائنة (سالبة باتفاقية debit − credit) */
const CREDIT_NATURE: ZakatCategory[] = ["current_liabilities", "long_term_liabilities", "equity"];

export function buildExceptionsQueue(
  rows: ClassifiedRow[],
  opts: ExceptionsOptions = {},
): ExceptionsResult {
  const materialityRatio = opts.materialityRatio ?? 0.05;
  const shariaCats = opts.shariaReviewCategories ?? ["investments"];

  const totalAbs = rows.reduce((s, r) => s + Math.abs(r.balance), 0);
  const threshold = totalAbs * materialityRatio;
  const items: ExceptionItem[] = [];

  for (const row of rows) {
    const abs = Math.abs(row.balance);
    const meta = ZAKAT_CATEGORIES[row.category];

    // فحص مستقل: بعض الفئات تستوجب بتّاً شرعياً مهما كان مصدر التصنيف
    if (shariaCats.includes(row.category) && abs > 0) {
      items.push({
        code: row.code,
        name: row.name,
        balance: row.balance,
        category: row.category,
        reason: "requires_sharia_review",
        severity: "blocking",
        message: "هذه الفئة تستوجب بتّاً شرعياً في نية الاقتناء (متاجرة أم استثمار).",
      });
    }



    if (row.source === "default") {
      items.push({
        code: row.code,
        name: row.name,
        balance: row.balance,
        category: row.category,
        reason: "unclassified",
        severity: abs > 0 ? "blocking" : "info",
        message:
          "لم تُطابق هذا الحساب أي قاعدة تصنيف. يجب تحديد الفئة الزكوية يدوياً قبل الاعتماد.",
      });
      continue;
    }

    if (row.source === "keyword" && abs >= threshold && threshold > 0) {
      items.push({
        code: row.code,
        name: row.name,
        balance: row.balance,
        category: row.category,
        reason: "low_confidence",
        severity: "blocking",
        message:
          "صُنّف بالكلمات المفتاحية فقط ومبلغه جوهري — يلزم تأكيد المحاسب على التصنيف.",
        suggestion: row.category,
      });
      continue;
    }

    if (!meta.zakatable && !meta.deductible && abs >= threshold && threshold > 0) {
      items.push({
        code: row.code,
        name: row.name,
        balance: row.balance,
        category: row.category,
        reason: "material_excluded",
        severity: "warning",
        message: "مبلغ جوهري خرج من الوعاء الزكوي — يُوثَّق سبب الاستبعاد في ورقة العمل.",
      });
    }

    const signWrong =
      (DEBIT_NATURE.includes(row.category) && row.balance < 0) ||
      (CREDIT_NATURE.includes(row.category) && row.balance > 0);
    if (signWrong && abs > 0) {
      items.push({
        code: row.code,
        name: row.name,
        balance: row.balance,
        category: row.category,
        reason: "sign_anomaly",
        severity: "warning",
        message: "إشارة الرصيد مخالفة لطبيعة الحساب — يُراجع الترحيل أو التصنيف.",
      });
    }



  }

  const blockingCount = items.filter((i) => i.severity === "blocking").length;
  const warningCount = items.filter((i) => i.severity === "warning").length;
  const affectedAmount = items.reduce((s, i) => s + Math.abs(i.balance), 0);

  return {
    items,
    blockingCount,
    warningCount,
    affectedAmount: +affectedAmount.toFixed(2),
    canApprove: blockingCount === 0,
  };
}
