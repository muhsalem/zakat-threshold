import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  GraduationCap,
  Stethoscope,
  Compass,
  Scale,
  MonitorSmartphone,
  Wrench,
  Calculator,
  CheckCircle2,
  Info,
  Coins,
  Briefcase,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { num, fmt, ZAKAT_RATE } from "@/lib/zakat";

export type ProfessionType = "teacher" | "doctor" | "engineer" | "lawyer" | "freelancer" | "craftsman";

interface ProfessionsZakatSectionProps {
  currencyName?: string;
  onZakatChange?: (zakatAmount: number, details: any) => void;
}

export function ProfessionsZakatSection({
  currencyName = "ر.س",
  onZakatChange,
}: ProfessionsZakatSectionProps) {
  const [selectedProfession, setSelectedProfession] = useState<ProfessionType>("teacher");

  // خيار حماية منع الازدواج الزكوي
  const [alreadyInCashBank, setAlreadyInCashBank] = useState(false);

  // 1. المعلمون والتربويون
  const [teacherBasic, setTeacherBasic] = useState("");
  const [teacherAllowances, setTeacherAllowances] = useState("");
  const [teacherTutoring, setTeacherTutoring] = useState("");
  const [teacherBonuses, setTeacherBonuses] = useState("");

  // 2. الأطباء والكوادر الصحية
  const [doctorSalary, setDoctorSalary] = useState("");
  const [doctorPrivateClinic, setDoctorPrivateClinic] = useState("");
  const [doctorSurgeriesBonus, setDoctorSurgeriesBonus] = useState("");

  // 3. المهندسون والاستشاريون
  const [engineerSalary, setEngineerSalary] = useState("");
  const [engineerConsulting, setEngineerConsulting] = useState("");
  const [engineerSupervision, setEngineerSupervision] = useState("");

  // 4. المحامون والمستشارون القانونيون
  const [lawyerFees, setLawyerFees] = useState("");
  const [lawyerContracts, setLawyerContracts] = useState("");

  // 5. الأعمال الحرة والخدمات الرقمية
  const [freelancerIncome, setFreelancerIncome] = useState("");
  const [freelancerSubscriptions, setFreelancerSubscriptions] = useState("");

  // 6. الحرفيون والصناعات اليدوية
  const [craftsmanServiceIncome, setCraftsmanServiceIncome] = useState("");
  const [craftsmanMaterialsCost, setCraftsmanMaterialsCost] = useState("");

  // المدخر والمصروف الفعلي المستقطع (مشترك)
  const [professionSavedCapital, setProfessionSavedCapital] = useState("");

  // احتساب الزكاة والوعاء مع ضمان عدم الازدواج
  const calcs = useMemo(() => {
    let grossIncomeAnnual = 0;
    let title = "";

    if (selectedProfession === "teacher") {
      title = "الكادر التعليمي والتربوي";
      const monthlySalary = num(teacherBasic) + num(teacherAllowances);
      const tutoringAnnual = num(teacherTutoring) * 12;
      const bonusesAnnual = num(teacherBonuses);
      grossIncomeAnnual = monthlySalary * 12 + tutoringAnnual + bonusesAnnual;
    } else if (selectedProfession === "doctor") {
      title = "الكوادر الطبية والصحية";
      const monthlySalary = num(doctorSalary);
      const privateAnnual = num(doctorPrivateClinic) * 12;
      const surgeriesAnnual = num(doctorSurgeriesBonus);
      grossIncomeAnnual = monthlySalary * 12 + privateAnnual + surgeriesAnnual;
    } else if (selectedProfession === "engineer") {
      title = "المهندسون والاستشاريون";
      const monthlySalary = num(engineerSalary);
      const consultingAnnual = num(engineerConsulting);
      const supervisionAnnual = num(engineerSupervision);
      grossIncomeAnnual = monthlySalary * 12 + consultingAnnual + supervisionAnnual;
    } else if (selectedProfession === "lawyer") {
      title = "المحامون والاستشارات القانونية";
      const feesAnnual = num(lawyerFees);
      const contractsAnnual = num(lawyerContracts);
      grossIncomeAnnual = feesAnnual + contractsAnnual;
    } else if (selectedProfession === "freelancer") {
      title = "الخدمات الرقمية والأعمال الحرة";
      const incomeAnnual = num(freelancerIncome);
      const saasAnnual = num(freelancerSubscriptions);
      grossIncomeAnnual = incomeAnnual + saasAnnual;
    } else {
      title = "الحرفيون والمهن المستقلة";
      const incomeAnnual = num(craftsmanServiceIncome);
      const costAnnual = num(craftsmanMaterialsCost);
      grossIncomeAnnual = Math.max(0, incomeAnnual - costAnnual);
    }

    const saved = num(professionSavedCapital);

    // إذا كان المال مدخراً بالفعل ومحسوباً في البنك، فيكون مبلغ الزكاة هنا 0 منعاً للازدواج!
    let zakatBase = 0;
    let zakatDue = 0;
    let isDoubleCountGuarded = false;

    if (alreadyInCashBank) {
      zakatBase = 0;
      zakatDue = 0;
      isDoubleCountGuarded = true;
    } else {
      zakatBase = saved > 0 ? saved : grossIncomeAnnual;
      zakatDue = zakatBase * ZAKAT_RATE;
    }

    return {
      title,
      grossIncomeAnnual,
      saved,
      zakatBase,
      zakatDue,
      isDoubleCountGuarded,
    };
  }, [
    selectedProfession,
    alreadyInCashBank,
    teacherBasic,
    teacherAllowances,
    teacherTutoring,
    teacherBonuses,
    doctorSalary,
    doctorPrivateClinic,
    doctorSurgeriesBonus,
    engineerSalary,
    engineerConsulting,
    engineerSupervision,
    lawyerFees,
    lawyerContracts,
    freelancerIncome,
    freelancerSubscriptions,
    craftsmanServiceIncome,
    craftsmanMaterialsCost,
    professionSavedCapital,
  ]);

  // إشعار الأب بالمبلغ
  useEffect(() => {
    if (onZakatChange) {
      onZakatChange(calcs.zakatDue, {
        profession: selectedProfession,
        grossIncomeAnnual: calcs.grossIncomeAnnual,
        savedCapital: calcs.saved,
        zakatDue: calcs.zakatDue,
        isDoubleCountGuarded: calcs.isDoubleCountGuarded,
      });
    }
  }, [calcs, selectedProfession, onZakatChange]);

  return (
    <Card className="border-success/30 bg-card shadow-sm" dir="rtl">
      <CardHeader className="bg-success/5 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-success" />
              تبويب زكاة دخل المهن والأنشطة الإضافية
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              اختر مهنتك أو نشاطك الشخصي لحساب زكاة الدخل والبدلات والمكافآت التخصصية مع ضابط منع الازدواج.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-success border-success/40 text-xs w-fit flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-success" /> حماية عدم الازدواج الشرعي
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* شريط تنبيه شرعي لمنع الازدواج */}
        <Alert className="border-success/40 bg-success/10 text-success dark:text-success">
          <ShieldCheck className="h-4 w-4 text-success mt-0.5" />
          <AlertTitle className="text-xs font-bold">ضابط الفقه الشرعي لمنع الازدواج الزكوي (AAOIFI 35):</AlertTitle>
          <AlertDescription className="text-[11px] leading-relaxed mt-0.5">
            قال النبي ﷺ: <em>«لا تُثَنَّى الصَّدَقَةُ فِي عَامٍ»</em>. المال المدخر من المهنة يُزكى مرة واحدة فقط عن السنة؛ إما ضمن رصيدك بالبنك في قسم السيولة أو هنا فور استلامه، لضمان عدم الخصم أو التثنية المزدوجة.
          </AlertDescription>
        </Alert>

        {/* اختيار المهنة */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">اختر المهنة أو النشاط الذي تزاوله:</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <button
              type="button"
              onClick={() => setSelectedProfession("teacher")}
              className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all text-xs ${
                selectedProfession === "teacher"
                  ? "border-success bg-success/10 font-bold text-success dark:text-success ring-2 ring-success/30"
                  : "hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              <GraduationCap className="h-5 w-5 text-success" />
              <span>المعلمون والتربويون</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProfession("doctor")}
              className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all text-xs ${
                selectedProfession === "doctor"
                  ? "border-success bg-success/10 font-bold text-success dark:text-success ring-2 ring-success/30"
                  : "hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              <Stethoscope className="h-5 w-5 text-teal-600" />
              <span>الكوادر الطبية</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProfession("engineer")}
              className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all text-xs ${
                selectedProfession === "engineer"
                  ? "border-success bg-success/10 font-bold text-success dark:text-success ring-2 ring-success/30"
                  : "hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              <Compass className="h-5 w-5 text-blue-600" />
              <span>المهندسون والاستشارة</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProfession("lawyer")}
              className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all text-xs ${
                selectedProfession === "lawyer"
                  ? "border-success bg-success/10 font-bold text-success dark:text-success ring-2 ring-success/30"
                  : "hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              <Scale className="h-5 w-5 text-warning" />
              <span>المحاماة والقانون</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProfession("freelancer")}
              className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all text-xs ${
                selectedProfession === "freelancer"
                  ? "border-success bg-success/10 font-bold text-success dark:text-success ring-2 ring-success/30"
                  : "hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              <MonitorSmartphone className="h-5 w-5 text-indigo-600" />
              <span>الخدمات الرقمية</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProfession("craftsman")}
              className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all text-xs ${
                selectedProfession === "craftsman"
                  ? "border-success bg-success/10 font-bold text-success dark:text-success ring-2 ring-success/30"
                  : "hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              <Wrench className="h-5 w-5 text-slate-600" />
              <span>الحرفيون المستقلون</span>
            </button>
          </div>
        </div>

        {/* خيار حماية ومنع الازدواج الزكوي */}
        <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
          <div className="space-y-0.5">
            <Label className="text-xs font-bold text-foreground">
              هل مدخرات هذا الدخل مضافة بالفعل ضمن رصيدك البنكي في قسم السيولة؟
            </Label>
            <p className="text-[11px] text-muted-foreground">
              تفعيل هذا الخيار يحميك من تكرار زكاة نفس المال مرتين إذا كنت تضع مدخراتك في البنك.
            </p>
          </div>
          <Switch
            checked={alreadyInCashBank}
            onCheckedChange={setAlreadyInCashBank}
          />
        </div>

        {/* حقول إدخال بيانات المهنة المحددة */}
        <div className="p-4 rounded-xl border bg-muted/20 space-y-4">
          {/* 1. حقول المعلمين */}
          {selectedProfession === "teacher" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold flex items-center gap-1.5 text-success dark:text-success">
                <GraduationCap className="h-4 w-4" /> بنود دخل المعلم والتربوي
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[11px]">الراتب الأساسي الشهري</Label>
                  <Input
                    type="number"
                    placeholder="8500"
                    value={teacherBasic}
                    onChange={(e) => setTeacherBasic(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">بدل التدريس والنقل والصفوف</Label>
                  <Input
                    type="number"
                    placeholder="2000"
                    value={teacherAllowances}
                    onChange={(e) => setTeacherAllowances(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">دخل الدروس الخصوصية (شهرياً)</Label>
                  <Input
                    type="number"
                    placeholder="3000"
                    value={teacherTutoring}
                    onChange={(e) => setTeacherTutoring(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">مكافآت التصحيح والتأليف (سنوياً)</Label>
                  <Input
                    type="number"
                    placeholder="4000"
                    value={teacherBonuses}
                    onChange={(e) => setTeacherBonuses(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. حقول الأطباء */}
          {selectedProfession === "doctor" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold flex items-center gap-1.5 text-teal-800 dark:text-teal-300">
                <Stethoscope className="h-4 w-4" /> بنود دخل الطبيب والكادر الصحي
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px]">الراتب الشهري للمستشفى</Label>
                  <Input
                    type="number"
                    placeholder="15000"
                    value={doctorSalary}
                    onChange={(e) => setDoctorSalary(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">دخل عيادة / استشارات خاصة (شهرياً)</Label>
                  <Input
                    type="number"
                    placeholder="8000"
                    value={doctorPrivateClinic}
                    onChange={(e) => setDoctorPrivateClinic(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">مكافآت النوبتيات والعمليات (سنوياً)</Label>
                  <Input
                    type="number"
                    placeholder="12000"
                    value={doctorSurgeriesBonus}
                    onChange={(e) => setDoctorSurgeriesBonus(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. حقول المهندسين */}
          {selectedProfession === "engineer" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                <Compass className="h-4 w-4" /> بنود دخل المهندس والاستشاري
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px]">الراتب الوظيفي الشهري</Label>
                  <Input
                    type="number"
                    placeholder="12000"
                    value={engineerSalary}
                    onChange={(e) => setEngineerSalary(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">دخل الاستشارات والمخططات (سنوياً)</Label>
                  <Input
                    type="number"
                    placeholder="25000"
                    value={engineerConsulting}
                    onChange={(e) => setEngineerConsulting(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">أتعاب الإشراف الميداني (سنوياً)</Label>
                  <Input
                    type="number"
                    placeholder="15000"
                    value={engineerSupervision}
                    onChange={(e) => setEngineerSupervision(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. حقول المحامين */}
          {selectedProfession === "lawyer" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold flex items-center gap-1.5 text-warning dark:text-warning">
                <Scale className="h-4 w-4" /> بنود دخل المحامي والاستشارة القانونية
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px]">أتعاب القضايا والمرافعات (سنوياً)</Label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={lawyerFees}
                    onChange={(e) => setLawyerFees(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">أتعاب العقود والاستشارات والتحكيم (سنوياً)</Label>
                  <Input
                    type="number"
                    placeholder="30000"
                    value={lawyerContracts}
                    onChange={(e) => setLawyerContracts(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. حقول العمل الحر والتصميم والبرمجة */}
          {selectedProfession === "freelancer" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold flex items-center gap-1.5 text-indigo-800 dark:text-indigo-300">
                <MonitorSmartphone className="h-4 w-4" /> بنود دخل الخدمات الرقمية وصناعة المحتوى
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px]">أرباح مشاريع البرمجة والتصميم والعمولة (سنوياً)</Label>
                  <Input
                    type="number"
                    placeholder="40000"
                    value={freelancerIncome}
                    onChange={(e) => setFreelancerIncome(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">عوائد الاشتراكات الرقمية وSaaS والمحتوى (سنوياً)</Label>
                  <Input
                    type="number"
                    placeholder="15000"
                    value={freelancerSubscriptions}
                    onChange={(e) => setFreelancerSubscriptions(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. حقول الحرفيين */}
          {selectedProfession === "craftsman" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-300">
                <Wrench className="h-4 w-4" /> بنود دخل الحرفيين والمهن اليدوية
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px]">إجمالي إيراد الخدمات والصيانة (سنوياً)</Label>
                  <Input
                    type="number"
                    placeholder="35000"
                    value={craftsmanServiceIncome}
                    onChange={(e) => setCraftsmanServiceIncome(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">تكلفة المواد والمعدات المستهلكة (خصماً - سنوياً)</Label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={craftsmanMaterialsCost}
                    onChange={(e) => setCraftsmanMaterialsCost(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* المدخر الفعلي عند الحول للمهنة */}
          {!alreadyInCashBank && (
            <div className="border-t pt-3 mt-2 space-y-1.5">
              <Label className="text-xs font-semibold text-success dark:text-success">
                المدخرات والسيولة القائمة المتبقية من دخل المهنة عند حلول الحول (إن لم تكن مدخلة بالبنك):
              </Label>
              <Input
                type="number"
                className="border-success/40 font-bold"
                placeholder="مثال: أدخل رصيد الحساب الادخاري المتبقي نهاية العام"
                value={professionSavedCapital}
                onChange={(e) => setProfessionSavedCapital(e.target.value)}
              />
              <span className="text-[10px] text-muted-foreground">
                ملاحظة شرعية: إن لم يتم إدخال السيولة المدخرة عند الحول، يتم احتساب الزكاة على إجمالي الدخل السنوي بنسبة 2.5% احتياطاً.
              </span>
            </div>
          )}
        </div>

        {/* نتيجة الوعاء للمهنة */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-success/10 border border-success/30">
          <div className="space-y-0.5 text-right w-full sm:w-auto">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              الوعاء الزكوي لـ ({calcs.title}):
              {calcs.isDoubleCountGuarded && (
                <Badge variant="secondary" className="text-[10px] bg-success text-white">
                  محمي من الازدواج
                </Badge>
              )}
            </div>
            <div className="text-sm font-bold text-foreground">
              إجمالي الدخل السنوي: {fmt(calcs.grossIncomeAnnual)} {currencyName}
              {!alreadyInCashBank && ` | المدخر: ${fmt(calcs.saved)} ${currencyName}`}
            </div>
          </div>

          <div className="text-left w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0">
            <div className="text-xs text-success dark:text-success font-semibold">
              الزكاة المحسوبة للمهنة (2.5%):
            </div>
            <div className="text-lg font-black text-success dark:text-success">
              {fmt(calcs.zakatDue)} {currencyName}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
