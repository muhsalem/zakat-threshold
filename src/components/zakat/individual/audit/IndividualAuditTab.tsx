import {
  ClipboardCheck,
  User,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Info,
  Calculator,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShariaAuditTrail } from "../../ShariaAuditTrail";
import { ShariaStandardsCard } from "../../ShariaStandardsCard";
import AdvanceMultiYearZakat from "../../AdvanceMultiYearZakat";
import SensitivityProjection from "../../SensitivityProjection";
import InflationAdjusterCard from "../../InflationAdjusterCard";
import ZakatStatsDashboard from "../../ZakatStatsDashboard";
import { Row } from "../shared";

export type OpinionType = "clean" | "qualified" | "adverse";

export interface AuditEntry {
  id?: string;
  [key: string]: unknown;
}

export interface IndividualAuditTabProps {
  // accountant metadata
  accountantName: string;
  setAccountantName: (v: string) => void;
  accountantLicense: string;
  setAccountantLicense: (v: string) => void;
  accountantPreamble: string;
  setAccountantPreamble: (v: string) => void;
  accountantOpinion: string;
  setAccountantOpinion: (v: string) => void;
  opinionType: OpinionType;
  setOpinionType: (v: OpinionType) => void;
  previousYearZakat: string;
  setPreviousYearZakat: (v: string) => void;
  includeAuditReport: boolean;
  setIncludeAuditReport: (v: boolean) => void;

  // audit stream
  auditLoading: boolean;
  auditEntries: AuditEntry[];

  // computed
  calc: {
    total: number;
    monetaryGross: number;
    monetaryBase: number;
    moneyNisab: number;
    debts: number;
  };
  cur: (n: number) => string;
  currencyName: string;
}

export function IndividualAuditTab({
  accountantName,
  setAccountantName,
  accountantLicense,
  setAccountantLicense,
  accountantPreamble,
  setAccountantPreamble,
  accountantOpinion,
  setAccountantOpinion,
  opinionType,
  setOpinionType,
  previousYearZakat,
  setPreviousYearZakat,
  includeAuditReport,
  setIncludeAuditReport,
  auditLoading,
  auditEntries,
  calc,
  cur,
  currencyName,
}: IndividualAuditTabProps) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <Alert className="border-primary/30 bg-primary/5">
          <ClipboardCheck className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            هذا القسم مُخصَّص للمحاسب/المدقق الشرعي لمراجعة بيانات المُزكِّي وإبداء الرأي المهني
            المناسب الذي يظهر لاحقاً في التقرير المطبوع. <b>تنبيه:</b> هذه أداة مساعدة للحساب وفق
            مدخلات المستخدم وليست فتوى شرعية ملزمة.
          </AlertDescription>
        </Alert>

        {/* سجل التدقيق الشرعي للأوعية الزكوية (مَنقول من تبويب الحساب) */}
        <ShariaAuditTrail />

        {/* أدوات متقدمة للمراجعة والامتثال */}
        <Card className="shadow-soft border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" /> أدوات المراجعة والتخطيط
              المتقدمة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdvanceMultiYearZakat annualZakat={calc.total} currencyName={currencyName} />
            <SensitivityProjection annualZakat={calc.total} currencyName={currencyName} />
            <InflationAdjusterCard currencyName={currencyName} />
            <ZakatStatsDashboard />
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> بيانات المحاسب الشرعي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">اسم محاسب الزكاة</Label>
                <Input
                  value={accountantName}
                  onChange={(e) => setAccountantName(e.target.value)}
                  placeholder="الاسم الكامل"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">رقم القيد / الترخيص</Label>
                <Input
                  value={accountantLicense}
                  onChange={(e) => setAccountantLicense(e.target.value)}
                  placeholder="رقم الترخيص"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ديباجة المحاسب (تظهر في رأس التقرير)</Label>
              <Textarea
                value={accountantPreamble}
                onChange={(e) => setAccountantPreamble(e.target.value)}
                rows={6}
                className="text-xs leading-6"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> صنف النتيجة الشرعية التقديرية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RadioGroup
              value={opinionType}
              onValueChange={(v) => setOpinionType(v as OpinionType)}
              className="space-y-2"
            >
              <label
                htmlFor="op-clean"
                className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40"
              >
                <RadioGroupItem value="clean" id="op-clean" className="mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <b>نتيجة التقييم الزكوي</b> — الوعاء الزكوي مستوفٍ شروط الوجوب وفق البيانات
                  المُدخَلة.
                </div>
              </label>
              <label
                htmlFor="op-qual"
                className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40"
              >
                <RadioGroupItem value="qualified" id="op-qual" className="mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <b>خلاصة الفحص الزكوي</b> — توجد بنود تحتاج إلى مراجعة فقهية أو محاسبية تخصصية
                  قبل اعتماد النتيجة.
                </div>
              </label>
              <label
                htmlFor="op-adv"
                className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40"
              >
                <RadioGroupItem value="adverse" id="op-adv" className="mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <b>ملخص التحقق من النصاب</b> — الوعاء الزكوي أقل من النصاب الشرعي ولا تجب الزكاة
                  في هذا الحول.
                </div>
              </label>
            </RadioGroup>

            <div className="space-y-1">
              <Label className="text-xs">نص الرأي المهني التفصيلي (اختياري)</Label>
              <Textarea
                value={accountantOpinion}
                onChange={(e) => setAccountantOpinion(e.target.value)}
                rows={3}
                placeholder="ملاحظات المحاسب على بنود التقرير أو تحفظاته…"
                className="text-xs leading-6"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">إجمالي زكاة العام السابق (للمقارنة)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={previousYearZakat}
                onChange={(e) => setPreviousYearZakat(e.target.value)}
                dir="ltr"
                style={{ textAlign: "right" }}
                placeholder="0"
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              <Info className="inline h-3 w-3 ml-1" />
              تظهر النتيجة الشرعية التقديرية والمقارنة في التقرير المطبوع، إضافةً إلى رقم تسلسلي
              وبصمة SHA‑256 ورابط تحقق إلكتروني.
            </p>
          </CardContent>
        </Card>

        {/* خيار دمج سجل المراجعة والتدقيق ضمن التقرير */}
        <Card className="shadow-soft border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> دمج سجل المراجعة والتدقيق ضمن التقرير
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="space-y-1 flex-1">
                <Label className="text-sm font-bold">إدراج ملحق المراجعة والتدقيق</Label>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  عند التفعيل، يُضاف ملحق في نهاية تقرير الزكاة يتضمن سجل العمليات السابقة (الحفظ
                  والحساب) ببصمة فريدة (SHA‑256) والمراجع الشرعية المستخدمة. يتطلب تسجيل الدخول.
                </p>
              </div>
              <Switch checked={includeAuditReport} onCheckedChange={setIncludeAuditReport} />
            </div>
            {includeAuditReport && (
              <Alert className="border-primary/30 bg-primary/5">
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {auditLoading
                    ? "جاري تحميل سجلات المراجعة…"
                    : auditEntries.length > 0
                      ? `سيُضاف ملحق يحتوي ${auditEntries.length} عملية مُسجَّلة في تقرير الزكاة.`
                      : "لا توجد سجلات بعد. سجّل دخولك واحفظ أول حساب زكاة لتظهر السجلات هنا."}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" /> قائمة فحص الإمتثال الشرعي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs space-y-2 leading-relaxed">
              {[
                "تم التحقق من بلوغ النصاب الشرعي (ذهب/فضة) وفق الأسعار اللحظية.",
                "تم احتساب الحَوْل بالتقويم الهجري (354 يوماً) ما لم يُختَر التقويم الميلادي بنسبة 2.577%.",
                "تم خصم الديون الحالّة وقسط السنة من الديون المؤجلة فقط.",
                "لم تُدخَل بنود محرَّمة شرعاً ضمن الوعاء (فوائد ربوية، عوائد محرَّمة) دون تطهير.",
                "تم تصنيف الذهب بين زينة وادخار وفق غرض الاقتناء.",
                "تم تطبيق مبدأ الأنفع للفقراء عند اختلاف نصابي الذهب والفضة.",
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* المعايير الشرعية حسب النشاط — مدمَجة في تبويب المراجعة والتدقيق */}
        <ShariaStandardsCard defaultSector="general" />
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="border-gold/30 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-gold" /> ملخص للمراجعة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="إجمالي الأصول النقدية" value={cur(calc.monetaryGross)} />
            <Row label="الديون المخصومة" value={cur(calc.debts)} />
            <Row label="الوعاء الصافي" value={cur(calc.monetaryBase)} highlight />
            <Row label="النصاب المُعتمد (الأنفع)" value={cur(calc.moneyNisab)} />
            <Separator className="my-2" />
            <Row label="إجمالي الزكاة المستحقة" value={cur(calc.total)} highlight />
            {parseFloat(previousYearZakat || "0") > 0 && (
              <Row
                label="الفرق عن العام السابق"
                value={cur(calc.total - parseFloat(previousYearZakat))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default IndividualAuditTab;
