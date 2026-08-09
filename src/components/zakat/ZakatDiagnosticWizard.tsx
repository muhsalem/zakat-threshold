import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Stethoscope,
  CheckCircle2,
  HelpCircle,
  Building2,
  User,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Calculator,
} from "lucide-react";

interface ZakatDiagnosticWizardProps {
  onSelectPath?: (path: "individual" | "company" | "profession" | "crypto") => void;
}

export function ZakatDiagnosticWizard({ onSelectPath }: ZakatDiagnosticWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [userType, setUserType] = useState<"individual" | "company">("individual");
  const [hasHawl, setHasHawl] = useState<"yes" | "no">("yes");
  const [activity, setActivity] = useState<"cash" | "trade" | "profession" | "crypto">("cash");

  const handleComplete = () => {
    let chosenPath: "individual" | "company" | "profession" | "crypto" = "individual";
    if (userType === "company") {
      chosenPath = "company";
    } else if (activity === "profession") {
      chosenPath = "profession";
    } else if (activity === "crypto") {
      chosenPath = "crypto";
    }

    if (onSelectPath) {
      onSelectPath(chosenPath);
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-background via-muted/20 to-primary/5 shadow-md" dir="rtl">
      <CardHeader className="border-b pb-4 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              المُوجّه والتشخيص الزكوي الذكي (Zakat Diagnostic Wizard)
            </CardTitle>
            <CardDescription className="text-xs">
              أجب عن أسئلة بسيطة لتشخيص حالتك وتوجيهك فوراً للمسار الشرعي والمحاسبي الأنسب لمالك.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary text-xs">
            الخطوة {step} من 3
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {step === 1 && (
          <div className="space-y-4">
            <Label className="text-sm font-bold text-foreground">1. ما هي فئة المستخدم التي تمثلها؟</Label>
            <RadioGroup value={userType} onValueChange={(v) => setUserType(v as "individual" | "company")} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  userType === "individual" ? "border-primary bg-primary/10" : "hover:border-muted-foreground/40 bg-background"
                }`}
                onClick={() => setUserType("individual")}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <User className="h-4 w-4 text-primary" /> فرد (مدخرات، ذهب، رواتب، أصل مالي)
                </div>
                <p className="text-xs text-muted-foreground mt-1">حساب زكاة الأفراد والمستقلين وأصحاب المهن.</p>
              </div>

              <div
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  userType === "company" ? "border-primary bg-primary/10" : "hover:border-muted-foreground/40 bg-background"
                }`}
                onClick={() => setUserType("company")}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Building2 className="h-4 w-4 text-primary" /> شركة / مؤسسة تجارية أو خدمية
                </div>
                <p className="text-xs text-muted-foreground mt-1">حساب الوعاء الزكوي للمؤسسات وفق معيار AAOIFI 35.</p>
              </div>
            </RadioGroup>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Label className="text-sm font-bold text-foreground">2. ما هي الطبيعة الأساسية لأموالك أو نشاطك؟</Label>
            <RadioGroup value={activity} onValueChange={(v) => setActivity(v as any)} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div
                className={`p-3 rounded-xl border cursor-pointer ${
                  activity === "cash" ? "border-primary bg-primary/10" : "bg-background"
                }`}
                onClick={() => setActivity("cash")}
              >
                <div className="font-bold text-sm">سيولة نقدية وذهب وأسهم</div>
                <p className="text-muted-foreground mt-0.5">أموال مدخرة في البنوك أو أصول نقدية ومعادن.</p>
              </div>

              <div
                className={`p-3 rounded-xl border cursor-pointer ${
                  activity === "profession" ? "border-primary bg-primary/10" : "bg-background"
                }`}
                onClick={() => setActivity("profession")}
              >
                <div className="font-bold text-sm">دخل مهني وحر (معلم، طبيب، مهندس)</div>
                <p className="text-muted-foreground mt-0.5">إيراد المهن الحرة والأنشطة الرقمية.</p>
              </div>

              <div
                className={`p-3 rounded-xl border cursor-pointer ${
                  activity === "trade" ? "border-primary bg-primary/10" : "bg-background"
                }`}
                onClick={() => setActivity("trade")}
              >
                <div className="font-bold text-sm">عروض تجارة ومخزون تجاري</div>
                <p className="text-muted-foreground mt-0.5">بضائع معدة للبيع والمشروعات التجارية.</p>
              </div>

              <div
                className={`p-3 rounded-xl border cursor-pointer ${
                  activity === "crypto" ? "border-primary bg-primary/10" : "bg-background"
                }`}
                onClick={() => setActivity("crypto")}
              >
                <div className="font-bold text-sm">عملات رقمية وأصول مشفرة</div>
                <p className="text-muted-foreground mt-0.5">Bitcoin, Stablecoins والأصول المشفرة.</p>
              </div>
            </RadioGroup>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Label className="text-sm font-bold text-foreground">3. حالة الحول والنصاب الشرعي</Label>
            <div className="p-4 rounded-xl border bg-success/10 border-success/30 text-xs space-y-2">
              <div className="font-bold text-success dark:text-success flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" /> ملخص التوجيه التشخيصي
              </div>
              <p className="text-muted-foreground leading-relaxed">
                بناءً على إجاباتك، تم تحديد خوارزميات الحساب المناسبة لك وفق معايير هيئة AAOIFI وتوصيات ندوات الزكاة المعاصرة.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          {step > 1 ? (
            <Button size="sm" variant="outline" onClick={() => setStep(step - 1)} className="gap-1">
              <ArrowRight className="h-4 w-4" /> السابق
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} className="gap-1">
              التالي <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" className="bg-success hover:bg-success text-white gap-1.5" onClick={handleComplete}>
              <Calculator className="h-4 w-4" /> التوجه لحساب الزكاة
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
