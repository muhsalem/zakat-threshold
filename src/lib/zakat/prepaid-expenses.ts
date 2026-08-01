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
};

/** منهجية المعالجة عند اختلاف الرأي الفقهي */
export type PrepaidMethodology =
  | "aaoifi-35" // الافتراضي: المسترد فقط يُضاف
  | "all-assets" // كل رصيد غير مستهلك يُضاف (تشدُّد احتياطي)
  | "none"; // لا شيء يُضاف (رأي من يعدّه منفعة مستقبلية مطلقاً)

const clamp = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function runPrepaidExpenses(
  items: PrepaidExpenseInput[],
  methodology: PrepaidMethodology = "aaoifi-35",
): PrepaidExpensesResult {
  const lines: PrepaidExpenseLine[] = items.map((item) => {
    const amount = clamp(item.unusedBalance);

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
      };
    }

    switch (item.recoverability) {
      case "refundable":
        return {
          id: item.id,
          label: item.label,
          amount,
          treatment: "add_full" as const,
          ruleId: "ZR-PPE-010",
          rationale:
            "رصيد قابل للاسترداد نقداً = دَين مرجوّ لدى الغير، فيُضاف للوعاء الزكوي (AAOIFI 35).",
          baseEffect: amount,
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
