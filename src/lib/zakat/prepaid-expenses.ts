// محرّك المصروفات المدفوعة مقدماً (Prepaid Expenses) وأثرها على الوعاء الزكوي
// المرجعية: AAOIFI معيار 35 (الزكاة) — الأصول الزكوية تشمل الحقوق المالية القابلة للاسترداد،
// وقرارات مجمع الفقه الإسلامي في زكاة الديون المرجوّة.
//
// القاعدة العامة:
// المصروف المدفوع مقدماً ليس "مصروفاً" زكوياً حتى يُستهلك؛ فالجزء غير المستهلك منه
// يمثّل حقاً مالياً لدى الغير (دَيناً مرجوّاً) → يُضاف للوعاء إن كان قابلاً للاسترداد نقداً.
// أما إن كان غير قابل للاسترداد (خدمة التزم بها الطرف الآخر ولا تُردّ قيمتها نقداً)
// فهو منفعة مستقبلية لا مال حاضر → لا يدخل الوعاء عند جمهور المعاصرين.

export type PrepaidRecoverability =
  | "refundable" // قابل للاسترداد نقداً (تأمينات، دفعات مقدّمة للموردين، ضرائب مستردّة)
  | "service_only" // منفعة/خدمة فقط لا تُردّ نقداً (إيجار، اشتراكات، تأمين، دعاية)
  | "doubtful"; // مشكوك في استرداده (طرف متعثّر أو نزاع)

export type PrepaidExpenseInput = {
  id: string;
  label: string;
  /** الرصيد الدفتري غير المستهلك عند تاريخ حولان الحول */
  unusedBalance: number;
  recoverability: PrepaidRecoverability;
  /** هل يستهلك خلال الحول القادم؟ (معلومة عرضية للتقرير) */
  consumedWithinHawl?: boolean;
  /** تاريخ التحصيل/الاسترداد المتوقع (ISO: YYYY-MM-DD) */
  expectedRecoveryDate?: string;
  /** المدة المتوقعة للاستهلاك أو التحصيل بالأشهر */
  expectedDurationMonths?: number;
};

export type PrepaidTreatment = "add_full" | "defer_until_received" | "no_effect";

export type PrepaidExpenseLine = {
  id: string;
  label: string;
  amount: number;
  treatment: PrepaidTreatment;
  ruleId: string;
  rationale: string;
  /** الأثر على الوعاء (موجب = إضافة) */
  baseEffect: number;
  /** عدد الأشهر حتى التحصيل المتوقع (محسوب من التاريخ أو المدة) */
  monthsToRecovery?: number;
  /** هل يتجاوز التحصيل الحول الحالي */
  beyondHawl?: boolean;
};

export type PrepaidExpensesResult = {
  lines: PrepaidExpenseLine[];
  /** ما يُضاف للوعاء الزكوي */
  totalAddable: number;
  /** ما يؤجَّل حتى القبض */
  totalDeferred: number;
  /** ما لا أثر له */
  totalIgnored: number;
  netBaseEffect: number;
  /** إجمالي الأرصدة المدخلة (بعد تصفير السالب) */
  totalBalances: number;
  issues: PrepaidIssue[];
};

export type PrepaidIssueLevel = "error" | "warning";

export type PrepaidIssue = {
  id: string;
  level: PrepaidIssueLevel;
  code: string;
  message: string;
};


/** منهجية المعالجة عند اختلاف الرأي الفقهي */
export type PrepaidMethodology =
  | "aaoifi-35" // الافتراضي: المسترد فقط يُضاف
  | "all-assets" // كل رصيد غير مستهلك يُضاف (تشدُّد احتياطي)
  | "none"; // لا شيء يُضاف (رأي من يعدّه منفعة مستقبلية مطلقاً)

const clamp = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

const MONTH_MS = 30.4375 * 24 * 60 * 60 * 1000;

/** عدد الأشهر حتى التحصيل المتوقع: المدة المصرّح بها أولاً ثم فرق التاريخ */
export function monthsUntilRecovery(
  item: Pick<PrepaidExpenseInput, "expectedDurationMonths" | "expectedRecoveryDate">,
  today: Date = new Date(),
): number | undefined {
  if (
    typeof item.expectedDurationMonths === "number" &&
    Number.isFinite(item.expectedDurationMonths)
  ) {
    return item.expectedDurationMonths;
  }
  if (!item.expectedRecoveryDate) return undefined;
  const t = Date.parse(item.expectedRecoveryDate);
  if (Number.isNaN(t)) return undefined;
  return Math.round(((t - today.getTime()) / MONTH_MS) * 10) / 10;
}

/** قواعد تحقّق تمنع الحالات المتعارضة وتشرح السبب للمستخدم */
export function validatePrepaidExpenses(
  items: PrepaidExpenseInput[],
  today: Date = new Date(),
): PrepaidIssue[] {
  const issues: PrepaidIssue[] = [];
  for (const item of items) {
    const name = item.label?.trim() || "بند بلا اسم";
    const months = monthsUntilRecovery(item, today);

    if (!item.label?.trim()) {
      issues.push({
        id: item.id,
        level: "warning",
        code: "PPE-V-000",
        message: "أدخل اسماً واضحاً للبند حتى يظهر في التقرير الزكوي.",
      });
    }
    if (!Number.isFinite(item.unusedBalance) || item.unusedBalance < 0) {
      issues.push({
        id: item.id,
        level: "error",
        code: "PPE-V-001",
        message: `«${name}»: الرصيد غير المستهلك لا يصحّ أن يكون سالباً أو غير رقمي؛ تم تصفيره في الحساب.`,
      });
    }
    if (
      typeof item.expectedDurationMonths === "number" &&
      (item.expectedDurationMonths < 0 || item.expectedDurationMonths > 600)
    ) {
      issues.push({
        id: item.id,
        level: "error",
        code: "PPE-V-002",
        message: `«${name}»: المدة المتوقعة يجب أن تكون بين 0 و600 شهراً.`,
      });
    }
    if (item.expectedRecoveryDate && Number.isNaN(Date.parse(item.expectedRecoveryDate))) {
      issues.push({
        id: item.id,
        level: "error",
        code: "PPE-V-003",
        message: `«${name}»: تاريخ التحصيل غير صالح.`,
      });
    }
    if (item.recoverability === "service_only" && (item.expectedRecoveryDate || months)) {
      issues.push({
        id: item.id,
        level: "error",
        code: "PPE-V-010",
        message: `«${name}»: تعارض — صُنّف كمنفعة لا تُردّ نقداً ومع ذلك حُدّد له تاريخ/مدة تحصيل. إمّا أن تحذف تاريخ التحصيل أو تُعيد تصنيفه «قابلاً للاسترداد».`,
      });
    }
    if (item.recoverability === "refundable" && months === undefined) {
      issues.push({
        id: item.id,
        level: "warning",
        code: "PPE-V-011",
        message: `«${name}»: حدّد تاريخ التحصيل أو المدة المتوقعة لتحديد ما إذا كان الاسترداد داخل الحول أم بعده.`,
      });
    }
    if (item.recoverability === "refundable" && months !== undefined && months < 0) {
      issues.push({
        id: item.id,
        level: "warning",
        code: "PPE-V-012",
        message: `«${name}»: تاريخ التحصيل قد مضى ولم يُقبض؛ الأولى تصنيفه «مشكوكاً في استرداده» حتى القبض.`,
      });
    }
    if (item.recoverability === "doubtful" && months !== undefined && months >= 0 && months <= 3) {
      issues.push({
        id: item.id,
        level: "warning",
        code: "PPE-V-013",
        message: `«${name}»: تعارض محتمل — تحصيل مؤكّد خلال ${months} شهراً مع تصنيفه مشكوكاً فيه؛ راجع التصنيف.`,
      });
    }
  }
  return issues;
}

export function runPrepaidExpenses(
  items: PrepaidExpenseInput[],
  methodology: PrepaidMethodology = "aaoifi-35",
  today: Date = new Date(),
): PrepaidExpensesResult {
  const lines: PrepaidExpenseLine[] = items.map((item) => {
    const amount = clamp(item.unusedBalance);
    const months = monthsUntilRecovery(item, today);
    const beyondHawl = months !== undefined ? months > 12 : undefined;
    const meta = { monthsToRecovery: months, beyondHawl };

    if (methodology === "none") {
      return {
        id: item.id,
        label: item.label,
        amount,
        treatment: "no_effect" as const,
        ruleId: "ZR-PPE-000",
        rationale:
          "منهجية عدم الإضافة: يُعدّ المدفوع مقدماً منفعة مستقبلية لا مالاً حاضراً، فلا يدخل الوعاء.",
        baseEffect: 0,
        ...meta,
      };
    }

    if (methodology === "all-assets") {
      return {
        id: item.id,
        label: item.label,
        amount,
        treatment: "add_full" as const,
        ruleId: "ZR-PPE-001",
        rationale:
          "منهجية الاحتياط: كل رصيد غير مستهلك يُعدّ أصلاً متداولاً زكوياً ويُضاف للوعاء كاملاً.",
        baseEffect: amount,
        ...meta,
      };
    }

    switch (item.recoverability) {
      case "refundable":
        if (beyondHawl) {
          return {
            id: item.id,
            label: item.label,
            amount,
            treatment: "defer_until_received" as const,
            ruleId: "ZR-PPE-011",
            rationale: `التحصيل المتوقع بعد ${months} شهراً أي خارج الحول الحالي، فيُؤجَّل حتى القبض ثم يُزكّى لسنة واحدة.`,
            baseEffect: 0,
            ...meta,
          };
        }
        return {
          id: item.id,
          label: item.label,
          amount,
          treatment: "add_full" as const,
          ruleId: "ZR-PPE-010",
          rationale:
            "رصيد قابل للاسترداد نقداً = دَين مرجوّ لدى الغير، فيُضاف للوعاء الزكوي (AAOIFI 35).",
          baseEffect: amount,
          ...meta,
        };
      case "doubtful":
        return {
          id: item.id,
          label: item.label,
          amount,
          treatment: "defer_until_received" as const,
          ruleId: "ZR-PPE-020",
          rationale:
            "رصيد مشكوك في استرداده يُؤجَّل حتى القبض، ثم يُزكّى لسنة واحدة على الرأي المختار.",
          baseEffect: 0,
          ...meta,
        };
      default:
        return {
          id: item.id,
          label: item.label,
          amount,
          treatment: "no_effect" as const,
          ruleId: "ZR-PPE-030",
          rationale:
            "منفعة أو خدمة لا تُردّ قيمتها نقداً (إيجار/اشتراك/تأمين) فلا تُعدّ مالاً حاضراً ولا تدخل الوعاء.",
          baseEffect: 0,
          ...meta,
        };
    }
  });

  const sum = (t: PrepaidTreatment) =>
    lines.filter((l) => l.treatment === t).reduce((a, l) => a + l.amount, 0);

  const totalAddable = sum("add_full");
  const totalDeferred = sum("defer_until_received");
  const totalIgnored = sum("no_effect");

  return {
    lines,
    totalAddable,
    totalDeferred,
    totalIgnored,
    netBaseEffect: totalAddable,
    totalBalances: totalAddable + totalDeferred + totalIgnored,
    issues: validatePrepaidExpenses(items, today),
  };
}


/** أنواع شائعة جاهزة للاختيار في الواجهة */
export const PREPAID_PRESETS: {
  key: string;
  label: string;
  scope: "individual" | "company" | "both";
  recoverability: PrepaidRecoverability;
  hint: string;
}[] = [
  {
    key: "rent",
    label: "إيجار مدفوع مقدماً",
    scope: "both",
    recoverability: "service_only",
    hint: "منفعة سكن/مقر لا تُردّ نقداً غالباً — لا تدخل الوعاء إلا إذا نصّ العقد على الاسترداد.",
  },
  {
    key: "insurance",
    label: "أقساط تأمين مدفوعة مقدماً",
    scope: "both",
    recoverability: "service_only",
    hint: "تغطية تأمينية مستقبلية؛ إن كان جزء منها قابلاً للاسترداد عند الإلغاء فصنّفه مسترداً.",
  },
  {
    key: "deposit",
    label: "تأمينات ودفعات مستردّة (كهرباء/إيجار/عقود)",
    scope: "both",
    recoverability: "refundable",
    hint: "مبالغ تُردّ عند انتهاء العقد = دَين مرجوّ يدخل الوعاء.",
  },
  {
    key: "supplier_advance",
    label: "دفعات مقدمة للموردين",
    scope: "company",
    recoverability: "refundable",
    hint: "حق مالي لدى المورد مقابل بضاعة لم تُستلم — يُضاف للوعاء كعروض تجارة/دين مرجوّ.",
  },
  {
    key: "prepaid_tax",
    label: "ضرائب ورسوم مدفوعة مقدماً",
    scope: "company",
    recoverability: "refundable",
    hint: "الأرصدة المستردّة من الجهات الحكومية تدخل الوعاء.",
  },
  {
    key: "subscriptions",
    label: "اشتراكات وبرامج وخدمات سنوية",
    scope: "both",
    recoverability: "service_only",
    hint: "منفعة مستهلكة تدريجياً بلا استرداد — لا تدخل الوعاء.",
  },
  {
    key: "tuition",
    label: "رسوم دراسية/دورات مدفوعة مقدماً",
    scope: "individual",
    recoverability: "service_only",
    hint: "منفعة تعليمية؛ إن كانت قابلة للاسترداد عند الانسحاب فصنّفها مستردّة.",
  },
  {
    key: "hajj",
    label: "دفعات حج/عمرة أو سفر مقدماً",
    scope: "individual",
    recoverability: "service_only",
    hint: "خدمة محجوزة؛ الجزء القابل للإلغاء والاسترداد يُضاف للوعاء.",
  },
  {
    key: "marketing",
    label: "حملات دعاية وإعلان مدفوعة مقدماً",
    scope: "company",
    recoverability: "service_only",
    hint: "منفعة تسويقية مستقبلية لا تُردّ نقداً.",
  },
  {
    key: "disputed",
    label: "دفعات متنازع عليها / لدى طرف متعثّر",
    scope: "both",
    recoverability: "doubtful",
    hint: "تُؤجَّل حتى القبض ثم تُزكّى لسنة واحدة.",
  },
];
