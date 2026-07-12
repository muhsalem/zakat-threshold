import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertTriangle,
  ClipboardCheck,
  Info,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMadhab } from "@/lib/madhabContext";
import { GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS, CROPS_NISAB_KG } from "@/lib/zakat";

export type CheckStatus = "pass" | "fail" | "na" | "warn";

export interface ComplianceCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  reference: string;
  /** ما يجب فعله لتصحيح التعثر (يظهر عند fail/warn) */
  remedy?: string;
}

export interface ComplianceInputs {
  /** إجمالي الذهب (24 جم) */
  goldGrams24?: number;
  /** إجمالي الفضة (999 جم) */
  silverGrams?: number;
  /** الوعاء النقدي الإجمالي بالعملة */
  monetaryBase?: number;
  /** نصاب المال (الأدنى من قيمة الذهب/الفضة) */
  moneyNisab?: number;
  /** إجمالي الديون المخصومة */
  debts?: number;
  /** هل الحول مكتمل؟ null = غير مُدخل */
  hawlComplete?: boolean | null;
  /** أيام متبقية للحول (يظهر تحذير إن قريب) */
  hawlDaysRemaining?: number;
  /** أيام مضت من الحول */
  hawlDaysPassed?: number;
  /** الحلي المستعمَل بالجم (لتقييم استثناء الجمهور) */
  jewelryWornGrams?: number;
  /** رأي المستخدم في الحلي */
  jewelryOpinion?: "majority" | "hanafi";
  jewelryPurpose?: "storage" | "wear";
  /** قيمة الزروع (المحصول بالكجم) */
  cropsKg?: number;
  /** عدد الإبل/البقر/الغنم */
  camelsN?: number;
  cowsN?: number;
  sheepN?: number;
  /** ملكية تامة؟ (سؤال يتحكم به المستخدم — افتراضي true) */
  fullOwnership?: boolean;
  /** المال ناماً أو حكماً (وليس محبوساً وقف مثلاً) */
  moneyIsGrowth?: boolean;
  /** هل المال مخصص لحاجات أصلية معتبرة (سكن الأسرة/طعام)؟ يقلّل الوعاء */
  excludedForNeeds?: boolean;
}

const StatusIcon = ({ status }: { status: CheckStatus }) => {
  if (status === "pass") return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
  if (status === "fail") return <XCircle className="w-5 h-5 text-rose-600" />;
  if (status === "warn") return <AlertTriangle className="w-5 h-5 text-amber-600" />;
  return <MinusCircle className="w-5 h-5 text-muted-foreground" />;
};

const STATUS_LABEL: Record<CheckStatus, { ar: string; className: string }> = {
  pass: { ar: "مجتاز", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  fail: { ar: "متعثّر", className: "bg-rose-100 text-rose-800 border-rose-300" },
  warn: { ar: "تنبيه", className: "bg-amber-100 text-amber-800 border-amber-300" },
  na: { ar: "لا ينطبق", className: "bg-muted text-muted-foreground border-muted-foreground/20" },
};

const fmt = (n: number) => new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(n);

export function useComplianceChecks(input: ComplianceInputs): ComplianceCheck[] {
  const { rules, madhab } = useMadhab();
  const checks: ComplianceCheck[] = [];

  // 1) نصاب الذهب
  const goldG = input.goldGrams24 ?? 0;
  if (goldG > 0) {
    const pass = goldG >= GOLD_NISAB_GRAMS;
    checks.push({
      id: "gold-nisab",
      label: `نصاب الذهب (${GOLD_NISAB_GRAMS} جم عيار 24)`,
      status: pass ? "pass" : "fail",
      detail: `الرصيد الحالي: ${fmt(goldG)} جم`,
      reference: "AAOIFI SS 35 · بند 3/1",
      remedy: pass ? undefined : `يلزم بلوغ ${fmt(GOLD_NISAB_GRAMS - goldG)} جم إضافية لبلوغ النصاب`,
    });
  } else {
    checks.push({
      id: "gold-nisab",
      label: "نصاب الذهب",
      status: "na",
      detail: "لا يوجد ذهب مُدخَل",
      reference: "AAOIFI SS 35 · 3/1",
    });
  }

  // 2) نصاب الفضة
  const silverG = input.silverGrams ?? 0;
  if (silverG > 0) {
    const pass = silverG >= SILVER_NISAB_GRAMS;
    checks.push({
      id: "silver-nisab",
      label: `نصاب الفضة (${SILVER_NISAB_GRAMS} جم)`,
      status: pass ? "pass" : "fail",
      detail: `الرصيد الحالي: ${fmt(silverG)} جم`,
      reference: "AAOIFI SS 35 · 3/2",
      remedy: pass ? undefined : `يلزم بلوغ ${fmt(SILVER_NISAB_GRAMS - silverG)} جم إضافية`,
    });
  } else {
    checks.push({
      id: "silver-nisab",
      label: "نصاب الفضة",
      status: "na",
      detail: "لا توجد فضة مُدخَلة",
      reference: "AAOIFI SS 35 · 3/2",
    });
  }

  // 3) نصاب المال (نقد + عروض + أسهم + …)
  const base = input.monetaryBase ?? 0;
  const nisab = input.moneyNisab ?? 0;
  if (base > 0 || nisab > 0) {
    if (nisab <= 0) {
      checks.push({
        id: "money-nisab",
        label: "نصاب المال",
        status: "warn",
        detail: "لم يُحمَّل سعر الذهب/الفضة بعد",
        reference: "قرار مجمع الفقه 143",
        remedy: "حدّث أسعار المعادن لحساب النصاب بدقة",
      });
    } else {
      const pass = base >= nisab;
      checks.push({
        id: "money-nisab",
        label: "نصاب المال (الأدنى من نصاب الذهب/الفضة)",
        status: pass ? "pass" : "fail",
        detail: `الوعاء ${fmt(base)} / النصاب ${fmt(nisab)}`,
        reference: "قرار مجمع الفقه الإسلامي 143",
        remedy: pass ? undefined : `يلزم ${fmt(nisab - base)} إضافية لبلوغ النصاب`,
      });
    }
  }

  // 4) الحول
  if (input.hawlComplete === true) {
    checks.push({
      id: "hawl",
      label: "دوران الحول",
      status: "pass",
      detail: `مضى ${input.hawlDaysPassed ?? 354} يوماً على تملّك النصاب`,
      reference: "حديث «لا زكاة في مالٍ حتى يحول عليه الحول»",
    });
  } else if (input.hawlComplete === false) {
    const remaining = input.hawlDaysRemaining ?? 0;
    checks.push({
      id: "hawl",
      label: "دوران الحول",
      status: remaining <= 30 ? "warn" : "fail",
      detail: `متبقٍّ ${remaining} يوماً على اكتمال الحول`,
      reference: "الحديث المتفق عليه",
      remedy:
        remaining <= 30
          ? "الحول يقارب الاكتمال — استعد للاحتساب النهائي"
          : "لا تجب الزكاة قبل اكتمال الحول (يجوز التعجيل استحباباً)",
    });
  } else {
    checks.push({
      id: "hawl",
      label: "دوران الحول",
      status: "na",
      detail: "لم يُدخَل تاريخ بلوغ النصاب",
      reference: "الحديث المتفق عليه",
      remedy: "أدخل تاريخ بلوغ النصاب لتفعيل تتبّع الحول",
    });
  }

  // 5) الملكية التامة
  checks.push({
    id: "ownership",
    label: "الملكية التامة (يد وتصرّف)",
    status: input.fullOwnership === false ? "fail" : "pass",
    detail:
      input.fullOwnership === false
        ? "المال ليس تحت اليد والتصرف — لا تجب فيه الزكاة"
        : "المال في ملكك وبحوزتك أو حكماً",
    reference: "AAOIFI SS 35 · 2/2",
  });

  // 6) النماء (حقيقي أو تقديري)
  checks.push({
    id: "growth",
    label: "المال ناماً حقيقةً أو تقديراً",
    status: input.moneyIsGrowth === false ? "fail" : "pass",
    detail:
      input.moneyIsGrowth === false
        ? "الأصل غير نامٍ (كأصل ثابت للاستعمال) — لا زكاة فيه"
        : "المال معدّ للنماء (نقد/تجارة/زراعة/أنعام)",
    reference: "AAOIFI SS 35 · 2/3",
  });

  // 7) خصم الديون
  const debts = input.debts ?? 0;
  if (debts > 0) {
    checks.push({
      id: "debts",
      label: "خصم الديون المستحقة خلال السنة",
      status: "pass",
      detail: `تم خصم ${fmt(debts)} من الوعاء`,
      reference: "قرار مجمع الفقه الإسلامي 30",
    });
  } else {
    checks.push({
      id: "debts",
      label: "خصم الديون",
      status: "na",
      detail: "لا توجد ديون مُدخَلة",
      reference: "قرار مجمع الفقه 30",
    });
  }

  // 8) استثناء الحلي المستعمَل
  const jw = input.jewelryWornGrams ?? 0;
  if (jw > 0 && input.jewelryPurpose === "wear") {
    if (input.jewelryOpinion === "hanafi" || rules.jewelryWornZakatable) {
      checks.push({
        id: "jewelry",
        label: "حكم الحلي المستعمَل",
        status: "warn",
        detail: `تجب الزكاة على ${fmt(jw)} جم حلي مستعمَل وفق ${rules.label}`,
        reference: "الحنفية: عموم أدلة الزكاة في الذهب والفضة",
        remedy: "تحقّق من مطابقة الاختيار لمذهبك — الجمهور يُعفي الحلي المعتاد",
      });
    } else {
      checks.push({
        id: "jewelry",
        label: "استثناء الحلي المستعمَل",
        status: "pass",
        detail: `تم استثناء ${fmt(jw)} جم من الحلي المعدّ للاستعمال (${rules.label})`,
        reference: "قول الجمهور — أحاديث السنة",
      });
    }
  }

  // 9) نصاب الزروع
  const crops = input.cropsKg ?? 0;
  if (crops > 0) {
    if (!rules.cropsRequireNisab && madhab === "hanafi") {
      checks.push({
        id: "crops-nisab",
        label: "زكاة الزروع",
        status: "pass",
        detail: `عند الحنفية: تجب في القليل والكثير — الرصيد ${fmt(crops)} كجم`,
        reference: "المذهب الحنفي — أبو حنيفة",
      });
    } else {
      const pass = crops >= CROPS_NISAB_KG;
      checks.push({
        id: "crops-nisab",
        label: `نصاب الزروع والثمار (${CROPS_NISAB_KG} كجم)`,
        status: pass ? "pass" : "fail",
        detail: `الرصيد ${fmt(crops)} كجم`,
        reference: "حديث «ليس فيما دون خمسة أوسق صدقة»",
        remedy: pass ? undefined : `يلزم ${fmt(CROPS_NISAB_KG - crops)} كجم إضافية`,
      });
    }
  }

  // 10) الأنعام (السَّوم والحول)
  const camels = input.camelsN ?? 0;
  const cows = input.cowsN ?? 0;
  const sheep = input.sheepN ?? 0;
  if (camels > 0 || cows > 0 || sheep > 0) {
    const passC = camels >= 5;
    const passK = cows >= 30;
    const passS = sheep >= 40;
    const anyPass = passC || passK || passS;
    checks.push({
      id: "livestock-nisab",
      label: "نصاب الأنعام (إبل ≥5 · بقر ≥30 · غنم ≥40)",
      status: anyPass ? "pass" : "fail",
      detail: `إبل ${camels} · بقر ${cows} · غنم ${sheep}`,
      reference: "حديث أنس في كتاب أبي بكر — البخاري",
      remedy: anyPass ? undefined : "لا تبلغ الأعداد النصاب لأي صنف",
    });
  }

  // 11) الحاجات الأصلية (الحنفية)
  if (input.excludedForNeeds) {
    checks.push({
      id: "needs",
      label: "استبعاد الحاجات الأصلية",
      status: "pass",
      detail: "تم استبعاد مسكن العائلة/طعام الحاجة من الوعاء",
      reference: "الحنفية — الكاساني، بدائع الصنائع",
    });
  }

  return checks;
}

interface Props {
  inputs: ComplianceInputs;
  compact?: boolean;
}

export default function ComplianceChecklist({ inputs, compact = false }: Props) {
  const checks = useComplianceChecks(inputs);
  const totals = checks.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    { pass: 0, fail: 0, warn: 0, na: 0 } as Record<CheckStatus, number>,
  );

  const applicable = totals.pass + totals.fail + totals.warn;
  const score = applicable === 0 ? 0 : Math.round((totals.pass / applicable) * 100);

  return (
    <Card className="border-primary/20 print:shadow-none">
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            قائمة تحقّق الامتثال الشرعي
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
              {totals.pass} مجتاز
            </Badge>
            {totals.fail > 0 && (
              <Badge className="bg-rose-100 text-rose-800 border-rose-300">
                {totals.fail} متعثّر
              </Badge>
            )}
            {totals.warn > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                {totals.warn} تنبيه
              </Badge>
            )}
            {totals.na > 0 && <Badge variant="outline">{totals.na} لا ينطبق</Badge>}
          </div>
        </div>
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">نسبة الامتثال</span>
            <span className="font-bold tabular-nums">{score}%</span>
          </div>
          <Progress value={score} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <TooltipProvider>
          {checks.map((c) => (
            <div
              key={c.id}
              className={`rounded-md border p-3 flex items-start gap-3 ${
                c.status === "fail"
                  ? "bg-rose-50/50 border-rose-200"
                  : c.status === "warn"
                    ? "bg-amber-50/50 border-amber-200"
                    : c.status === "pass"
                      ? "bg-emerald-50/30 border-emerald-200/60"
                      : "bg-muted/20"
              }`}
            >
              <StatusIcon status={c.status} />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{c.label}</span>
                  <Badge variant="outline" className={`${STATUS_LABEL[c.status].className} text-[10px]`}>
                    {STATUS_LABEL[c.status].ar}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-[10px] text-muted-foreground cursor-help inline-flex items-center gap-0.5">
                        <Info className="w-3 h-3" />
                        المرجع
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      {c.reference}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">{c.detail}</p>
                {c.remedy && (c.status === "fail" || c.status === "warn") && (
                  <p className="text-xs text-foreground bg-background/70 rounded px-2 py-1 border">
                    <b>الإجراء المقترح:</b> {c.remedy}
                  </p>
                )}
              </div>
            </div>
          ))}
        </TooltipProvider>

        <p className="text-[11px] text-muted-foreground pt-2 border-t">
          هذه قائمة تحقّق تلقائية بناءً على المدخلات والمذهب المختار. لا تُغني عن استشارة مفتٍ معتمد في الحالات الخاصة.
        </p>
      </CardContent>
    </Card>
  );
}
