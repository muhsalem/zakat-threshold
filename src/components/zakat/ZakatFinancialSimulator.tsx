import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, RefreshCw, Calculator, DollarSign } from "lucide-react";
import { fmt, ZAKAT_RATE } from "@/lib/zakat";

interface ZakatFinancialSimulatorProps {
  initialBase?: number;
  currencyName?: string;
}

export function ZakatFinancialSimulator({
  initialBase = 500000,
  currencyName = "ر.س",
}: ZakatFinancialSimulatorProps) {
  const [baseValue, setBaseValue] = useState<number>(initialBase);
  const [debtAdjustment, setDebtAdjustment] = useState<number>(0);
  const [goldPriceChange, setGoldPriceChange] = useState<number>(0); // نسبة مئوية لتغير الذهب

  // الحسابات المحاكية
  const simulatedZakat = useMemo(() => {
    const netBase = Math.max(0, baseValue - debtAdjustment);
    const zakatDue = netBase * ZAKAT_RATE;
    const initialZakat = initialBase * ZAKAT_RATE;
    const deltaZakat = zakatDue - initialZakat;

    return {
      netBase,
      zakatDue,
      deltaZakat,
    };
  }, [baseValue, debtAdjustment, initialBase]);

  return (
    <Card className="border-indigo-500/30 bg-card shadow-sm" dir="rtl">
      <CardHeader className="bg-indigo-500/5 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              محاكي السيناريوهات المالية الزكوية (Zakat Financial Simulator)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              اختبر تأثير القرارات المالية وسداد الديون وتغير أسعار الأصول على قيمة زكاتك المستحقة فوراً.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-indigo-500/40 text-indigo-700 dark:text-indigo-300 text-xs">
            محاكي تفاعلي حي
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* التحكم في المتغيرات */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label className="font-bold">إجمالي الأصول الزكوية (النقد والمخزون):</Label>
                <span className="font-mono text-indigo-600 font-bold">{fmt(baseValue)} {currencyName}</span>
              </div>
              <Slider
                value={[baseValue]}
                min={10000}
                max={2000000}
                step={10000}
                onValueChange={([val]) => setBaseValue(val)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label className="font-bold">تسديد ديون وخصومات قبل الحول:</Label>
                <span className="font-mono text-rose-500 font-bold">-{fmt(debtAdjustment)} {currencyName}</span>
              </div>
              <Slider
                value={[debtAdjustment]}
                min={0}
                max={baseValue}
                step={5000}
                onValueChange={([val]) => setDebtAdjustment(val)}
              />
            </div>
          </div>

          {/* نتيجة المحاكاة وتأثير التغيير */}
          <div className="p-4 rounded-xl border bg-muted/20 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">صافي الوعاء المحاكى:</span>
              <div className="text-xl font-bold text-foreground font-mono">
                {fmt(simulatedZakat.netBase)} {currencyName}
              </div>
            </div>

            <div className="space-y-1 border-t pt-2">
              <span className="text-xs text-muted-foreground">الزكاة المستحقة المحاكاة (2.5%):</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {fmt(simulatedZakat.zakatDue)} {currencyName}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold pt-1">
              {simulatedZakat.deltaZakat < 0 ? (
                <div className="flex items-center gap-1 text-emerald-600">
                  <TrendingDown className="h-4 w-4" /> توفير في الزكاة بمقدار {fmt(Math.abs(simulatedZakat.deltaZakat))} {currencyName}
                </div>
              ) : simulatedZakat.deltaZakat > 0 ? (
                <div className="flex items-center gap-1 text-amber-600">
                  <TrendingUp className="h-4 w-4" /> زيادة في الزكاة بمقدار {fmt(simulatedZakat.deltaZakat)} {currencyName}
                </div>
              ) : (
                <div className="text-muted-foreground">لا يوجد تغيير مقارنة بالوضع الحالي</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
