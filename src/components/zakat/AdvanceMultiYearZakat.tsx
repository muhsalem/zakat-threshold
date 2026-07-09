import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { num, fmt } from "@/lib/zakat";
import { CalendarPlus } from "lucide-react";

interface Props {
  annualZakat?: number;
  currencyName?: string;
}

export default function AdvanceMultiYearZakat({ annualZakat = 0, currencyName = "ج.م" }: Props) {
  const [years, setYears] = useState("2");
  const [growth, setGrowth] = useState("0");

  const result = useMemo(() => {
    const y = Math.max(1, Math.min(5, Math.floor(num(years) || 1)));
    const g = Math.max(-50, Math.min(50, num(growth))) / 100;
    let cumulative = 0;
    const breakdown: { year: number; estimate: number }[] = [];
    for (let i = 0; i < y; i++) {
      const est = annualZakat * Math.pow(1 + g, i);
      cumulative += est;
      breakdown.push({ year: i + 1, estimate: est });
    }
    return { total: cumulative, breakdown, years: y };
  }, [years, growth, annualZakat]);

  return (
    <Card className="border-primary/40 mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarPlus className="h-5 w-5" />
          تعجيل الزكاة لعدة سنوات (مأذون به عند الجمهور)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>عدد السنوات (1-5)</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>
          <div>
            <Label>توقّع نمو/تضخم سنوي %</Label>
            <Input inputMode="decimal" value={growth} onChange={(e) => setGrowth(e.target.value)} />
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
          <div className="text-sm text-muted-foreground">تقدير زكاة {result.years} سنوات قادمة</div>
          <div className="text-2xl font-bold text-primary">
            {fmt(result.total)} {currencyName}
          </div>
          <div className="text-xs space-y-1 pt-2 border-t">
            {result.breakdown.map((b) => (
              <div key={b.year} className="flex justify-between">
                <span>السنة {b.year}</span>
                <span className="font-mono">
                  {fmt(b.estimate)} {currencyName}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground border-r-2 border-primary/40 pr-3 leading-relaxed">
          <strong>الحكم:</strong> أجاز الجمهور (الحنفية والشافعية والحنابلة) تعجيل الزكاة لسنة أو
          أكثر بشرط ملك النصاب، ويُحتسب من زكاة السنوات القادمة. ويُجبر الفرق إن زاد الواجب الفعلي
          عند الحول. (المغني لابن قدامة، المجموع للنووي).
        </p>
      </CardContent>
    </Card>
  );
}
