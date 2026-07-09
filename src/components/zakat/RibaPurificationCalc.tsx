import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { num, fmt } from "@/lib/zakat";
import { ShieldAlert } from "lucide-react";

interface Props {
  currencyName?: string;
}

export default function RibaPurificationCalc({ currencyName = "ج.م" }: Props) {
  const [interest, setInterest] = useState("");
  const [mixedRevenue, setMixedRevenue] = useState("");
  const [haramPct, setHaramPct] = useState("");

  const result = useMemo(() => {
    const direct = num(interest);
    const mixed = num(mixedRevenue) * (Math.min(100, Math.max(0, num(haramPct))) / 100);
    return { direct, mixed, total: direct + mixed };
  }, [interest, mixedRevenue, haramPct]);

  return (
    <Card className="border-destructive/40 mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-5 w-5" />
          تطهير الفوائد الربوية والإيرادات المختلطة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>فوائد بنكية ربوية مباشرة (إن وُجدت)</Label>
          <Input
            inputMode="decimal"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>إيرادات الشركة المختلطة</Label>
            <Input
              inputMode="decimal"
              value={mixedRevenue}
              onChange={(e) => setMixedRevenue(e.target.value)}
            />
          </div>
          <div>
            <Label>نسبة المكوّن المحرم %</Label>
            <Input
              inputMode="decimal"
              value={haramPct}
              onChange={(e) => setHaramPct(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-destructive/5 p-4 space-y-1">
          <div className="text-sm text-muted-foreground">يجب التخلّص من (دون نية الأجر)</div>
          <div className="text-2xl font-bold text-destructive">
            {fmt(result.total)} {currencyName}
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t mt-2">
            <div>
              مباشر: {fmt(result.direct)} {currencyName}
            </div>
            <div>
              محسوب من المختلط: {fmt(result.mixed)} {currencyName}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground border-r-2 border-destructive/40 pr-3 leading-relaxed">
          <strong>الحكم:</strong> الفوائد الربوية وإيرادات الأنشطة المحرمة تُصرف في وجوه الخير
          العامة (مرافق، طرق، فقراء) بنية التخلّص لا التقرّب، ولا تُحسب ضمن الزكاة. (المعيار الشرعي
          21 — AAOIFI، قرار مجمع الفقه الإسلامي رقم 30).
        </p>
      </CardContent>
    </Card>
  );
}
