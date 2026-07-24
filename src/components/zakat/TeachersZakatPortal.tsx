import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  GraduationCap,
  BookOpen,
  Wallet,
  Calculator,
  Award,
  FileSpreadsheet,
  CheckCircle2,
  Info,
  HelpCircle,
  School,
  Printer,
  Coins,
  HeartHandshake,
} from "lucide-react";
import { num, fmt, ZAKAT_RATE, GOLD_NISAB_GRAMS, ZAKAT_RATE_GREGORIAN } from "@/lib/zakat";
import { toast } from "sonner";
import { downloadReportExcel } from "@/lib/exportExcel";

type ZakatMethod = "yearly" | "on-receipt" | "net-income";

interface TeachersZakatPortalProps {
  currencyName?: string;
  goldPricePerGram?: number;
}

export function TeachersZakatPortal({
  currencyName = "ر.س",
  goldPricePerGram = 340,
}: TeachersZakatPortalProps) {
  // 1. الراتب والبدلات الرسمية
  const [basicSalary, setBasicSalary] = useState("");
  const [teachingAllowance, setTeachingAllowance] = useState("");
  const [specialEdBonus, setSpecialEdBonus] = useState("");
  const [adminBonus, setAdminBonus] = useState("");

  // 2. الدروس الخصوصية والدخل الإضافي
  const [privateTutoringMonthly, setPrivateTutoringMonthly] = useState("");
  const [examGradingBonus, setExamGradingBonus] = useState("");
  const [curriculumTrainingBonus, setCurriculumTrainingBonus] = useState("");
  const [activitiesBonus, setActivitiesBonus] = useState("");

  // 3. المدخرات والالتزامات
  const [currentSavings, setCurrentSavings] = useState("");
  const [livingExpensesMonthly, setLivingExpensesMonthly] = useState("");
  const [debtsAndInstallmentsAnnual, setDebtsAndInstallmentsAnnual] = useState("");

  // 4. الإعدادات والطريقة الشرعية
  const [method, setMethod] = useState<ZakatMethod>("yearly");
  const [useGregorian, setUseGregorian] = useState(false);

  // حساب النصاب بالعملة الحالية (85 جرام ذهب عيار 24)
  const nisabValue = useMemo(() => GOLD_NISAB_GRAMS * goldPricePerGram, [goldPricePerGram]);

  // الحسابات المتقدمة
  const calcs = useMemo(() => {
    const basic = num(basicSalary);
    const teaching = num(teachingAllowance);
    const specEd = num(specialEdBonus);
    const admin = num(adminBonus);

    // إجمالي الراتب الشهري الرسمي شامل البدلات
    const totalMonthlyOfficialSalary = basic + teaching + specEd + admin;
    const totalAnnualOfficialSalary = totalMonthlyOfficialSalary * 12;

    // الدخل الإضافي
    const tutoringMonthly = num(privateTutoringMonthly);
    const tutoringAnnual = tutoringMonthly * 12;
    const examBonus = num(examGradingBonus);
    const curriculum = num(curriculumTrainingBonus);
    const activities = num(activitiesBonus);

    // إجمالي الدخل الإضافي السنوي
    const totalAnnualSideIncome = tutoringAnnual + examBonus + curriculum + activities;

    // إجمالي الدخل الكلي السنوي للمعلم (رسمي + إضافي)
    const grossAnnualIncome = totalAnnualOfficialSalary + totalAnnualSideIncome;

    // المصاريف والالتزامات
    const monthlyLiving = num(livingExpensesMonthly);
    const annualLiving = monthlyLiving * 12;
    const annualDebts = num(debtsAndInstallmentsAnnual);
    const totalAnnualExpenses = annualLiving + annualDebts;

    // المدخر الحقيقي أو الصافي الزكوي
    const savings = num(currentSavings);
    const netAnnualIncome = Math.max(0, grossAnnualIncome - totalAnnualExpenses);

    // نسبة الزكاة (هجري 2.5% أم ميلادي 2.577%)
    const rate = useGregorian ? ZAKAT_RATE_GREGORIAN : ZAKAT_RATE;

    let baseAmount = 0;
    let zakatDue = 0;
    let methodDescription = "";

    if (method === "yearly") {
      // 1. الطريقة السنوية عند تمام الحول على المدخرات (رأي الجمهور المعتمد)
      baseAmount = savings;
      zakatDue = baseAmount >= nisabValue ? baseAmount * rate : 0;
      methodDescription =
        "حساب الزكاة بنسبة 2.5% على إجمالي الرصيد والمدخرات الفعلية المتراكمة لدى المعلم عند حولان الحول الهجري.";
    } else if (method === "on-receipt") {
      // 2. طريقة الخصم المباشر فور القبض للدروس الخصوصية والمكافآت (رأي القرضاوي والأيسر ذمة)
      baseAmount = totalAnnualSideIncome + (savings > 0 ? savings : 0);
      zakatDue = baseAmount >= nisabValue ? baseAmount * rate : 0;
      methodDescription =
        "إخراج الزكاة فور استلام مكافآت الدروس الخصوصية والتأليف والأنشطة بالإضافة للمدخرات الفائضة لضمان إبراء الذمة أولاً بأول.";
    } else {
      // 3. طريقة الوعاء الصافي (الدخل السنوي الصافي بعد استقطاع الحاجات الأصلية والديون)
      baseAmount = netAnnualIncome;
      zakatDue = baseAmount >= nisabValue ? baseAmount * rate : 0;
      methodDescription =
        "خصم المصاريف المعيشية الأساسية للأسرة وأقساط السكن والسيارة من إجمالي دخل المعلم السنوي، وتزكية الصافي الفائض بنسبة 2.5%.";
    }

    const reachesNisab = baseAmount >= nisabValue;

    return {
      totalMonthlyOfficialSalary,
      totalAnnualOfficialSalary,
      tutoringAnnual,
      totalAnnualSideIncome,
      grossAnnualIncome,
      totalAnnualExpenses,
      netAnnualIncome,
      savings,
      baseAmount,
      zakatDue,
      ratePercent: (rate * 100).toFixed(3),
      reachesNisab,
      methodDescription,
    };
  }, [
    basicSalary,
    teachingAllowance,
    specialEdBonus,
    adminBonus,
    privateTutoringMonthly,
    examGradingBonus,
    curriculumTrainingBonus,
    activitiesBonus,
    currentSavings,
    livingExpensesMonthly,
    debtsAndInstallmentsAnnual,
    method,
    useGregorian,
    nisabValue,
  ]);

  // تصدير لملف Excel
  const exportExcel = () => {
    try {
      const rows = [
        { "البند": "الراتب الأساسي الشهري", "القيمة": fmt(num(basicSalary)) + " " + currencyName },
        { "البند": "بدل التدريس والنقل الشهري", "القيمة": fmt(num(teachingAllowance)) + " " + currencyName },
        { "البند": "بدل التربية الخاصة / الصفوف الأولى", "القيمة": fmt(num(specialEdBonus)) + " " + currencyName },
        { "البند": "بدل الإدارة والإشراف الشهري", "القيمة": fmt(num(adminBonus)) + " " + currencyName },
        { "البند": "إجمالي الراتب الشهري الرسمي", "القيمة": fmt(calcs.totalMonthlyOfficialSalary) + " " + currencyName },
        { "البند": "دخل الدروس الخصوصية (سنوي)", "القيمة": fmt(calcs.tutoringAnnual) + " " + currencyName },
        { "البند": "مكافآت التصحيح والمراقبة والتأليف", "القيمة": fmt(num(examGradingBonus) + num(curriculumTrainingBonus) + num(activitiesBonus)) + " " + currencyName },
        { "البند": "إجمالي دخل المعلم السنوي الشامل", "القيمة": fmt(calcs.grossAnnualIncome) + " " + currencyName },
        { "البند": "إجمالي المصاريف المعيشية والالتزامات السنوية", "القيمة": fmt(calcs.totalAnnualExpenses) + " " + currencyName },
        { "البند": "المدخرات الحالية لدى المعلم", "القيمة": fmt(calcs.savings) + " " + currencyName },
        { "البند": "طريقة الاحتساب الشرعية", "القيمة": method === "yearly" ? "سنوية على المدخرات" : method === "on-receipt" ? "فورية عند قبض المكافآت" : "صافي الدخل السنوي" },
        { "البند": "النصاب الشرعي المعتمد (85g ذهب)", "القيمة": fmt(nisabValue) + " " + currencyName },
        { "البند": "الوعاء الخاضع للزكاة", "القيمة": fmt(calcs.baseAmount) + " " + currencyName },
        { "البند": "إجمالي الزكاة الواجبة", "القيمة": fmt(calcs.zakatDue) + " " + currencyName },
      ];
      downloadReportExcel(rows, `تقرير_زكاة_المعلم_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("تم تصدير تقرير زكاة المعلم إلى Excel بنجاح");
    } catch (e) {
      toast.error("تعذر تصدير التقرير", { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. ترويسة البوابة والعنوان */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-emerald-900 via-teal-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/40 text-xs px-2.5 py-0.5 backdrop-blur">
                <GraduationCap className="h-3.5 w-3.5 ms-1 inline" /> بوابة الكادر التعليمي والتربوي
              </Badge>
              <Badge variant="outline" className="text-emerald-100 border-emerald-300/30 text-xs">
                مطابق لمعايير AAOIFI الفقهية
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <School className="h-7 w-7 text-emerald-400" />
              بوابة دخل وزكاة المعلمين والتربويين
            </h1>
            <p className="text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              أداة متخصصة ومصممة لاحتساب زكاة دخل المعلم والمعلمة بكافة بنوده (الراتب الأساسي، بدلات التدريس والصفوف، الدروس الخصوصية، المكافآت الموسمية، والأوقاف التعليمية).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={exportExcel}
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-300" /> تصدير Excel
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              size="sm"
              className="border-emerald-400/40 text-white hover:bg-emerald-800/50 gap-1.5"
            >
              <Printer className="h-4 w-4 text-emerald-300" /> طباعة التقرير
            </Button>
          </div>
        </div>
      </div>

      {/* 2. شريط تنبيه النصاب والمؤشرات السريعة */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">نصاب الذهب الشرعي (85 جرام)</div>
              <div className="text-lg font-bold text-foreground">
                {fmt(nisabValue)} <span className="text-xs font-normal text-muted-foreground">{currencyName}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">إجمالي دخل المعلم السنوي</div>
              <div className="text-lg font-bold text-foreground">
                {fmt(calcs.grossAnnualIncome)} <span className="text-xs font-normal text-muted-foreground">{currencyName}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={calcs.reachesNisab && calcs.zakatDue > 0 ? "border-emerald-600/40 bg-emerald-600/10" : "border-slate-200"}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">الزكاة المستحقة الواجبة</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {fmt(calcs.zakatDue)} <span className="text-xs font-normal text-muted-foreground">{currencyName}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. معالج إدخال بيانات دخل المعلم */}
      <Tabs defaultValue="official-salary" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/60">
          <TabsTrigger value="official-salary" className="py-2 text-xs md:text-sm gap-1.5">
            <School className="h-4 w-4" /> الراتب الرسمي والبدلات
          </TabsTrigger>
          <TabsTrigger value="tutoring-extra" className="py-2 text-xs md:text-sm gap-1.5">
            <BookOpen className="h-4 w-4" /> الدروس والمكافآت الإضافية
          </TabsTrigger>
          <TabsTrigger value="expenses-savings" className="py-2 text-xs md:text-sm gap-1.5">
            <Wallet className="h-4 w-4" /> المدخرات والالتزامات
          </TabsTrigger>
        </TabsList>

        {/* التبويب 1: الراتب الرسمي والبدلات */}
        <TabsContent value="official-salary" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <School className="h-4 w-4 text-emerald-600" />
                تفاصيل الراتب والبدلات التعليمية الرسمية (شهرياً)
              </CardTitle>
              <CardDescription className="text-xs">
                أدخل بنود راتبك المعتمدة في السلم الوظيفي للمعلمين لتقييم الدخل السنوي الثابت.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">الراتب الأساسي الشهري</Label>
                <Input
                  type="number"
                  placeholder="مثال: 8500"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">بدل التدريس والنقل الشهري</Label>
                <Input
                  type="number"
                  placeholder="مثال: 1200"
                  value={teachingAllowance}
                  onChange={(e) => setTeachingAllowance(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">بدل التربية الخاصة / الصفوف الأولى / التميز</Label>
                <Input
                  type="number"
                  placeholder="مثال: 800"
                  value={specialEdBonus}
                  onChange={(e) => setSpecialEdBonus(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">بدل الإشراف الأكاديمي / قيادة المدرسة</Label>
                <Input
                  type="number"
                  placeholder="مثال: 1000"
                  value={adminBonus}
                  onChange={(e) => setAdminBonus(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Alert className="border-emerald-500/30 bg-emerald-500/5">
            <Info className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-xs leading-relaxed">
              إجمالي الراتب الشهري الرسمي الحالي: <strong>{fmt(calcs.totalMonthlyOfficialSalary)} {currencyName}</strong> (يعادل <strong>{fmt(calcs.totalAnnualOfficialSalary)} {currencyName}</strong> سنوياً).
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* التبويب 2: الدروس الخصوصية والمكافآت الإضافية */}
        <TabsContent value="tutoring-extra" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                دخل الدروس الخصوصية والمكافآت الأكاديمية الإضافية
              </CardTitle>
              <CardDescription className="text-xs">
                احسب الدخل الناتج عن التدريس الخاص المباشر/الأونلاين ومكافآت التصحيح والتأليف.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">متوسط دخل الدروس الخصوصية (شهرياً)</Label>
                <Input
                  type="number"
                  placeholder="مثال: 3000"
                  value={privateTutoringMonthly}
                  onChange={(e) => setPrivateTutoringMonthly(e.target.value)}
                />
                <span className="text-[10px] text-muted-foreground">يعادل سنوياً: {fmt(calcs.tutoringAnnual)} {currencyName}</span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">مكافأة المراقبة وتصحيح الاختبارات والكنترول (سنوياً)</Label>
                <Input
                  type="number"
                  placeholder="مثال: 2500"
                  value={examGradingBonus}
                  onChange={(e) => setExamGradingBonus(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">مكافأة التأليف وإعداد المناهج والدورات التدريبية (سنوياً)</Label>
                <Input
                  type="number"
                  placeholder="مثال: 5000"
                  value={curriculumTrainingBonus}
                  onChange={(e) => setCurriculumTrainingBonus(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">مكافأة الأنشطة الطلابية والرحلات والنوادي الصيفية (سنوياً)</Label>
                <Input
                  type="number"
                  placeholder="مثال: 1500"
                  value={activitiesBonus}
                  onChange={(e) => setActivitiesBonus(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Alert className="border-amber-500/30 bg-amber-500/5">
            <HelpCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs leading-relaxed">
              <strong>توجيه شرعي:</strong> دخل الدروس الخصوصية والمكافآت الإضافية يجوز زكاةُ فور استلامها بنسبة 2.5% لإبراء الذمة فوراً دون انتظار حولان الحول الهجري، أو ضمه للمدخرات عند الحول.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* التبويب 3: المدخرات والالتزامات */}
        <TabsContent value="expenses-savings" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" />
                المدخرات الحالية والالتزامات السنوية المعيشية
              </CardTitle>
              <CardDescription className="text-xs">
                أدخل رصيدك الادخاري القائم والمصاريف الأساسية لحساب الفائض الصافي بدقة.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  إجمالي المدخرات والسيولة الحالية لدى المعلم في البنك (عند حلول الحول)
                </Label>
                <Input
                  type="number"
                  className="border-emerald-500/40 focus-visible:ring-emerald-500 font-bold"
                  placeholder="مثال: 45000"
                  value={currentSavings}
                  onChange={(e) => setCurrentSavings(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">المصاريف الأساسية المعيشية للأسرة (شهرياً)</Label>
                <Input
                  type="number"
                  placeholder="مثال: 5000 (إيجار، طعام، تعليم أبناء)"
                  value={livingExpensesMonthly}
                  onChange={(e) => setLivingExpensesMonthly(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">أقساط السكن والسيارة والديون القصيرة (سنوياً)</Label>
                <Input
                  type="number"
                  placeholder="مثال: 18000"
                  value={debtsAndInstallmentsAnnual}
                  onChange={(e) => setDebtsAndInstallmentsAnnual(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 4. اختيار الطريقة الشرعية والنتائج التفصيلية */}
      <Card className="border-emerald-600/30 shadow-md">
        <CardHeader className="bg-emerald-500/5 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-emerald-600" />
                النتيجة والتقرير الشرعي النهائي لزكاة المعلم
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                اختر الفتوى المعتمدة لحساب زكاة دخل المعلم واستعرض الوعاء الشرعي المباشر.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-background p-1.5 rounded-lg border">
              <span className="text-xs font-medium">التقويم:</span>
              <Button
                size="sm"
                variant={!useGregorian ? "default" : "outline"}
                onClick={() => setUseGregorian(false)}
                className="h-7 text-xs"
              >
                هجري (2.5%)
              </Button>
              <Button
                size="sm"
                variant={useGregorian ? "default" : "outline"}
                onClick={() => setUseGregorian(true)}
                className="h-7 text-xs"
              >
                ميلادي (2.577%)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* اختيار الطريقة */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              onClick={() => setMethod("yearly")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                method === "yearly"
                  ? "border-emerald-600 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs">1. السنوية على المدخرات</span>
                {method === "yearly" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                رأي الجمهور: احتساب 2.5% على الأرصدة والمدخرات الفائضة لدى المعلم عند حولان الحول.
              </p>
            </div>

            <div
              onClick={() => setMethod("on-receipt")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                method === "on-receipt"
                  ? "border-emerald-600 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs">2. الفورية عند القبض</span>
                {method === "on-receipt" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                رأي القرضاوي: إخراج الزكاة فور استلام مكافآت الدروس الخصوصية والأنشطة لإبراء الذمة.
              </p>
            </div>

            <div
              onClick={() => setMethod("net-income")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                method === "net-income"
                  ? "border-emerald-600 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs">3. وعاء الدخل الصافي</span>
                {method === "net-income" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                تزكية صافي الفائض من الدخل السنوي المعلمي بعد خصم الحاجات المعيشية والديون.
              </p>
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-lg text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">وصف الطريقة المختارة: </span>
            {calcs.methodDescription}
          </div>

          {/* جدولة ملخص الوعاء الزكوي */}
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-xs md:text-sm text-right">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3">بيان البند الزكوي للمعلم</th>
                  <th className="p-3">القيمة المحسوبة</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 font-medium">إجمالي الدخل الرسمي والبدلات التعليمية (سنوياً)</td>
                  <td className="p-3 font-bold">{fmt(calcs.totalAnnualOfficialSalary)} {currencyName}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">إجمالي دخل الدروس الخصوصية والمكافآت الموسمية</td>
                  <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">+{fmt(calcs.totalAnnualSideIncome)} {currencyName}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">إجمالي التكاليف والمصاريف المعيشية والديون السنوية</td>
                  <td className="p-3 font-bold text-rose-500 font-mono">-{fmt(calcs.totalAnnualExpenses)} {currencyName}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">المدخرات والسيولة القائمة ببنك المعلم</td>
                  <td className="p-3 font-bold">{fmt(calcs.savings)} {currencyName}</td>
                </tr>
                <tr className="bg-emerald-500/10 font-bold">
                  <td className="p-3 text-emerald-900 dark:text-emerald-200">الوعاء الزكوي الخاضع للحساب ({calcs.ratePercent}%)</td>
                  <td className="p-3 text-emerald-900 dark:text-emerald-200">{fmt(calcs.baseAmount)} {currencyName}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* التقييم والتنبيه النهائي */}
          {calcs.reachesNisab ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-100 flex items-center gap-1.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" /> الوعاء بلغ النصاب الشرعي (أكثر من {fmt(nisabValue)} {currencyName})
                </span>
                <Badge className="bg-white/20 text-white hover:bg-white/30 border-none">
                  وجوب الزكاة
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-emerald-200">مجموع الزكاة الواجب إخراجها:</span>
                <span className="text-3xl font-black tracking-tight">{fmt(calcs.zakatDue)}</span>
                <span className="text-sm font-semibold">{currencyName}</span>
              </div>
              <p className="text-xs text-emerald-100/80 leading-relaxed border-t border-emerald-500/40 pt-2.5">
                يمكنك توزيع هذا المبلغ على مصارف الزكاة الثمانية الشرعية، ويستحب للمعلم توجيه جزء منها لمصرف "في سبيل الله" وكفالة طلبة العلم الفقراء والمساكين.
              </p>
            </div>
          ) : (
            <Alert variant="default" className="border-slate-300 bg-slate-50 dark:bg-slate-900/50">
              <Info className="h-4 w-4 text-slate-600" />
              <AlertTitle className="text-sm font-semibold">الوعاء الزكوي لم يبلغ النصاب الشرعي</AlertTitle>
              <AlertDescription className="text-xs leading-relaxed text-muted-foreground mt-1">
                الوعاء المحسوب (<strong>{fmt(calcs.baseAmount)} {currencyName}</strong>) أقل من قيمة نصاب الذهب الشرعي المعتمد (<strong>{fmt(nisabValue)} {currencyName}</strong>). لا تجب الزكاة حالياً، وتستحب الصدقة النافلة لبركة المال والتعليم.
              </AlertDescription>
            </Alert>
          )}

          {/* 5. قسم الأوقاف التعليمية والتوجيه الشرعي */}
          <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
            <h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <HeartHandshake className="h-4 w-4 text-emerald-600" />
              توجيه الزكاة والأوقاف التعليمية للمعلمين
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تُجيز المجامع الفقهية المعاصرة للمعلم كفالة الطلاب المعوزين وشراء المستلزمات الدراسية من محفظة الزكاة تحت مصرف (الفقراء والمساكين) أو المساهمة في الأوقاف التعليمية المستدامة لتبقى صدقة جارية.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
