/**
 * Zakat Rules Catalogue — كتالوج القواعد الشرعية الرسمي
 * ------------------------------------------------------
 * يسدّ الفجوة (1) و(4) في Blueprint: قواعد مُعرَّفة بيانياً (declarative)،
 * لكل قاعدة معرّف ومصدر متحقَّق واعتماد موقّع وإصدار وتاريخ سريان.
 *
 * القواعد الحاكمة (غير قابلة للتفاوض):
 *   - لا تُفعَّل قاعدة في الإنتاج إلا إذا كان مصدرها `verified`
 *     واعتمادها `approved` وتاريخ سريانها قد حلّ.
 *   - الخلاف الفقهي يُعرض ولا يُخفى، مع أثره الرقمي على النتيجة.
 *   - الذكاء الاصطناعي يستهلك هذا الكتالوج ولا ينشئ قواعد.
 */

import type { Madhab } from "@/lib/fatwaEngine";

/* ------------------------------------------------------------------ */
/*                              الأنواع                                */
/* ------------------------------------------------------------------ */

export type SourceKind = "quran" | "sunnah" | "fiqh" | "academy" | "standard" | "fatwa";

/** حالة التحقق من المصدر — القواعد المرتبطة بمصدر غير متحقَّق لا تُفعَّل */
export type SourceVerification = "verified" | "pending_verification" | "rejected";

export interface ShariahSource {
  id: string;
  kind: SourceKind;
  /** الإحالة الدقيقة (اسم المعيار/القرار/الكتاب + البند أو الصفحة) */
  citation: string;
  url?: string;
  verification: SourceVerification;
  /** من تحقّق من المصدر ومتى */
  verifiedBy?: string;
  verifiedAt?: string;
}

export type ZakatStatus = "zakatable" | "exempt" | "conditional" | "deductible";

export type RuleApproval = "draft" | "under_review" | "approved" | "suspended";

export type AssetType =
  | "cash"
  | "gold"
  | "silver"
  | "stocks"
  | "funds"
  | "sukuk"
  | "crypto"
  | "inventory"
  | "receivables"
  | "real_estate"
  | "rental"
  | "livestock"
  | "crops"
  | "debt"
  | "business_assets"
  | "fixed_assets";

/** شرط قابل للتقييم آلياً على وقائع الحساب */
export interface RuleCondition {
  /** مسار الحقل داخل وقائع الحساب، مثل "gold.purpose" */
  field: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "exists";
  value?: string | number | boolean | Array<string | number>;
}

/** قول مخالف معتبر — يُعرض مع أثره الرقمي */
export interface RuleDivergence {
  view: string;
  madhab: Madhab | "majority" | "contemporary";
  sourceId: string;
  /** كيف يتغير الوعاء لو أُخذ بهذا القول (نسبة من قيمة البند) */
  baseFactor: number;
  impactNote: string;
}

export interface ZakatRule {
  ruleId: string;
  name: string;
  description: string;
  assetType: AssetType;
  zakatStatus: ZakatStatus;
  conditions: RuleCondition[];
  exceptions: string[];
  madhab: Madhab | "agreed";
  methodology: string;
  sourceId: string;
  reference: string;
  divergence?: RuleDivergence[];
  requiresHumanReview: boolean;
  effectiveDate: string;
  reviewDate: string;
  reviewer: string;
  approval: RuleApproval;
  version: string;
}

/* ------------------------------------------------------------------ */
/*                            سجل المصادر                              */
/* ------------------------------------------------------------------ */

export const SHARIAH_SOURCES: ShariahSource[] = [
  {
    id: "SRC-AAOIFI-35",
    kind: "standard",
    citation: "المعيار الشرعي AAOIFI رقم (35) — الزكاة",
    verification: "verified",
    verifiedBy: "لجنة المحتوى الشرعي",
    verifiedAt: "2026-01-15",
  },
  {
    id: "SRC-AAOIFI-21",
    kind: "standard",
    citation: "المعيار الشرعي AAOIFI رقم (21) — الأوراق المالية",
    verification: "verified",
    verifiedBy: "لجنة المحتوى الشرعي",
    verifiedAt: "2026-01-15",
  },
  {
    id: "SRC-IFA-OIC-3-1",
    kind: "academy",
    citation: "قرار مجمع الفقه الإسلامي الدولي رقم 3 (3/1) — زكاة أسهم الشركات",
    verification: "verified",
    verifiedBy: "لجنة المحتوى الشرعي",
    verifiedAt: "2026-01-15",
  },
  {
    id: "SRC-IFA-OIC-143",
    kind: "academy",
    citation: "قرار مجمع الفقه الإسلامي الدولي رقم 143 (16/2) — النصاب",
    verification: "verified",
    verifiedBy: "لجنة المحتوى الشرعي",
    verifiedAt: "2026-01-15",
  },
  {
    id: "SRC-MWL-8",
    kind: "academy",
    citation: "قرار المجمع الفقهي الإسلامي بمكة — الدورة الثامنة 1405هـ (حلي الزينة)",
    verification: "verified",
    verifiedBy: "لجنة المحتوى الشرعي",
    verifiedAt: "2026-01-15",
  },
  {
    id: "SRC-NADWA-7",
    kind: "fatwa",
    citation: "الندوة السابعة لقضايا الزكاة المعاصرة — البحرين 1418هـ (نسبة السنة الميلادية)",
    verification: "verified",
    verifiedBy: "لجنة المحتوى الشرعي",
    verifiedAt: "2026-01-15",
  },
  {
    id: "SRC-SUNNA-RIQA",
    kind: "sunnah",
    citation: "حديث: «في الرِّقَة ربع العشر» — سنن أبي داود",
    verification: "verified",
    verifiedBy: "لجنة المحتوى الشرعي",
    verifiedAt: "2026-01-15",
  },
  {
    id: "SRC-SUNNA-HAWL",
    kind: "sunnah",
    citation: "حديث: «لا زكاة في مال حتى يحول عليه الحول» — سنن الترمذي",
    verification: "verified",
    verifiedBy: "لجنة المحتوى الشرعي",
    verifiedAt: "2026-01-15",
  },
  {
    id: "SRC-IFA-OIC-237",
    kind: "academy",
    citation: "قرار مجمع الفقه الإسلامي الدولي رقم 237 (8/24) — الأصول الرقمية",
    verification: "pending_verification",
  },
];

const SOURCE_INDEX = new Map(SHARIAH_SOURCES.map((s) => [s.id, s]));

export function getSource(id: string): ShariahSource | undefined {
  return SOURCE_INDEX.get(id);
}

/* ------------------------------------------------------------------ */
/*                            سجل القواعد                              */
/* ------------------------------------------------------------------ */

const REVIEWER = "اللجنة الشرعية — مراجعة داخلية";

export const ZAKAT_RULES: ZakatRule[] = [
  {
    ruleId: "ZR-CASH-001",
    name: "زكاة النقد وما في حكمه",
    description: "النقد والأرصدة البنكية الجارية تدخل الوعاء بقيمتها الاسمية عند تمام الحول.",
    assetType: "cash",
    zakatStatus: "zakatable",
    conditions: [{ field: "cash.amount", op: "gt", value: 0 }],
    exceptions: ["الأموال المحجوزة قضائياً لا يُتصرَّف فيها حتى الإفراج"],
    madhab: "agreed",
    methodology: "net-current-assets",
    sourceId: "SRC-SUNNA-RIQA",
    reference: "AAOIFI 35 بند (4/2/1)",
    requiresHumanReview: false,
    effectiveDate: "2026-01-01",
    reviewDate: "2027-01-01",
    reviewer: REVIEWER,
    approval: "approved",
    version: "1.0.0",
  },
  {
    ruleId: "ZR-GOLD-INVEST-001",
    name: "زكاة الذهب للاستثمار أو التجارة",
    description: "الذهب المقتنى للاستثمار أو التجارة زكوي بقيمته السوقية باتفاق.",
    assetType: "gold",
    zakatStatus: "zakatable",
    conditions: [{ field: "gold.purpose", op: "in", value: ["investment", "trade"] }],
    exceptions: [],
    madhab: "agreed",
    methodology: "market-value",
    sourceId: "SRC-AAOIFI-35",
    reference: "AAOIFI 35 بند (4/1)",
    requiresHumanReview: false,
    effectiveDate: "2026-01-01",
    reviewDate: "2027-01-01",
    reviewer: REVIEWER,
    approval: "approved",
    version: "1.0.0",
  },
  {
    ruleId: "ZR-GOLD-JEWELRY-001",
    name: "زكاة حلي الزينة المباح المستعمل",
    description:
      "حلي الزينة المستعمل في حدود المعتاد: لا زكاة فيه عند الجمهور، وتجب عند الحنفية. المنصة تطبّق قول المنهج المختار وتعرض المخالف.",
    assetType: "gold",
    zakatStatus: "conditional",
    conditions: [{ field: "gold.purpose", op: "eq", value: "personal" }],
    exceptions: ["ما جاوز حدّ المعتاد أو قُصد به الادخار يعود زكوياً"],
    madhab: "agreed",
    methodology: "madhab-dependent",
    sourceId: "SRC-MWL-8",
    reference: "قرار المجمع الفقهي بمكة — الدورة الثامنة",
    divergence: [
      {
        view: "لا زكاة في حلي الزينة المستعمل",
        madhab: "majority",
        sourceId: "SRC-MWL-8",
        baseFactor: 0,
        impactNote: "يُستبعد الحلي بالكامل من الوعاء",
      },
      {
        view: "تجب الزكاة في الحلي مطلقاً",
        madhab: "hanafi",
        sourceId: "SRC-AAOIFI-35",
        baseFactor: 1,
        impactNote: "تُضاف قيمة الحلي كاملة إلى الوعاء",
      },
    ],
    requiresHumanReview: false,
    effectiveDate: "2026-01-01",
    reviewDate: "2027-01-01",
    reviewer: REVIEWER,
    approval: "approved",
    version: "1.0.0",
  },
  {
    ruleId: "ZR-STOCKS-TRADE-001",
    name: "أسهم المتاجرة",
    description: "الأسهم المشتراة بنية البيع والشراء تُزكّى بقيمتها السوقية كاملة.",
    assetType: "stocks",
    zakatStatus: "zakatable",
    conditions: [{ field: "stocks.intent", op: "eq", value: "trading" }],
    exceptions: [],
    madhab: "agreed",
    methodology: "market-value",
    sourceId: "SRC-IFA-OIC-3-1",
    reference: "قرار المجمع 3 (3/1)",
    requiresHumanReview: false,
    effectiveDate: "2026-01-01",
    reviewDate: "2027-01-01",
    reviewer: REVIEWER,
    approval: "approved",
    version: "1.0.0",
  },
  {
    ruleId: "ZR-STOCKS-HOLD-001",
    name: "أسهم الاستثمار طويل الأجل",
    description:
      "تُزكّى حصة المساهم من الأصول الزكوية للشركة وفق قوائمها؛ فإن تعذّرت البيانات استُخدمت نسبة تقديرية موثّقة.",
    assetType: "stocks",
    zakatStatus: "conditional",
    conditions: [{ field: "stocks.intent", op: "eq", value: "long_term" }],
    exceptions: ["تعذّر الحصول على القوائم المالية يستوجب توثيق أساس التقدير"],
    madhab: "agreed",
    methodology: "look-through",
    sourceId: "SRC-IFA-OIC-3-1",
    reference: "قرار المجمع 3 (3/1) + AAOIFI 21",
    requiresHumanReview: true,
    effectiveDate: "2026-01-01",
    reviewDate: "2027-01-01",
    reviewer: REVIEWER,
    approval: "approved",
    version: "1.0.0",
  },
  {
    ruleId: "ZR-RE-PRIMARY-001",
    name: "السكن الرئيسي",
    description: "العقار المتخذ سكناً أو للاستعمال الشخصي خارج الوعاء الزكوي.",
    assetType: "real_estate",
    zakatStatus: "exempt",
    conditions: [{ field: "realEstate.use", op: "eq", value: "primary" }],
    exceptions: [],
    madhab: "agreed",
    methodology: "purpose-based",
    sourceId: "SRC-AAOIFI-35",
    reference: "AAOIFI 35 بند (4/4)",
    requiresHumanReview: false,
    effectiveDate: "2026-01-01",
    reviewDate: "2027-01-01",
    reviewer: REVIEWER,
    approval: "approved",
    version: "1.0.0",
  },
  {
    ruleId: "ZR-RE-RENTAL-001",
    name: "العقار المؤجَّر (المستغلات)",
    description:
      "العين لا تُزكّى، والغلة المتبقية عند تمام الحول تُزكّى. مسألة المستغلات فيها خلاف معتبر يُعرض للمستخدم.",
    assetType: "rental",
    zakatStatus: "conditional",
    conditions: [{ field: "realEstate.use", op: "eq", value: "rental" }],
    exceptions: ["نية البيع تحوّل العقار إلى عروض تجارة"],
    madhab: "agreed",
    methodology: "yield-based",
    sourceId: "SRC-AAOIFI-35",
    reference: "AAOIFI 35 بند (4/4/3)",
    divergence: [
      {
        view: "زكاة الغلة المتبقية عند الحول فقط",
        madhab: "majority",
        sourceId: "SRC-AAOIFI-35",
        baseFactor: 0,
        impactNote: "قيمة العقار تُستبعد ويُزكّى الفائض النقدي فقط",
      },
      {
        view: "قول معاصر بزكاة صافي الغلة عند القبض",
        madhab: "contemporary",
        sourceId: "SRC-NADWA-7",
        baseFactor: 0,
        impactNote: "لا أثر على قيمة العين، ويختلف توقيت احتساب الغلة",
      },
    ],
    requiresHumanReview: true,
    effectiveDate: "2026-01-01",
    reviewDate: "2027-01-01",
    reviewer: REVIEWER,
    approval: "approved",
    version: "1.0.0",
  },
  {
    ruleId: "ZR-RE-SALE-001",
    name: "العقار أو الأرض المعدّة للبيع",
    description: "ما أُعدّ للبيع عروض تجارة يُقوَّم بالقيمة السوقية عند الحول.",
    assetType: "real_estate",
    zakatStatus: "zakatable",
    conditions: [{ field: "realEstate.use", op: "in", value: ["for_sale", "development"] }],
    exceptions: [],
    madhab: "agreed",
    methodology: "market-value",
    sourceId: "SRC-AAOIFI-35",
    reference: "AAOIFI 35 بند (4/3)",
    requiresHumanReview: false,
    effectiveDate: "2026-01-01",
    reviewDate: "2027-01-01",
    reviewer: REVIEWER,
    approval: "approved",
    version: "1.0.0",
  },
  {
    ruleId: "ZR-INV-TRADE-001",
    name: "عروض التجارة والمخزون",
    description: "المخزون التجاري يُقوَّم عند الحول وفق سياسة التقييم المعتمدة ويدخل الوعاء.",
    assetType: "inventory",
    zakatStatus: "zakatable",
    conditions: [{ field: "inventory.value", op: "gt", value: 0 }],
    exceptions: ["البضاعة التالفة أو الراكدة بلا قيمة تحقُّق تُستبعد بتوثيق"],
    madhab: "agreed",
    methodology: "valuation-policy",
    sourceId: "SRC-AAOIFI-35",
    reference: "AAOIFI 35 بند (4/3/2)",
    requiresHumanReview: false,
    effectiveDate: "2026-01-01",
    reviewDate: "2027-01-01",
    reviewer: REVIEWER,
    approval: "approved",
    version: "1.0.0",
  },
  {
    ruleId: "ZR-RECV-001",
    name: "الذمم المدينة المرجوّة",
    description: "الدين المرجو الأداء يدخل الوعاء، والمشكوك في تحصيله يُؤجَّل حتى القبض.",
    assetType: "receivables",
    zakatStatus: "conditional",
    conditions: [{ field: "receivables.collectible", op: "eq", value: true }],
    exceptions: ["الديون المعدومة تُستبعد بموجب مخصص موثّق"],
    madhab: "agreed",
    methodology: "collectability",
    sourceId: "SRC-AAOIFI-35",
    reference: "AAOIFI 35 بند (4/2/3)",
    requiresHumanReview: false,
    effectiveDate: "2026-01-01",
    reviewDate: "2027-01-01",
    reviewer: REVIEWER,
    approval: "approved",
    version: "1.0.0",
  },
  {
    ruleId: "ZR-DEBT-SHORT-001",
    name: "خصم الالتزامات المستحقة خلال الحول",
    description: "تُخصم الالتزامات الحالّة أو المستحقة خلال الحول فقط، لا كل الديون.",
    assetType: "debt",
    zakatStatus: "deductible",
    conditions: [{ field: "debt.dueWithinHawl", op: "eq", value: true }],
    exceptions: ["القروض طويلة الأجل لا يُخصم منها إلا القسط المستحق خلال الحول"],
    madhab: "agreed",
    methodology: "due-within-hawl",
    sourceId: "SRC-AAOIFI-35",
    reference: "AAOIFI 35 بند (5/3)",
    divergence: [
      {
        view: "خصم الالتزامات المستحقة خلال الحول",
        madhab: "majority",
        sourceId: "SRC-AAOIFI-35",
        baseFactor: 1,
        impactNote: "الاختيار المعتمد في المنصة",
      },
      {
        view: "خصم كامل الدين ولو كان مؤجلاً",
        madhab: "hanbali",
        sourceId: "SRC-AAOIFI-35",
        baseFactor: 1,
        impactNote: "يقلّل الوعاء بمقدار الأقساط المؤجلة أيضاً",
      },
    ],
    requiresHumanReview: false,
    effectiveDate: "2026-01-01",
    reviewDate: "2027-01-01",
    reviewer: REVIEWER,
    approval: "approved",
    version: "1.0.0",
  },
  {
    ruleId: "ZR-FIXED-001",
    name: "الأصول الثابتة",
    description: "أصول الاقتناء والتشغيل (مبانٍ، آلات، معدات) غير زكوية لعدم قصد المتاجرة.",
    assetType: "fixed_assets",
    zakatStatus: "exempt",
    conditions: [{ field: "fixedAssets.value", op: "gt", value: 0 }],
    exceptions: ["ما أُعدّ للبيع منها يتحول إلى عروض تجارة"],
    madhab: "agreed",
    methodology: "net-current-assets",
    sourceId: "SRC-AAOIFI-35",
    reference: "AAOIFI 35 بند (5/2)",
    requiresHumanReview: false,
    effectiveDate: "2026-01-01",
    reviewDate: "2027-01-01",
    reviewer: REVIEWER,
    approval: "approved",
    version: "1.0.0",
  },
  {
    ruleId: "ZR-CRYPTO-001",
    name: "الأصول الرقمية",
    description:
      "الأصول الرقمية ذات القيمة المالية المتقوّمة تُزكّى كالنقود بقيمتها السوقية عند الحول.",
    assetType: "crypto",
    zakatStatus: "conditional",
    conditions: [{ field: "crypto.value", op: "gt", value: 0 }],
    exceptions: ["الأصول الرقمية غير المتقوّمة أو المحظورة شرعاً"],
    madhab: "agreed",
    methodology: "market-value",
    sourceId: "SRC-IFA-OIC-237",
    reference: "مسألة معاصرة — تحتاج تحقق مصدر واعتماد",
    requiresHumanReview: true,
    effectiveDate: "2026-01-01",
    reviewDate: "2026-07-01",
    reviewer: REVIEWER,
    approval: "under_review",
    version: "0.9.0",
  },
];

/** إصدار الكتالوج — يُختم على كل حساب لضمان إعادة الإنتاج */
export const RULES_CATALOG_VERSION = "2026.1.0";

/* ------------------------------------------------------------------ */
/*                          بوابة التفعيل                              */
/* ------------------------------------------------------------------ */

export interface RuleActivation {
  active: boolean;
  reasons: string[];
}

/**
 * لا تُفعَّل قاعدة في الإنتاج إلا إذا:
 *   1) اعتمادها `approved`
 *   2) مصدرها موجود وحالته `verified`
 *   3) حلّ تاريخ سريانها
 */
export function evaluateRuleActivation(rule: ZakatRule, asOf: Date = new Date()): RuleActivation {
  const reasons: string[] = [];
  if (rule.approval !== "approved") {
    reasons.push(`الاعتماد الحالي «${rule.approval}» وليس «approved»`);
  }
  const src = getSource(rule.sourceId);
  if (!src) {
    reasons.push(`المصدر ${rule.sourceId} غير مسجَّل`);
  } else if (src.verification !== "verified") {
    reasons.push(`المصدر ${rule.sourceId} حالته «${src.verification}»`);
  }
  if (new Date(rule.effectiveDate).getTime() > asOf.getTime()) {
    reasons.push(`تاريخ السريان ${rule.effectiveDate} لم يحلّ بعد`);
  }
  return { active: reasons.length === 0, reasons };
}

/** القواعد المفعّلة فقط — هي وحدها ما يُغذّي محرك الحساب و AI Copilot */
export function getActiveRules(asOf: Date = new Date()): ZakatRule[] {
  return ZAKAT_RULES.filter((r) => evaluateRuleActivation(r, asOf).active);
}

/** القواعد المحجوبة مع سبب الحجب — تُعرض في لوحة الحوكمة */
export function getBlockedRules(
  asOf: Date = new Date(),
): Array<{ rule: ZakatRule; reasons: string[] }> {
  return ZAKAT_RULES.map((rule) => ({ rule, ...evaluateRuleActivation(rule, asOf) }))
    .filter((r) => !r.active)
    .map(({ rule, reasons }) => ({ rule, reasons }));
}

export function getRule(ruleId: string): ZakatRule | undefined {
  return ZAKAT_RULES.find((r) => r.ruleId === ruleId);
}

export function getRulesForAsset(assetType: AssetType, asOf: Date = new Date()): ZakatRule[] {
  return getActiveRules(asOf).filter((r) => r.assetType === assetType);
}

/** القواعد التي توجب مراجعة بشرية — تُرفع تلقائياً لطابور الاستثناءات */
export function getHumanReviewRules(asOf: Date = new Date()): ZakatRule[] {
  return getActiveRules(asOf).filter((r) => r.requiresHumanReview);
}

/* ------------------------------------------------------------------ */
/*                       الأثر الرقمي للخلاف                           */
/* ------------------------------------------------------------------ */

export interface DivergenceImpact {
  view: string;
  madhab: RuleDivergence["madhab"];
  sourceCitation: string;
  /** قيمة البند وفق هذا القول */
  itemValue: number;
  /** الوعاء الكلي لو أُخذ بهذا القول */
  resultingBase: number;
  /** الزكاة المستحقة وفق هذا القول */
  resultingZakat: number;
  /** الفرق عن الاختيار المعتمد */
  deltaVsSelected: number;
  impactNote: string;
}

/**
 * يحسب أثر كل قول مخالف رقمياً — يجيب سؤال المستخدم:
 * «لو اخترت القول الآخر، تصبح الزكاة كم؟»
 *
 * @param rule       القاعدة ذات الخلاف
 * @param itemValue  قيمة البند محل الخلاف
 * @param otherBase  باقي الوعاء (بدون هذا البند)
 * @param rate       معدل الزكاة المطبَّق (0.025 أو 0.02577)
 * @param selectedFactor معامل القول المعتمد حالياً في المنصة
 */
export function computeDivergenceImpact(
  rule: ZakatRule,
  itemValue: number,
  otherBase: number,
  rate: number,
  selectedFactor: number,
): DivergenceImpact[] {
  if (!rule.divergence?.length) return [];
  const selectedZakat = Math.max(0, otherBase + itemValue * selectedFactor) * rate;

  return rule.divergence.map((d) => {
    const value = itemValue * d.baseFactor;
    const base = Math.max(0, otherBase + value);
    const zakat = base * rate;
    return {
      view: d.view,
      madhab: d.madhab,
      sourceCitation: getSource(d.sourceId)?.citation ?? d.sourceId,
      itemValue: +value.toFixed(2),
      resultingBase: +base.toFixed(2),
      resultingZakat: +zakat.toFixed(2),
      deltaVsSelected: +(zakat - selectedZakat).toFixed(2),
      impactNote: d.impactNote,
    };
  });
}

/* ------------------------------------------------------------------ */
/*                        سلامة الكتالوج                               */
/* ------------------------------------------------------------------ */

export interface CatalogIntegrityIssue {
  ruleId: string;
  issue: string;
}

/** فحص سلامة يُشغَّل في الاختبارات ولوحة الحوكمة */
export function validateCatalog(): CatalogIntegrityIssue[] {
  const issues: CatalogIntegrityIssue[] = [];
  const seen = new Set<string>();

  for (const rule of ZAKAT_RULES) {
    if (seen.has(rule.ruleId)) issues.push({ ruleId: rule.ruleId, issue: "معرّف قاعدة مكرر" });
    seen.add(rule.ruleId);

    if (!getSource(rule.sourceId)) {
      issues.push({ ruleId: rule.ruleId, issue: `مصدر غير مسجَّل: ${rule.sourceId}` });
    }
    if (!rule.conditions.length) {
      issues.push({ ruleId: rule.ruleId, issue: "قاعدة بلا شروط قابلة للتقييم" });
    }
    if (new Date(rule.reviewDate) <= new Date(rule.effectiveDate)) {
      issues.push({ ruleId: rule.ruleId, issue: "تاريخ المراجعة يجب أن يلي تاريخ السريان" });
    }
    for (const d of rule.divergence ?? []) {
      if (!getSource(d.sourceId)) {
        issues.push({ ruleId: rule.ruleId, issue: `مصدر قول مخالف غير مسجَّل: ${d.sourceId}` });
      }
    }
    if (rule.approval === "approved" && getSource(rule.sourceId)?.verification !== "verified") {
      issues.push({ ruleId: rule.ruleId, issue: "قاعدة معتمدة بمصدر غير متحقَّق" });
    }
  }
  return issues;
}
