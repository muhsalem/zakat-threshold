import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Building2, ChevronLeft, ChevronRight, FileText, CheckCircle2 } from "lucide-react";
import { fmt } from "@/lib/zakat";
import { validateCompanyInputs, type ValidationError } from "@/lib/validation/companyInputsSchema";
import { toast } from "sonner";
import { SaveToHistoryCard } from "@/components/zakat/SaveToHistoryCard";

const STEPS = [
  { key: "basics", title: "البيانات الأساسية" },
  { key: "balance", title: "الميزانية المختصرة" },
  { key: "exempt", title: "الحصص المعفاة" },
  { key: "review", title: "المراجعة والتقرير" },
] as const;

export function CompanyWizard() {
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [activity, setActivity] = useState("");
  const [totalAssets, setTotalAssets] = useState("");
  const [totalEquity, setTotalEquity] = useState("");
  const [currentAssets, setCurrentAssets] = useState("");
  const [currentLiabilities, setCurrentLiabilities] = useState("");
  const [shForeign, setShForeign] = useState("0");
  const [shGov, setShGov] = useState("0");
  const [shCond, setShCond] = useState("0");
  const [shNonMuslim, setShNonMuslim] = useState("0");
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const num = (x: string) => parseFloat(x || "0") || 0;

  const validation = useMemo(() => {
    return validateCompanyInputs({
      totalAssets: num(totalAssets),
      totalEquity: num(totalEquity),
      currentAssets: num(currentAssets),
      currentLiabilities: num(currentLiabilities),
      exemptShareForeign: num(shForeign) / 100,
      exemptShareGovernment: num(shGov) / 100,
      exemptShareConditional: num(shCond) / 100,
      exemptShareNonMuslim: num(shNonMuslim) / 100,
    });
  }, [totalAssets, totalEquity, currentAssets, currentLiabilities, shForeign, shGov, shCond, shNonMuslim]);

  const computed = useMemo(() => {
    if (!validation.ok) return null;
    const d = validation.data;
    const base = Math.max(0, d.currentAssets - d.currentLiabilities);
    const exempt = d.exemptShareForeign + d.exemptShareGovernment + d.exemptShareConditional + d.exemptShareNonMuslim;
    const zakatable = base * (1 - exempt);
    return { base, exempt, zakatable, zakat: zakatable * 0.025 };
  }, [validation]);

  function tryNext() {
    if (step === 1 || step === 2) {
      if (!validation.ok) {
        setErrors(validation.errors);
        toast.error("رجاء تصحيح الأخطاء قبل المتابعة");
        return;
      }
      setErrors([]);
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function printReport() {
    if (!validation.ok) {
      setErrors(validation.errors);
      toast.error("لا يمكن إصدار التقرير قبل تصحيح المدخلات");
      return;
    }
    window.print();
  }

  const pct = ((step + 1) / STEPS.length) * 100;
  const hasError = (path: string) => errors.some((e) => e.path === path);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" /> {STEPS[step].title}
          </CardTitle>
          <Badge variant="outline" className="text-xs">{step + 1} / {STEPS.length}</Badge>
        </div>
        <Progress value={pct} className="h-2" />
      </CardHeader>

      <CardContent className="space-y-4">
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>يوجد {errors.length} خطأ في المدخلات</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pr-4 mt-1 space-y-0.5 text-xs">
                {errors.map((e, i) => <li key={i}>{e.message}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <TextField label="اسم الشركة" v={companyName} set={setCompanyName} />
            <TextField label="نوع النشاط" v={activity} set={setActivity} placeholder="تجارة، صناعة، خدمات…" />
          </div>
        )}

        {step === 1 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <NumField label="إجمالي الموجودات" v={totalAssets} set={setTotalAssets} err={hasError("totalAssets")} />
            <NumField label="حقوق الملكية" v={totalEquity} set={setTotalEquity} err={hasError("totalEquity")} />
            <NumField label="الموجودات المتداولة" v={currentAssets} set={setCurrentAssets} err={hasError("currentAssets")} />
            <NumField label="المطلوبات المتداولة" v={currentLiabilities} set={setCurrentLiabilities} err={hasError("currentLiabilities")} />
          </div>
        )}

        {step === 2 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <NumField label="حصة الأجانب %" v={shForeign} set={setShForeign} err={hasError("exemptShareForeign")} />
            <NumField label="الحصة الحكومية %" v={shGov} set={setShGov} />
            <NumField label="حصص مشروطة %" v={shCond} set={setShCond} />
            <NumField label="حصص غير المسلمين %" v={shNonMuslim} set={setShNonMuslim} />
            <p className="sm:col-span-2 text-[11px] text-muted-foreground">مجموع الحصص يجب ألا يتجاوز 100%.</p>
          </div>
        )}

        {step === 3 && computed && (
          <div className="rounded-lg border p-4 space-y-2">
            <Row label="الشركة" text={companyName || "—"} />
            <Row label="النشاط" text={activity || "—"} />
            <Row label="وعاء الزكاة الخام (متداول − متداولة خصوم)" v={computed.base} />
            <Row label={`نسبة الإعفاء (${(computed.exempt * 100).toFixed(1)}%)`} text="—" />
            <Row label="الوعاء الزكوي بعد الإعفاء" v={computed.zakatable} />
            <div className="flex items-center justify-between border-t pt-2 mt-2">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" /> الزكاة المستحقة (2.5%)
              </span>
              <span className="font-bold text-lg text-primary" dir="ltr">{fmt(computed.zakat)}</span>
            </div>
            <Button onClick={printReport} className="w-full gap-2 mt-3">
              <FileText className="h-4 w-4" /> تصدير تقرير PDF
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="gap-1">
            <ChevronRight className="h-4 w-4" /> السابق
          </Button>
          <Button size="sm" onClick={tryNext} disabled={step === STEPS.length - 1} className="gap-1">
            التالي <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TextField({ label, v, set, placeholder }: { label: string; v: string; set: (x: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={v} onChange={(e) => set(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
function NumField({ label, v, set, err }: { label: string; v: string; set: (x: string) => void; err?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number" inputMode="decimal" min="0"
        value={v} onChange={(e) => set(e.target.value)}
        dir="ltr"
        aria-invalid={err || undefined}
        className={err ? "border-destructive focus-visible:ring-destructive" : ""}
      />
    </div>
  );
}
function Row({ label, v, text }: { label: string; v?: number; text?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span dir="ltr" className="font-medium">{text ?? (v !== undefined ? fmt(v) : "")}</span>
    </div>
  );
}
