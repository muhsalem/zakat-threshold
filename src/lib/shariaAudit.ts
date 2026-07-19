/**
 * Sharia Compliance & Governance Review Engine
 * --------------------------------------------
 * مراجعة شرعية شاملة آلية على ميزان مراجعة مصنّف زكوياً (مرفوع كملف أو مسحوب من ERP):
 *   1) الشرعية:  كشف البنود الربوية والأنشطة المحرمة، ومعالجة التطهير.
 *   2) الامتثال: مطابقة المعالجة لمعيار AAOIFI الشرعي 35 وFAS 9 وقرارات المجامع.
 *   3) الحوكمة:  سلامة البيانات (توازن الميزان)، اكتمال التصنيف، توثيق المنهجية والنصاب والحول.
 * يُرجع قائمة نتائج مرجعية بدرجة خطورة + درجة امتثال إجمالية (0–100).
 */
import type { ClassifiedRow } from "./erp/zakatMapping";
import type { ZakatComputation } from "./erp/zakatMapping";

export type FindingSeverity = "pass" | "info" | "warning" | "violation";
export type FindingDimension = "sharia" | "compliance" | "governance";

export interface ShariaFinding {
  id: string;
  dimension: FindingDimension;
  severity: FindingSeverity;
  title: string;
  detail: string;
  /** المرجع الشرعي/المعياري */
  reference: string;
  /** الحسابات المعنية إن وُجدت */
  accounts?: string[];
}

export interface ShariaReviewResult {
  findings: ShariaFinding[];
  /** درجة الامتثال 0–100 */
  score: number;
  grade: "ممتاز" | "جيد" | "يحتاج مراجعة" | "غير مطابق";
  counts: Record<FindingSeverity, number>;
  standard: "AAOIFI-SS-35";
  generated_at: string;
}

export interface ShariaReviewInput {
  rows: ClassifiedRow[];
  computation: ZakatComputation;
  /** إجمالي المدين/الدائن لفحص توازن الميزان (إن توفر من الملف) */
  totals?: { debit: number; credit: number };
  /** حالة الحول إن كانت معلومة */
  hawlComplete?: boolean | null;
  calendar?: "hijri" | "gregorian";
  /** بنود استُخرجت بثقة منخفضة (مسار الذكاء الاصطناعي) وتحتاج تأكيداً بشرياً */
  lowConfidence?: string[];
}

/* --------------------- كلمات الكشف الشرعي --------------------- */

const RIBA_WORDS = [
  "فوائد",
  "فائدة",
  "ربوي",
  "ربا",
  "interest",
  "usury",
  "فوائد بنكية",
  "فوائد دائنة",
  "فوائد مدينة",
];

const HARAM_ACTIVITY_WORDS = [
  "خمر",
  "خمور",
  "كحول",
  "تبغ",
  "سجائر",
  "دخان",
  "قمار",
  "ميسر",
  "يانصيب",
  "خنزير",
  "alcohol",
  "liquor",
  "tobacco",
  "cigarette",
  "gambling",
  "casino",
  "lottery",
  "pork",
];

const CONVENTIONAL_INSURANCE_WORDS = ["تأمين تجاري", "conventional insurance"];

const matchWords = (text: string, words: string[]) => {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w.toLowerCase()));
};

/* --------------------------- المحرك --------------------------- */

export function runShariaComplianceReview(input: ShariaReviewInput): ShariaReviewResult {
  const { rows, computation: c } = input;
  const findings: ShariaFinding[] = [];
  const push = (f: Omit<ShariaFinding, "id">, id: string) => findings.push({ id, ...f });

  /* ============ 1) البعد الشرعي ============ */

  // كشف البنود الربوية
  const ribaAccounts = rows.filter((r) => matchWords(`${r.code} ${r.name}`, RIBA_WORDS));
  if (ribaAccounts.length) {
    push(
      {
        dimension: "sharia",
        severity: "violation",
        title: "بنود ربوية مكتشفة — يجب التطهير",
        detail:
          "وُجدت حسابات تتضمن فوائد ربوية. العوائد الربوية لا تدخل في الوعاء الزكوي ولا تُملك شرعاً، ويجب التخلص منها بصرفها في وجوه الخير العامة (التطهير) دون احتسابها من الزكاة. أما القروض الربوية فيُخصم أصل الدين المستحق خلال الحول فقط دون فوائده.",
        reference: "المعيار الشرعي 21 (الأوراق المالية) · قرار مجمع الفقه الإسلامي الدولي 10/2",
        accounts: ribaAccounts.map((r) => `${r.code} ${r.name}`).slice(0, 8),
      },
      "riba_detected",
    );
  } else {
    push(
      {
        dimension: "sharia",
        severity: "pass",
        title: "لا بنود ربوية ظاهرة",
        detail: "لم تُكتشف حسابات فوائد أو بنود ربوية في مسميات الميزان.",
        reference: "المعيار الشرعي 21",
      },
      "riba_clear",
    );
  }

  // كشف الأنشطة المحرمة
  const haramAccounts = rows.filter((r) => matchWords(`${r.code} ${r.name}`, HARAM_ACTIVITY_WORDS));
  if (haramAccounts.length) {
    push(
      {
        dimension: "sharia",
        severity: "violation",
        title: "بنود مرتبطة بأنشطة محرمة",
        detail:
          "وُجدت حسابات قد ترتبط بأنشطة محرمة (خمور/تبغ/قمار/لحوم محرمة). الكسب من المحرم لا يُزكّى بل يُتخلص منه كاملاً، والزكاة لا تُطهّر المال الحرام. تلزم مراجعة بشرية عاجلة من المستشار الشرعي.",
        reference: "المعيار الشرعي 35 — الزكاة · قرارات الندوات الفقهية لقضايا الزكاة",
        accounts: haramAccounts.map((r) => `${r.code} ${r.name}`).slice(0, 8),
      },
      "haram_activity",
    );
  }

  // تأمين تجاري
  const convIns = rows.filter((r) =>
    matchWords(`${r.code} ${r.name}`, CONVENTIONAL_INSURANCE_WORDS),
  );
  if (convIns.length) {
    push(
      {
        dimension: "sharia",
        severity: "warning",
        title: "بنود تأمين تجاري",
        detail:
          "وُجدت بنود تأمين تجاري (غير تكافلي). يُراجع موقفها الشرعي: أقساط التأمين التجاري المدفوعة لا تُزكى، والتعويضات تُزكى عند القبض لحول جديد.",
        reference: "المعيار الشرعي 26 (التأمين الإسلامي)",
        accounts: convIns.map((r) => `${r.code} ${r.name}`).slice(0, 8),
      },
      "conventional_insurance",
    );
  }

  /* ============ 2) بعد الامتثال للمعايير ============ */

  // معالجة الأصول الثابتة
  const fixedTotal = c.totalsByCategory.fixed_assets ?? 0;
  push(
    {
      dimension: "compliance",
      severity: "pass",
      title: "الأصول الثابتة مستبعدة من الوعاء",
      detail: `استُبعدت الأصول الثابتة والمقتناة للاستخدام (${fixedTotal.toLocaleString("ar-EG")}) من الوعاء الزكوي، إذ لا زكاة في عروض القُنية.`,
      reference: "AAOIFI المعيار الشرعي 35 — البند 5/4",
    },
    "fixed_assets_excluded",
  );

  // معالجة الالتزامات طويلة الأجل
  const ltl = c.totalsByCategory.long_term_liabilities ?? 0;
  if (ltl > 0) {
    push(
      {
        dimension: "compliance",
        severity: "info",
        title: "التزامات طويلة الأجل لم تُخصم",
        detail: `الالتزامات طويلة الأجل (${ltl.toLocaleString("ar-EG")}) لا تُخصم من الوعاء إلا ما يستحق سداده خلال الحول. إن كان جزء منها مستحقاً خلال السنة فصنّفه يدوياً «التزامات قصيرة الأجل».`,
        reference: "AAOIFI المعيار الشرعي 35 — البند 6/2 · الندوة الأولى لقضايا الزكاة المعاصرة",
      },
      "lt_liabilities_not_deducted",
    );
  }

  // معدل الزكاة حسب أساس الحول
  const expectedRate = input.calendar === "gregorian" ? 0.02577 : 0.025;
  if (Math.abs(c.rate - expectedRate) < 1e-9) {
    push(
      {
        dimension: "compliance",
        severity: "pass",
        title: `معدل الزكاة صحيح (${(c.rate * 100).toFixed(3)}%)`,
        detail:
          input.calendar === "gregorian"
            ? "طُبّق معدل 2.577% لاحتساب الحول بالسنة الميلادية (الشمسية)."
            : "طُبّق معدل 2.5% للحول الهجري القمري (354 يوماً).",
        reference: "توصية الندوة السابعة لقضايا الزكاة المعاصرة",
      },
      "rate_correct",
    );
  } else {
    push(
      {
        dimension: "compliance",
        severity: "violation",
        title: "معدل الزكاة لا يطابق أساس الحول",
        detail: `المعدل المطبق ${(c.rate * 100).toFixed(3)}% بينما أساس الحول ${input.calendar === "gregorian" ? "ميلادي يقتضي 2.577%" : "هجري يقتضي 2.5%"}.`,
        reference: "توصية الندوة السابعة لقضايا الزكاة المعاصرة",
      },
      "rate_mismatch",
    );
  }

  // النصاب
  if (c.nisab > 0) {
    push(
      {
        dimension: "compliance",
        severity: "pass",
        title: c.eligible ? "الوعاء بلغ النصاب" : "الوعاء دون النصاب — لا زكاة واجبة",
        detail: c.eligible
          ? `الوعاء (${c.zakatBase.toLocaleString("ar-EG")}) بلغ النصاب (${c.nisab.toLocaleString("ar-EG")}) فوجبت الزكاة.`
          : `الوعاء (${c.zakatBase.toLocaleString("ar-EG")}) لم يبلغ النصاب (${c.nisab.toLocaleString("ar-EG")}) فلا تجب الزكاة، وتُستحب الصدقة.`,
        reference: "حديث «ليس فيما دون خمس أواقٍ صدقة» · نصاب الذهب 85 جم",
      },
      "nisab_checked",
    );
  } else {
    push(
      {
        dimension: "governance",
        severity: "warning",
        title: "النصاب غير محدد",
        detail:
          "لم يُدخل نصاب للمقارنة. حدّد النصاب من سعر 85 جراماً من الذهب يوم وجوب الزكاة لضمان صحة القرار (تجب/لا تجب).",
        reference: "AAOIFI المعيار الشرعي 35 — البند 7",
      },
      "nisab_missing",
    );
  }

  // الحول
  if (input.hawlComplete === true) {
    push(
      {
        dimension: "compliance",
        severity: "pass",
        title: "الحول مكتمل",
        detail: "دار الحول على الوعاء فوجب إخراج الزكاة.",
        reference: "حديث «لا زكاة في مال حتى يحول عليه الحول»",
      },
      "hawl_complete",
    );
  } else if (input.hawlComplete === false) {
    push(
      {
        dimension: "compliance",
        severity: "warning",
        title: "الحول لم يكتمل بعد",
        detail: "الزكاة تجب عند تمام الحول. يمكن التعجيل بها جوازاً عند جمهور الفقهاء.",
        reference: "المعيار الشرعي 35 — شرط الحول",
      },
      "hawl_incomplete",
    );
  } else {
    push(
      {
        dimension: "governance",
        severity: "info",
        title: "تاريخ الحول غير محدد في هذه المراجعة",
        detail: "حدّد تاريخ بداية حول الزكاة (تاريخ بلوغ النصاب) لتوثيق اكتمال الحول في التقرير.",
        reference: "المعيار الشرعي 35 — شرط الحول",
      },
      "hawl_unknown",
    );
  }

  /* ============ 3) بعد الحوكمة وسلامة البيانات ============ */

  // توازن الميزان
  if (input.totals) {
    const diff = Math.abs(input.totals.debit - input.totals.credit);
    if (diff <= 1) {
      push(
        {
          dimension: "governance",
          severity: "pass",
          title: "الميزان متوازن",
          detail: `إجمالي المدين يساوي إجمالي الدائن (فرق ${diff.toFixed(2)}).`,
          reference: "مبادئ الحوكمة الشرعية — سلامة البيانات المصدرية",
        },
        "balance_ok",
      );
    } else {
      push(
        {
          dimension: "governance",
          severity: "violation",
          title: "الميزان غير متوازن",
          detail: `فرق بين المدين والدائن قدره ${diff.toLocaleString("ar-EG")}. قوائم غير متوازنة تُبطل موثوقية الحساب — راجع الملف المصدر قبل اعتماد النتيجة.`,
          reference: "مبادئ الحوكمة الشرعية — سلامة البيانات المصدرية",
        },
        "balance_broken",
      );
    }
  }

  // اكتمال التصنيف
  const unclassified = rows.filter((r) => r.source === "default");
  const unclassifiedRatio = rows.length ? unclassified.length / rows.length : 0;
  if (unclassifiedRatio > 0.1) {
    push(
      {
        dimension: "governance",
        severity: "warning",
        title: `حسابات غير مصنفة (${unclassified.length} من ${rows.length})`,
        detail:
          "نسبة مرتفعة من الحسابات لم تتعرف عليها قواعد التصنيف واستُبعدت افتراضياً. راجعها وصنّفها يدوياً حتى لا يُبخس الوعاء.",
        reference: "مبادئ الحوكمة الشرعية — اكتمال البيانات",
        accounts: unclassified.map((r) => `${r.code} ${r.name}`).slice(0, 8),
      },
      "unclassified_high",
    );
  } else {
    push(
      {
        dimension: "governance",
        severity: "pass",
        title: "اكتمال التصنيف",
        detail: `${rows.length - unclassified.length} من ${rows.length} حساباً صُنّف بقاعدة معلومة (نوع الحساب/كلمات مفتاحية/تخصيص يدوي).`,
        reference: "مبادئ الحوكمة الشرعية — اكتمال البيانات",
      },
      "classification_complete",
    );
  }

  // بنود منخفضة الثقة (مسار الاستخراج بالذكاء الاصطناعي)
  if (input.lowConfidence && input.lowConfidence.length > 0) {
    push(
      {
        dimension: "governance",
        severity: "warning",
        title: `بنود منخفضة الثقة (${input.lowConfidence.length}) — تأكيد بشري لازم`,
        detail:
          "استُخرجت هذه البنود آلياً بدرجة ثقة منخفضة. المخرجات الآلية لا تُعتمد شرعاً دون مراجعة بشرية من محاسب/مستشار شرعي، خاصة قبل إصدار تقرير معتمد.",
        reference:
          "مبادئ الحوكمة الشرعية — المعيار الشرعي للحوكمة (AAOIFI GS) · مسؤولية المراجعة البشرية",
        accounts: input.lowConfidence.slice(0, 8),
      },
      "low_confidence_items",
    );
  }

  // توثيق المنهجية
  push(
    {
      dimension: "governance",
      severity: "pass",
      title: "منهجية موثقة ومرجعية",
      detail:
        "احتُسب الوعاء بطريقة صافي الأصول الزكوية (نقد + ذمم مرجوّة + عروض تجارة + استثمارات متاجرة − التزامات قصيرة الأجل) مع إسناد كل معالجة لمرجعها.",
      reference: "AAOIFI المعيار الشرعي 35 · FAS 9 (المحاسبة عن الزكاة)",
    },
    "methodology_documented",
  );

  /* ------------------------- النتيجة ------------------------- */

  const counts: Record<FindingSeverity, number> = { pass: 0, info: 0, warning: 0, violation: 0 };
  for (const f of findings) counts[f.severity]++;

  let score = 100 - counts.violation * 20 - counts.warning * 7;
  score = Math.max(0, Math.min(100, score));
  const grade =
    counts.violation > 0
      ? score >= 60
        ? "يحتاج مراجعة"
        : "غير مطابق"
      : score >= 90
        ? "ممتاز"
        : score >= 75
          ? "جيد"
          : "يحتاج مراجعة";

  return {
    findings,
    score,
    grade,
    counts,
    standard: "AAOIFI-SS-35",
    generated_at: new Date().toISOString(),
  };
}
