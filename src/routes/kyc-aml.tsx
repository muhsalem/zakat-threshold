import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/kyc-aml")({
  head: () => ({
    meta: [
      { title: "فحص KYC/AML للمكلَّفين المؤسسيين | نصاب" },
      {
        name: "description",
        content:
          "نموذج فحص مبدئي KYC/AML قبل قبول العميل — مطابقة القوائم، تقييم المخاطر، وتصنيف المصدر.",
      },
    ],
  }),
  component: KycAml,
});

const COUNTRY_RISK: Record<string, "low" | "medium" | "high"> = {
  SA: "low",
  AE: "low",
  KW: "low",
  QA: "low",
  BH: "low",
  OM: "low",
  EG: "medium",
  JO: "medium",
  MA: "medium",
  TR: "medium",
  MY: "low",
  ID: "medium",
  IR: "high",
  SY: "high",
  YE: "high",
  SD: "high",
  AF: "high",
  KP: "high",
};

type Answers = {
  entityType: string;
  countryIso: string;
  monthlyVolume: string;
  fundSource: string;
  isPep: boolean;
  isSanctioned: boolean;
  hasCashHeavy: boolean;
};

function KycAml() {
  const [a, setA] = useState<Answers>({
    entityType: "individual",
    countryIso: "SA",
    monthlyVolume: "10000",
    fundSource: "salary",
    isPep: false,
    isSanctioned: false,
    hasCashHeavy: false,
  });
  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");

  const result = useMemo(() => {
    let score = 0;
    const flags: string[] = [];
    const countryRisk = COUNTRY_RISK[a.countryIso.toUpperCase()] || "medium";
    if (countryRisk === "high") {
      score += 40;
      flags.push("دولة عالية المخاطر");
    } else if (countryRisk === "medium") {
      score += 15;
    }
    const vol = parseFloat(a.monthlyVolume) || 0;
    if (vol > 500_000) {
      score += 25;
      flags.push("حجم تعاملات مرتفع");
    } else if (vol > 100_000) {
      score += 10;
    }
    if (a.isPep) {
      score += 20;
      flags.push("شخص معرَّض سياسياً (PEP)");
    }
    if (a.isSanctioned) {
      score += 100;
      flags.push("مدرج بقوائم عقوبات");
    }
    if (a.hasCashHeavy) {
      score += 15;
      flags.push("تعاملات نقدية مكثّفة");
    }
    if (a.fundSource === "unknown") {
      score += 20;
      flags.push("مصدر أموال غير موثّق");
    }
    if (a.fundSource === "crypto") {
      score += 10;
      flags.push("مصدر رقمي — يتطلّب تتبّع");
    }

    const level: "low" | "medium" | "high" | "reject" =
      score >= 100 ? "reject" : score >= 60 ? "high" : score >= 30 ? "medium" : "low";

    const decision =
      level === "reject"
        ? "رفض تلقائي — الإحالة للمسؤول"
        : level === "high"
          ? "قبول مشروط — Enhanced Due Diligence"
          : level === "medium"
            ? "قبول قياسي — مراقبة دورية"
            : "قبول مبسّط — منخفض المخاطر";

    return { score, level, flags, decision, countryRisk };
  }, [a]);

  const submit = () => {
    // في الإنتاج: تُرسل النتيجة لخادم آمن مع سجل تدقيق
    console.info("[KYC/AML] submission", { fullName, nationalId, ...a, ...result });
  };

  const badge = (l: string) => {
    const map: Record<string, string> = {
      low: "bg-success text-success border-success",
      medium: "bg-warning text-warning border-warning",
      high: "bg-orange-100 text-orange-800 border-orange-300",
      reject: "bg-destructive text-destructive border-destructive",
    };
    return map[l] || "bg-muted";
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-4">
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            فحص KYC / AML المبدئي
            <Badge variant="secondary" className="me-auto">
              Compliance
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription className="text-xs">
              فحص مبدئي لتقييم مخاطر العميل قبل قبوله في المنصّة (خصوصاً المكلَّفين المؤسسيين).
              النتيجة استرشادية — القرار النهائي بيد مسؤول الامتثال، وتُحفظ سجلات الفحص لسبع سنوات.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">الاسم الكامل / الكيان</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">رقم الهوية / السجل التجاري</Label>
              <Input value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">نوع الكيان</Label>
              <Select value={a.entityType} onValueChange={(v) => setA({ ...a, entityType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">فرد</SelectItem>
                  <SelectItem value="company">شركة</SelectItem>
                  <SelectItem value="ngo">جمعية / وقف</SelectItem>
                  <SelectItem value="bank">مؤسسة مالية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">الدولة (ISO)</Label>
              <Input
                value={a.countryIso}
                onChange={(e) => setA({ ...a, countryIso: e.target.value.toUpperCase() })}
                maxLength={2}
              />
              <div className="text-[11px] text-muted-foreground">
                مخاطر الدولة: <b>{result.countryRisk}</b>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">متوسط الحجم الشهري (USD)</Label>
              <Input
                type="number"
                value={a.monthlyVolume}
                onChange={(e) => setA({ ...a, monthlyVolume: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">مصدر الأموال</Label>
              <Select value={a.fundSource} onValueChange={(v) => setA({ ...a, fundSource: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">راتب / دخل عمل</SelectItem>
                  <SelectItem value="business">دخل تجاري موثّق</SelectItem>
                  <SelectItem value="investment">عوائد استثمارية</SelectItem>
                  <SelectItem value="inheritance">ميراث / هبة</SelectItem>
                  <SelectItem value="crypto">أصول رقمية</SelectItem>
                  <SelectItem value="unknown">غير موثّق</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
            <Checkbox
              label="شخص معرَّض سياسياً (PEP)"
              checked={a.isPep}
              onChange={(v) => setA({ ...a, isPep: v })}
            />
            <Checkbox
              label="مدرج بقوائم عقوبات"
              checked={a.isSanctioned}
              onChange={(v) => setA({ ...a, isSanctioned: v })}
            />
            <Checkbox
              label="تعاملات نقدية مكثّفة"
              checked={a.hasCashHeavy}
              onChange={(v) => setA({ ...a, hasCashHeavy: v })}
            />
          </div>

          <div className={`rounded border p-3 ${badge(result.level)}`}>
            <div className="flex items-center gap-2 mb-1">
              {result.level === "reject" ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <b>القرار: {result.decision}</b>
              <Badge variant="outline" className="me-auto bg-white/50">
                Score: {result.score}
              </Badge>
            </div>
            {result.flags.length > 0 && (
              <ul className="list-disc pe-5 text-xs space-y-0.5">
                {result.flags.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
          </div>

          <Button onClick={submit} disabled={!fullName || !nationalId}>
            حفظ الفحص وإرسال للامتثال
          </Button>

          <p className="text-[11px] text-muted-foreground">
            المرجع: FATF Recommendations · IFSB-16 · لائحة مكافحة غسل الأموال في دول التعاون
            الخليجي. الفحص المبدئي لا يُغني عن التحقّق البنكي (KYB) الكامل قبل تفعيل الحساب المؤسسي.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded border p-2 cursor-pointer text-xs hover:bg-muted/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
      <span>{label}</span>
    </label>
  );
}
