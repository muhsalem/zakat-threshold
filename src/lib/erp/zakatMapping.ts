/**
 * Zakat Account Mapping Engine — تصنيف حسابات ميزان المراجعة زكوياً حسب كل ERP
 * ---------------------------------------------------------------------------
 * يحوّل ميزان مراجعة قادم من أي ERP إلى تصنيف زكوي موحّد وفق AAOIFI 35
 * (طريقة صافي الأصول المتداولة)، مع قواعد تصنيف مخصّصة لكل مزوّد:
 *   - Odoo:   عبر حقل account_type الرسمي (asset_cash, asset_receivable, ...)
 *   - SAP:    عبر نطاقات أكواد دليل الحسابات + الكلمات المفتاحية
 *   - Generic: عبر الكلمات المفتاحية (عربي/إنجليزي) — للملفات المرفوعة يدوياً
 * ثم يسمح بتجاوزات يدوية لكل حساب (تُحفظ لكل اتصال في erp_connections.extra).
 *
 * قاعدة الحساب (AAOIFI 35 — صافي الأصول الزكوية):
 *   الوعاء = (نقد + ذمم مرجوّة + مخزون تجاري + استثمارات متاجرة)
 *          − (التزامات قصيرة الأجل مستحقة خلال الحول)
 *   الزكاة = الوعاء × 2.5% (هجري) أو 2.577% (ميلادي) إن بلغ النصاب.
 */

export type ZakatCategory =
  | "cash" // النقد وما في حكمه — زكوي
  | "receivables" // الذمم المدينة المرجوّة — زكوي
  | "inventory" // المخزون / عروض التجارة — زكوي
  | "investments" // استثمارات بغرض المتاجرة — زكوي
  | "fixed_assets" // أصول ثابتة وطويلة الأجل — غير زكوي
  | "prepayments" // مصروفات مدفوعة مقدماً — غير زكوي (الراجح)
  | "current_liabilities" // التزامات قصيرة الأجل — تُخصم
  | "long_term_liabilities" // التزامات طويلة الأجل — لا تُخصم (إلا المستحق خلال الحول)
  | "equity" // حقوق ملكية — مستبعد
  | "excluded"; // إيرادات/مصروفات/أخرى — مستبعد

export interface CategoryMeta {
  labelAr: string;
  zakatable: boolean; // يدخل في الوعاء موجباً
  deductible: boolean; // يُخصم من الوعاء
}

export const ZAKAT_CATEGORIES: Record<ZakatCategory, CategoryMeta> = {
  cash: { labelAr: "نقد وما في حكمه", zakatable: true, deductible: false },
  receivables: { labelAr: "ذمم مدينة مرجوّة", zakatable: true, deductible: false },
  inventory: { labelAr: "مخزون / عروض تجارة", zakatable: true, deductible: false },
  investments: { labelAr: "استثمارات متاجرة", zakatable: true, deductible: false },
  fixed_assets: { labelAr: "أصول ثابتة (غير زكوية)", zakatable: false, deductible: false },
  prepayments: { labelAr: "مدفوعات مقدمة (غير زكوية)", zakatable: false, deductible: false },
  current_liabilities: { labelAr: "التزامات قصيرة الأجل (تُخصم)", zakatable: false, deductible: true },
  long_term_liabilities: { labelAr: "التزامات طويلة الأجل (لا تُخصم)", zakatable: false, deductible: false },
  equity: { labelAr: "حقوق ملكية (مستبعد)", zakatable: false, deductible: false },
  excluded: { labelAr: "مستبعد من الوعاء", zakatable: false, deductible: false },
};

export interface TrialBalanceRow {
  code: string;
  name: string;
  /** الرصيد الموقّع: مدين موجب / دائن سالب (اتفاقية Odoo balance = debit − credit) */
  balance: number;
  /** نوع الحساب كما يرويه الـ ERP (مثل account_type في Odoo أو GLAccountType في SAP) */
  erpType?: string;
}

export interface ClassifiedRow extends TrialBalanceRow {
  category: ZakatCategory;
  /** مصدر التصنيف: قاعدة المزوّد / كلمات مفتاحية / تجاوز يدوي */
  source: "provider_rule" | "keyword" | "override" | "default";
}

/* ------------------------------------------------------------------ */
/*                        قواعد التصنيف لكل مزوّد                       */
/* ------------------------------------------------------------------ */

/** Odoo 16/17 — account.account.account_type الرسمية */
const ODOO_TYPE_MAP: Record<string, ZakatCategory> = {
  asset_cash: "cash",
  asset_receivable: "receivables",
  asset_current: "inventory", // الأصول المتداولة الأخرى — تُنقّح بالكلمات المفتاحية أدناه
  asset_prepayments: "prepayments",
  asset_fixed: "fixed_assets",
  asset_non_current: "fixed_assets",
  liability_payable: "current_liabilities",
  liability_credit_card: "current_liabilities",
  liability_current: "current_liabilities",
  liability_non_current: "long_term_liabilities",
  equity: "equity",
  equity_unaffected: "equity",
  income: "excluded",
  income_other: "excluded",
  expense: "excluded",
  expense_depreciation: "excluded",
  expense_direct_cost: "excluded",
  off_balance: "excluded",
};

/** كلمات مفتاحية عربي/إنجليزي — مشتركة لكل المزوّدين كطبقة تنقيح/احتياط */
const KEYWORD_RULES: Array<{ cat: ZakatCategory; words: string[] }> = [
  { cat: "cash", words: ["نقد", "صندوق", "بنك", "خزينة", "cash", "bank", "petty"] },
  {
    cat: "receivables",
    words: ["ذمم مدينة", "عملاء", "مدينون", "أوراق قبض", "receivable", "debtor", "accounts receivable"],
  },
  { cat: "inventory", words: ["مخزون", "بضاعة", "مواد خام", "إنتاج تام", "inventory", "stock", "goods", "merchandise"] },
  {
    cat: "investments",
    words: ["استثمار", "أوراق مالية", "أسهم", "صكوك", "محفظة", "ذهب", "فضة", "معادن ثمينة", "investment", "securities", "trading", "marketable", "gold", "silver"],
  },
  {
    cat: "fixed_assets",
    words: ["أصول ثابتة", "مباني", "أراضي", "آلات", "معدات", "سيارات", "أثاث", "إهلاك", "شهرة", "fixed asset", "ppe", "property", "equipment", "vehicle", "depreciation", "goodwill", "intangible"],
  },
  { cat: "prepayments", words: ["مقدم", "مدفوعات مقدمة", "تأمينات لدى الغير", "prepaid", "advance to"] },
  {
    cat: "current_liabilities",
    words: ["ذمم دائنة", "موردون", "دائنون", "أوراق دفع", "مستحقات", "ضريبة مستحقة", "رواتب مستحقة", "payable", "creditor", "accrued", "vat", "salaries payable"],
  },
  {
    cat: "long_term_liabilities",
    words: ["قرض طويل", "قروض طويلة", "سندات", "التزام طويل", "long term", "long-term", "bonds", "loan - lt"],
  },
  { cat: "equity", words: ["رأس المال", "أرباح مرحلة", "احتياطي", "جاري الشريك", "capital", "equity", "retained", "reserve"] },
];

function classifyByKeywords(row: TrialBalanceRow): ZakatCategory | null {
  const text = `${row.code} ${row.name}`.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.words.some((w) => text.includes(w.toLowerCase()))) return rule.cat;
  }
  return null;
}

/** SAP — نطاقات أكواد دليل الحسابات القياسية (قابلة للتخصيص لاحقاً لكل شركة) */
const SAP_CODE_RULES: Array<{ prefixes: string[]; cat: ZakatCategory }> = [
  { prefixes: ["10", "11"], cat: "cash" }, // 10xxxx نقدية وبنوك
  { prefixes: ["12", "13"], cat: "receivables" }, // 12xxxx ذمم مدينة
  { prefixes: ["14"], cat: "inventory" }, // 14xxxx مخزون
  { prefixes: ["15"], cat: "investments" }, // 15xxxx أوراق مالية قصيرة
  { prefixes: ["16", "17", "18", "19", "2"], cat: "fixed_assets" }, // أصول غير متداولة
  { prefixes: ["31", "32", "33", "34"], cat: "current_liabilities" }, // دائنون ومستحقات
  { prefixes: ["35", "36", "37"], cat: "long_term_liabilities" }, // قروض طويلة
  { prefixes: ["3"], cat: "current_liabilities" }, // باقي 3xxxxx التزامات — الافتراضي قصير الأجل
  { prefixes: ["4", "5", "6", "7", "8"], cat: "excluded" }, // إيرادات/مصروفات
  { prefixes: ["9"], cat: "equity" },
];

function classifySapByCode(row: TrialBalanceRow): ZakatCategory | null {
  const code = row.code.replace(/^0+/, "");
  for (const rule of SAP_CODE_RULES) {
    if (rule.prefixes.some((p) => code.startsWith(p))) return rule.cat;
  }
  return null;
}

export type MappingProvider = "odoo" | "sap" | "generic";

/** تجاوزات يدوية لكل حساب: { "1101": "cash", ... } — تُحفظ لكل اتصال */
export type MappingOverrides = Record<string, ZakatCategory>;

/**
 * التصنيف الرئيسي: قاعدة المزوّد أولاً، ثم تنقيح بالكلمات المفتاحية عند الغموض،
 * ثم التجاوز اليدوي فوق الجميع.
 */
export function classifyTrialBalance(
  rows: TrialBalanceRow[],
  provider: MappingProvider,
  overrides: MappingOverrides = {},
): ClassifiedRow[] {
  return rows.map((row) => {
    // 1) التجاوز اليدوي يتقدم على كل القواعد
    const override = overrides[row.code];
    if (override && override in ZAKAT_CATEGORIES) {
      return { ...row, category: override, source: "override" as const };
    }

    // 2) قاعدة المزوّد
    let cat: ZakatCategory | null = null;
    let source: ClassifiedRow["source"] = "provider_rule";

    if (provider === "odoo" && row.erpType && ODOO_TYPE_MAP[row.erpType]) {
      cat = ODOO_TYPE_MAP[row.erpType];
      // asset_current في Odoo سلة واسعة: ننقّحها بالكلمات المفتاحية إن وُجدت إشارة أدق
      if (row.erpType === "asset_current") {
        const kw = classifyByKeywords(row);
        if (kw && ["cash", "receivables", "inventory", "investments", "prepayments"].includes(kw)) {
          cat = kw;
          source = "keyword";
        }
      }
    } else if (provider === "sap") {
      // الكلمات المفتاحية أولاً (أدق من نطاقات الأكواد عند تعريب الأسماء)
      const kw = classifyByKeywords(row);
      if (kw) {
        cat = kw;
        source = "keyword";
      } else {
        cat = classifySapByCode(row);
      }
    }

    // 3) احتياط: كلمات مفتاحية لأي مزوّد
    if (!cat) {
      const kw = classifyByKeywords(row);
      if (kw) {
        cat = kw;
        source = "keyword";
      }
    }

    return {
      ...row,
      category: cat ?? "excluded",
      source: cat ? source : ("default" as const),
    };
  });
}

/* ------------------------------------------------------------------ */
/*                          حساب الوعاء والزكاة                         */
/* ------------------------------------------------------------------ */

export interface ZakatComputationOptions {
  /** النصاب بعملة الميزان (0 = بدون فحص نصاب) */
  nisab?: number;
  /** أساس الحول: يحدد المعدّل 2.5% أو 2.577% */
  calendar?: "hijri" | "gregorian";
}

export interface ZakatComputation {
  totalsByCategory: Record<ZakatCategory, number>;
  zakatableAssets: number;
  deductibleLiabilities: number;
  zakatBase: number;
  nisab: number;
  eligible: boolean;
  rate: number;
  zakatDue: number;
  standard: "AAOIFI-35";
  rowCount: number;
}

export const HIJRI_RATE = 0.025;
export const GREGORIAN_RATE = 0.02577; // توصية الندوة السابعة لقضايا الزكاة

export function computeZakatFromTrialBalance(
  rows: ClassifiedRow[],
  opts: ZakatComputationOptions = {},
): ZakatComputation {
  const totals = Object.fromEntries(
    (Object.keys(ZAKAT_CATEGORIES) as ZakatCategory[]).map((c) => [c, 0]),
  ) as Record<ZakatCategory, number>;

  for (const row of rows) {
    const meta = ZAKAT_CATEGORIES[row.category];
    if (meta.zakatable) {
      // أصول: الرصيد المدين الموجب فقط (الحساب المقابل السالب لا يزيد الوعاء)
      totals[row.category] += Math.max(0, row.balance);
    } else if (meta.deductible) {
      // التزامات: الرصيد الدائن (سالب بالاتفاقية) يُقلب موجباً للخصم
      totals[row.category] += Math.max(0, -row.balance);
    } else {
      totals[row.category] += Math.abs(row.balance);
    }
  }

  const zakatableAssets = (Object.keys(ZAKAT_CATEGORIES) as ZakatCategory[])
    .filter((c) => ZAKAT_CATEGORIES[c].zakatable)
    .reduce((s, c) => s + totals[c], 0);
  const deductibleLiabilities = (Object.keys(ZAKAT_CATEGORIES) as ZakatCategory[])
    .filter((c) => ZAKAT_CATEGORIES[c].deductible)
    .reduce((s, c) => s + totals[c], 0);

  const zakatBase = Math.max(0, zakatableAssets - deductibleLiabilities);
  const nisab = Math.max(0, opts.nisab ?? 0);
  const eligible = nisab === 0 ? zakatBase > 0 : zakatBase >= nisab;
  const rate = opts.calendar === "gregorian" ? GREGORIAN_RATE : HIJRI_RATE;
  const zakatDue = eligible ? +(zakatBase * rate).toFixed(2) : 0;

  return {
    totalsByCategory: totals,
    zakatableAssets: +zakatableAssets.toFixed(2),
    deductibleLiabilities: +deductibleLiabilities.toFixed(2),
    zakatBase: +zakatBase.toFixed(2),
    nisab,
    eligible,
    rate,
    zakatDue,
    standard: "AAOIFI-35",
    rowCount: rows.length,
  };
}
