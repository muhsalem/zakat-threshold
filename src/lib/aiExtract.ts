/**
 * AI Extraction Adapter — جسر بين مخرجات الاستخراج بالذكاء الاصطناعي
 * (/api/extract-statement) ومحرك التصنيف الزكوي الموحّد والمراجعة الشرعية.
 *
 * فئات الذكاء الاصطناعي (AAOIFI 35 التفصيلية) → الفئات الزكوية الموحّدة:
 * تُحوَّل البنود إلى ClassifiedRow بإشارة الرصيد الصحيحة (أصول موجبة /
 * التزامات سالبة) حتى تعمل عليها computeZakatFromTrialBalance
 * وrunShariaComplianceReview بلا أي منطق خاص.
 */
import type { ClassifiedRow, ZakatCategory } from "./erp/zakatMapping";

export interface AiExtractedItem {
  category: string;
  label: string;
  amount: number;
  zakatable: boolean;
  confidence: number;
  note?: string;
}

/** فئة الذكاء الاصطناعي → الفئة الزكوية الموحّدة */
export const AI_CATEGORY_TO_ZAKAT: Record<string, ZakatCategory> = {
  cash: "cash",
  receivables_strong: "receivables",
  murabaha: "receivables",
  ijara: "receivables",
  istisna: "receivables",
  inventory: "inventory",
  sukuk_trading: "investments",
  equity_trading: "investments",
  mudaraba_share: "investments",
  musharaka_share: "investments",
  precious_metals: "investments",
  // عملات رقمية — تُزكّى كالنقود وفق رأي الجمهور المعاصر؛ مصنَّفة ضمن
  // الاستثمارات الزكوية (2.5%) لا الأصول الثابتة. انظر cryptoFatwas.ts
  crypto_digital: "investments",
  fixed_assets_use: "fixed_assets",
  intangibles: "fixed_assets",
  psia: "excluded",
  takaful_participants: "excluded",
  current_payables: "current_liabilities",
  doubtful_provision: "current_liabilities",
  unclassified: "excluded",
};

/** الفئات التي تمثل التزامات/خصومات: تُقلب إشارتها سالبة (اتفاقية الميزان) */
const LIABILITY_AI_CATEGORIES = new Set(["current_payables", "doubtful_provision"]);

/** عتبة الثقة التي يُعد ما دونها بحاجة لتأكيد بشري */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export function aiItemsToClassifiedRows(items: AiExtractedItem[]): ClassifiedRow[] {
  return items.map((it, i) => {
    const category = AI_CATEGORY_TO_ZAKAT[it.category] ?? "excluded";
    const amount = Math.abs(Number(it.amount) || 0);
    const balance = LIABILITY_AI_CATEGORIES.has(it.category) ? -amount : amount;
    return {
      code: String(i + 1),
      name: it.label,
      balance: +balance.toFixed(2),
      erpType: it.category,
      category,
      // unclassified من الذكاء الاصطناعي = غير مصنف فعلاً → يدخل في فحص اكتمال التصنيف
      source:
        it.category === "unclassified" || !AI_CATEGORY_TO_ZAKAT[it.category]
          ? "default"
          : "provider_rule",
    };
  });
}

/** أسماء البنود منخفضة الثقة — تُمرَّر للمراجعة كفحص حوكمة إضافي */
export function lowConfidenceLabels(items: AiExtractedItem[]): string[] {
  return items
    .filter((it) => (Number(it.confidence) || 0) < LOW_CONFIDENCE_THRESHOLD)
    .map((it) => `${it.label} (${Math.round((Number(it.confidence) || 0) * 100)}%)`);
}
