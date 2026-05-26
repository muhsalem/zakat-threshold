import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Droplets, Info } from "lucide-react";
import { num, fmt, currency as cFmt } from "@/lib/zakat";

function NumField({ label, value, onChange, unit, hint }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="relative">
        <Input type="number" min="0" step="0.01" value={value}
          onChange={(e) => onChange(e.target.value)} placeholder="0"
          className="pl-16" dir="ltr" style={{ textAlign: "right" }} />
        {unit && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function PurificationCalculator({ currencyName = "ج.م" }: { currencyName?: string }) {
  const [totalRevenue, setTotalRevenue] = useState("");
  const [haramRevenue, setHaramRevenue] = useState("");
  const [interestIncome, setInterestIncome] = useState("");
  const [dividendOrProfit, setDividendOrProfit] = useState("");
  const [sharesOwned, setSharesOwned] = useState("");

  const r = useMemo(() => {
    const tot = num(totalRevenue);
    const haram = num(haramRevenue) + num(interestIncome);
    const ratio = tot > 0 ? haram / tot : 0;
    const perShare = num(dividendOrProfit) * ratio;
    const totalPurification = perShare * num(sharesOwned);
    return { tot, haram, ratio, perShare, totalPurification };
  }, [totalRevenue, haramRevenue, interestIncome, dividendOrProfit, sharesOwned]);

  return (
    <Card className="shadow-soft border-blue-500/30">
      <CardHeader className="bg-gradient-to-l from-blue-500/10 to-transparent">
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-600" />
          حاسبة التطهير الشرعي (Purification Calculator)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          لتطهير الإيرادات المختلطة في الأسهم المتوافقة (وفق معايير AAOIFI / المؤشرات الشرعية):
          <b className="text-foreground"> نسبة التطهير = الإيراد غير الحلال ÷ إجمالي الإيراد</b>،
          ثم يُضرب الناتج × الربح الموزع للسهم × عدد الأسهم المملوكة.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid md:grid-cols-2 gap-4">
          <NumField label="إجمالي إيرادات الشركة" value={totalRevenue} onChange={setTotalRevenue} unit={currencyName} />
          <NumField label="الإيرادات غير الحلال" value={haramRevenue} onChange={setHaramRevenue} unit={currencyName}
            hint="إيرادات أنشطة محرمة أو مختلطة (نسبة من النشاط)" />
          <NumField label="إيرادات الفوائد الربوية" value={interestIncome} onChange={setInterestIncome} unit={currencyName}
            hint="فوائد بنكية ودخل سندات تقليدية" />
          <NumField label="الربح الموزع لكل سهم (DPS)" value={dividendOrProfit} onChange={setDividendOrProfit} unit={currencyName} />
          <NumField label="عدد الأسهم المملوكة" value={sharesOwned} onChange={setSharesOwned} unit="سهم" />
        </div>

        <Separator />

        <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>إجمالي الإيرادات:</span>
            <b>{cFmt(r.tot, currencyName)}</b>
          </div>
          <div className="flex justify-between">
            <span>الإيراد غير الحلال (محرم + فوائد):</span>
            <b className="text-destructive">{cFmt(r.haram, currencyName)}</b>
          </div>
          <div className="flex justify-between items-center">
            <span>نسبة التطهير:</span>
            <Badge variant={r.ratio < 0.05 ? "default" : r.ratio < 0.1 ? "secondary" : "destructive"}>
              {(r.ratio * 100).toFixed(3)}%
            </Badge>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span>مبلغ التطهير للسهم الواحد:</span>
            <b>{cFmt(r.perShare, currencyName)}</b>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-blue-700 dark:text-blue-400 font-semibold">إجمالي مبلغ التطهير الواجب:</span>
            <b className="text-blue-700 dark:text-blue-400">{cFmt(r.totalPurification, currencyName)}</b>
          </div>
        </div>

        <Alert className="border-amber-500/30 bg-amber-500/5">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs leading-relaxed">
            <b>تنبيه شرعي:</b> مبلغ التطهير <b>لا يُحسب من الزكاة</b>، بل يُصرف في وجوه الخير العامة
            (إصلاحات عامة، فقراء بنية صدقة لا زكاة) — لأنه مال خبيث لا يصح إخراجه قربة لله ولا تبرأ به الذمة من الزكاة.
            النسبة المقبولة شرعاً للاستثمار: لا تتجاوز <b>5%</b> (AAOIFI) أو <b>أحياناً 33%</b> (S&amp;P Shariah لبعض البنود)،
            مع وجوب التطهير في الحالتين.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
