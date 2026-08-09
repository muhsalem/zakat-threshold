import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { num, fmt } from "@/lib/zakat";
import { TrendingDown } from "lucide-react";

interface Props {
  currencyName?: string;
}

export default function InflationAdjusterCard({ currencyName = "ج.م" }: Props) {
  const [nisab, setNisab] = useState("");
  const [inflation, setInflation] = useState("");
  const [years, setYears] = useState("1");

  const result = useMemo(() => {
    const n = num(nisab);
    const i = num(inflation) / 100;
    const y = Math.max(0, num(years));
    const adjusted = n * Math.pow(1 + i, y);
    const realLoss = adjusted - n;
    return { adjusted, realLoss };
  }, [nisab, inflation, years]);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          تعديل النصاب وفق التضخم (للدول ذات التضخم المرتفع)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>قيمة النصاب الحالية</Label>
            <Input inputMode="decimal" value={nisab} onChange={(e) => setNisab(e.target.value)} />
          </div>
          <div>
            <Label>معدّل التضخم السنوي %</Label>
            <Input
              inputMode="decimal"
              value={inflation}
              onChange={(e) => setInflation(e.target.value)}
            />
          </div>
          <div>
            <Label>عدد السنوات</Label>
            <Input inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} />
          </div>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">النصاب المُعدَّل (القوة الشرائية)</div>
            <div className="font-bold text-lg">
              {fmt(result.adjusted)} {currencyName}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">فرق التضخم</div>
            <div className="font-bold text-lg text-warning">
              {fmt(result.realLoss)} {currencyName}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground border-e-2 border-primary/40 pe-3">
          المرجع: ندوة قضايا الزكاة المعاصرة — يُعتبر تقدير النصاب بالأنفع للفقراء؛ في الدول ذات
          التضخم العالي يُوصى بتحديث قيمة النصاب الذهبية/الفضية دوريًا.
        </p>
      </CardContent>
    </Card>
  );
}
