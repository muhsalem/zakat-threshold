import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Info } from "lucide-react";
import { ZAKAT_RATE } from "@/lib/zakat";

export type EsopReportData = {
  show: boolean;
  vestedShares: number;
  price: number;
  strike: number;
  intrinsic: number;
  rsuValue: number;
  base: number;
  intentTrade: boolean;
  zakat: number;
};

type Props = { currencyName?: string; onChange?: (d: EsopReportData) => void };

export function EsopZakatSection({ currencyName = "", onChange }: Props) {
  const [vestedShares, setVestedShares] = useState("");
  const [price, setPrice] = useState("");
  const [strike, setStrike] = useState("");
  const [rsuValue, setRsuValue] = useState("");
  const [intentTrade, setIntentTrade] = useState(true);

  const n = (v: string) => {
    const x = parseFloat(v);
    return Number.isFinite(x) ? x : 0;
  };

  const optionsIntrinsic = useMemo(
    () => Math.max(0, n(vestedShares) * Math.max(0, n(price) - n(strike))),
    [vestedShares, price, strike]
  );
  const base = optionsIntrinsic + n(rsuValue);
  const zakat = intentTrade ? base * ZAKAT_RATE : 0;

  return (
    <Card className="shadow-soft border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="h-4 w-4 text-primary" />
          زكاة خيارات الأسهم للموظفين (ESOP / RSU)
          <Badge variant="outline" className="text-[10px] mr-auto">AAOIFI 35</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed space-y-1">
            <p><b>الخيارات غير المستحقّة (Unvested):</b> لا زكاة لعدم تمام الملك.</p>
            <p><b>الخيارات المستحقّة (Vested):</b> تُزكّى على القيمة الجوهرية (سعر السوق − سعر التنفيذ) إن نوى المضاربة، أو على سعر الشراء إن نوى الاحتفاظ والاستفادة من الأرباح فقط (تُزكّى الموجودات الزكوية للشركة بحسب نسبة التملك).</p>
            <p><b>RSUs المستحقّة:</b> تعامل معاملة الأسهم العادية بحسب نية الاحتفاظ أو المتاجرة.</p>
            <p><b>المرجع:</b> AAOIFI 35 (زكاة) + قرارات الندوات الفقهية المعاصرة.</p>
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">عدد الخيارات المستحقّة (Vested)</Label>
            <Input inputMode="decimal" value={vestedShares} onChange={(e) => setVestedShares(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">سعر السهم الحالي</Label>
            <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">سعر التنفيذ (Strike)</Label>
            <Input inputMode="decimal" value={strike} onChange={(e) => setStrike(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">قيمة RSUs المستحقّة بسعر السوق</Label>
            <Input inputMode="decimal" value={rsuValue} onChange={(e) => setRsuValue(e.target.value)} placeholder="0" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={intentTrade} onCheckedChange={setIntentTrade} id="esop-intent" />
            <Label htmlFor="esop-intent" className="text-xs">نية المتاجرة (تُزكّى 2.5%)</Label>
          </div>
        </div>

        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm flex items-center justify-between">
          <span>قاعدة الزكاة (قيمة جوهرية + RSU)</span>
          <span className="font-bold text-primary">
            {base.toLocaleString()} {currencyName} → الزكاة {zakat.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currencyName}
          </span>
        </div>
        {!intentTrade && (
          <p className="text-[11px] text-muted-foreground">
            عند نية الاحتفاظ: تُزكّى الموجودات الزكوية للشركة بحسب نسبة تملّكك — أدخل قيمتها يدوياً ضمن قسم الأسهم.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
