import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HandHeart, RotateCcw, Info, AlertTriangle } from "lucide-react";
import { ZAKAT_RECIPIENTS, fmt } from "@/lib/zakat";

interface Props {
  netDue: number;
  currencyName?: string;
}

// نسب افتراضية تقليدية مبنية على واقع كثير من لجان الزكاة المعاصرة
// (الفقراء/المساكين الأكبر، الغارمون وابن السبيل والمؤلفة بحسب الحاجة).
// قابلة للتعديل بالكامل من المستخدم.
const DEFAULT_PCT = [35, 30, 5, 5, 0, 10, 10, 5]; // مجموع = 100

export function EightChannelsDistribution({ netDue, currencyName = "ج.م" }: Props) {
  const [pct, setPct] = useState<number[]>(DEFAULT_PCT);

  // لا نعيد ضبط النسب عند تغير المبلغ — التوزيع نسبي
  useEffect(() => {
    if (pct.length !== ZAKAT_RECIPIENTS.length) setPct(DEFAULT_PCT);
  }, [pct.length]);

  const total = useMemo(() => pct.reduce((s, p) => s + (Number(p) || 0), 0), [pct]);
  const balanced = Math.abs(total - 100) < 0.01;

  const update = (i: number, v: string) => {
    const n = Math.max(0, Math.min(100, Number(v) || 0));
    setPct((cur) => cur.map((x, idx) => (idx === i ? n : x)));
  };

  const reset = () => setPct(DEFAULT_PCT);

  const distributeEqually = () => {
    const each = +(100 / ZAKAT_RECIPIENTS.length).toFixed(2);
    setPct(ZAKAT_RECIPIENTS.map(() => each));
  };

  const focusPoor = () => setPct([60, 30, 0, 0, 0, 5, 0, 5]);

  return (
    <Card className="shadow-soft border-primary/20 print:break-before-page">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HandHeart className="h-4 w-4 text-primary" />
          خطة توزيع الزكاة على المصارف الشرعية الثمانية
          <Badge variant="outline" className="text-[10px] mr-auto">
            التوبة: 60
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            عدّل النسبة المئوية لكل مصرف بحسب حاجة بلدك ولجنتك. يجوز اقتصار الصرف على بعض المصارف
            عند الحاجة (وهو رأي جمهور الفقهاء)، ولا يُشترط استيعاب الثمانية جميعًا.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={reset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> الافتراضي
          </Button>
          <Button size="sm" variant="outline" onClick={distributeEqually}>
            توزيع متساوٍ
          </Button>
          <Button size="sm" variant="outline" onClick={focusPoor}>
            تركيز على الفقراء والمساكين
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-md overflow-hidden">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="text-right p-2">المصرف</th>
                <th className="text-right p-2 w-24">النسبة %</th>
                <th className="text-right p-2">المبلغ المخصَّص</th>
                <th className="text-right p-2 hidden md:table-cell">الوصف الشرعي</th>
              </tr>
            </thead>
            <tbody>
              {ZAKAT_RECIPIENTS.map((r, i) => {
                const amount = ((Number(pct[i]) || 0) / 100) * (netDue || 0);
                return (
                  <tr key={r.name} className="border-t">
                    <td className="p-2 font-semibold">{r.name}</td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={String(pct[i] ?? 0)}
                        onChange={(e) => update(i, e.target.value)}
                        dir="ltr"
                        style={{ textAlign: "right" }}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="p-2 font-mono text-primary">
                      {fmt(amount)} {currencyName}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground hidden md:table-cell">
                      {r.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/40 font-bold">
              <tr className="border-t">
                <td className="p-2">الإجمالي</td>
                <td className={`p-2 ${balanced ? "text-primary" : "text-destructive"}`}>
                  {total.toFixed(2)}%
                </td>
                <td className="p-2 text-primary">
                  {fmt(netDue || 0)} {currencyName}
                </td>
                <td className="hidden md:table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>

        {!balanced && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              مجموع النسب {total.toFixed(2)}% — يجب أن يساوي 100% لتوزيع كامل المبلغ.
            </AlertDescription>
          </Alert>
        )}

        {netDue <= 0 && (
          <div className="text-xs text-muted-foreground">
            أدخل/احسب قيمة الزكاة المستحقة أولاً ليتم توزيعها هنا تلقائيًا.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EightChannelsDistribution;
