/**
 * Debt Engine — محرك معالجة الديون
 * ---------------------------------
 * يسدّ الفجوة (10): مصفوفة صريحة `نوع الدين → الأجل → المنهجية → المعالجة`.
 *
 * القاعدة الحاكمة: لا يُفترض خصم كل الديون تلقائياً. الأصل خصم ما هو
 * حالٌّ أو مستحق خلال الحول فقط (AAOIFI 35 بند 5/3)، مع إتاحة منهجية
 * بديلة معتبرة تُختار صراحةً وتُوثَّق في التقرير.
 */

export type DebtDirection = "payable" | "receivable";

export type DebtType =
  | "trade_payable" // ذمم دائنة تجارية
  | "accrued_expense" // مصروفات مستحقة
  | "tax_payable" // ضرائب/رسوم مستحقة
  | "salaries_payable" // رواتب مستحقة
  | "short_term_loan" // قرض قصير الأجل
  | "long_term_loan" // قرض طويل الأجل
  | "installment_plan" // تسهيلات بأقساط
  | "shareholder_loan" // جاري الشركاء
  | "trade_receivable" // ذمم مدينة تجارية
  | "loan_to_others" // قرض للغير
  | "doubtful_receivable"; // دين مشكوك في تحصيله

export type DebtMethodology =
  | "due-within-hawl" // المعتمد: يُخصم المستحق خلال الحول
  | "full-deduction" // قول معتبر: يُخصم كامل الدين
  | "no-deduction"; // منهجية مؤسسية: لا خصم إطلاقاً

export type DebtTreatment =
  | "deduct_full" // يُخصم بالكامل
  | "deduct_due_portion" // يُخصم القسط المستحق خلال الحول
  | "no_effect" // لا أثر على الوعاء
  | "add_full" // يُضاف للوعاء (دين مرجو)
  | "defer_until_received"; // يؤجَّل حتى القبض

export interface DebtInput {
  id: string;
  label: string;
  type: DebtType;
  /** إجمالي رصيد الدين (موجب دائماً) */
  amount: number;
  /** المبلغ المستحق السداد/التحصيل خلال الحول الحالي */
  dueWithinHawl?: number;
  /** للذمم المدينة: هل الدين مرجو الأداء؟ */
  collectible?: boolean;
}

export interface DebtLine extends DebtInput {
  direction: DebtDirection;
  treatment: DebtTreatment;
  /** الأثر الموقّع على الوعاء: سالب يخصم، موجب يضيف */
  baseEffect: number;
  ruleId: string;
  rationale: string;
}

export interface DebtEngineResult {
  lines: DebtLine[];
  /** مجموع ما يُخصم من الوعاء (قيمة موجبة) */
  totalDeductible: number;
  /** مجموع ما يُضاف للوعاء من الديون المرجوّة */
  totalAddable: number;
  /** مجموع ما أُجّل حتى القبض */
  totalDeferred: number;
  /** صافي الأثر على الوعاء (موجب يزيد، سالب ينقص) */
  netBaseEffect: number;
  methodology: DebtMethodology;
}

const DIRECTION: Record<DebtType, DebtDirection> = {
  trade_payable: "payable",
  accrued_expense: "payable",
  tax_payable: "payable",
  salaries_payable: "payable",
  short_term_loan: "payable",
  long_term_loan: "payable",
  installment_plan: "payable",
  shareholder_loan: "payable",
  trade_receivable: "receivable",
  loan_to_others: "receivable",
  doubtful_receivable: "receivable",
};

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  trade_payable: "ذمم دائنة تجارية",
  accrued_expense: "مصروفات مستحقة",
  tax_payable: "ضرائب ورسوم مستحقة",
  salaries_payable: "رواتب مستحقة",
  short_term_loan: "قرض قصير الأجل",
  long_term_loan: "قرض طويل الأجل",
  installment_plan: "تسهيلات بأقساط",
  shareholder_loan: "جاري الشركاء",
  trade_receivable: "ذمم مدينة تجارية",
  loan_to_others: "قرض للغير",
  doubtful_receivable: "دين مشكوك في تحصيله",
};

export const DEBT_TREATMENT_LABELS: Record<DebtTreatment, string> = {
  deduct_full: "يُخصم بالكامل",
  deduct_due_portion: "يُخصم المستحق خلال الحول",
  no_effect: "لا أثر على الوعاء",
  add_full: "يُضاف إلى الوعاء",
  defer_until_received: "يؤجَّل حتى القبض",
};

export const DEBT_METHODOLOGY_LABELS: Record<DebtMethodology, string> = {
  "due-within-hawl": "خصم المستحق خلال الحول (المعتمد — AAOIFI 35)",
  "full-deduction": "خصم كامل الديون (قول معتبر)",
  "no-deduction": "بدون خصم الديون (سياسة مؤسسية)",
};

/** الأجل الافتراضي لكل نوع حين لا يحدد المستخدم المبلغ المستحق */
function defaultDueWithinHawl(input: DebtInput): number {
  if (typeof input.dueWithinHawl === "number") {
    return Math.min(Math.max(0, input.dueWithinHawl), Math.max(0, input.amount));
  }
  switch (input.type) {
    // ديون تشغيلية قصيرة بطبيعتها → كامل الرصيد مستحق خلال الحول
    case "trade_payable":
    case "accrued_expense":
    case "tax_payable":
    case "salaries_payable":
    case "short_term_loan":
      return Math.max(0, input.amount);
    // ديون طويلة الأجل: لا يُفترض قسط ما لم يُصرَّح به
    case "long_term_loan":
    case "installment_plan":
    case "shareholder_loan":
      return 0;
    default:
      return Math.max(0, input.amount);
  }
}

function resolvePayable(
  input: DebtInput,
  methodology: DebtMethodology,
): Pick<DebtLine, "treatment" | "baseEffect" | "ruleId" | "rationale"> {
  const amount = Math.max(0, input.amount);
  const due = defaultDueWithinHawl(input);

  if (methodology === "no-deduction") {
    return {
      treatment: "no_effect",
      baseEffect: 0,
      ruleId: "ZR-DEBT-POLICY-NONE",
      rationale: "السياسة المعتمدة للجهة لا تجيز خصم الديون من الوعاء.",
    };
  }

  if (methodology === "full-deduction") {
    return {
      treatment: "deduct_full",
      baseEffect: -amount,
      ruleId: "ZR-DEBT-FULL-001",
      rationale: "المنهجية المختارة تخصم كامل الدين ولو كان مؤجلاً (قول معتبر).",
    };
  }

  // due-within-hawl (المعتمد)
  if (due <= 0) {
    return {
      treatment: "no_effect",
      baseEffect: 0,
      ruleId: "ZR-DEBT-SHORT-001",
      rationale: "لا يوجد قسط مستحق خلال الحول، فلا يُخصم شيء من الوعاء.",
    };
  }
  if (due >= amount) {
    return {
      treatment: "deduct_full",
      baseEffect: -amount,
      ruleId: "ZR-DEBT-SHORT-001",
      rationale: "الدين حالٌّ أو مستحق بالكامل خلال الحول فيُخصم كاملاً.",
    };
  }
  return {
    treatment: "deduct_due_portion",
    baseEffect: -due,
    ruleId: "ZR-DEBT-SHORT-001",
    rationale: "يُخصم القسط المستحق خلال الحول فقط دون باقي الرصيد المؤجل.",
  };
}

function resolveReceivable(
  input: DebtInput,
): Pick<DebtLine, "treatment" | "baseEffect" | "ruleId" | "rationale"> {
  const amount = Math.max(0, input.amount);
  const collectible = input.collectible ?? input.type !== "doubtful_receivable";

  if (!collectible) {
    return {
      treatment: "defer_until_received",
      baseEffect: 0,
      ruleId: "ZR-RECV-001",
      rationale: "الدين غير مرجو الأداء فيؤجَّل احتسابه حتى القبض.",
    };
  }
  return {
    treatment: "add_full",
    baseEffect: amount,
    ruleId: "ZR-RECV-001",
    rationale: "الدين مرجو الأداء فيدخل الوعاء بقيمته.",
  };
}

/** المحرك الرئيسي: يحوّل قائمة ديون إلى أثر موثّق على الوعاء */
export function runDebtEngine(
  debts: DebtInput[],
  methodology: DebtMethodology = "due-within-hawl",
): DebtEngineResult {
  const lines: DebtLine[] = debts.map((input) => {
    const direction = DIRECTION[input.type];
    const resolved =
      direction === "payable" ? resolvePayable(input, methodology) : resolveReceivable(input);
    return { ...input, direction, ...resolved };
  });

  const totalDeductible = lines.reduce((s, l) => s + (l.baseEffect < 0 ? -l.baseEffect : 0), 0);
  const totalAddable = lines.reduce((s, l) => s + (l.baseEffect > 0 ? l.baseEffect : 0), 0);
  const totalDeferred = lines
    .filter((l) => l.treatment === "defer_until_received")
    .reduce((s, l) => s + Math.max(0, l.amount), 0);

  return {
    lines,
    totalDeductible: +totalDeductible.toFixed(2),
    totalAddable: +totalAddable.toFixed(2),
    totalDeferred: +totalDeferred.toFixed(2),
    netBaseEffect: +(totalAddable - totalDeductible).toFixed(2),
    methodology,
  };
}
