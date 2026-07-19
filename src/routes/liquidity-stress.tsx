import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { ZAKAT_RATE } from "@/lib/zakat";

export const Route = createFileRoute("/liquidity-stress")({
  head: () => ({
    meta: [
      { title: "اختبار الإجهاد للسيولة الزكوية | نصاب" },
      {
        name: "description",
        content: "محاكاة أثر صرف الزكاة على سيولة المؤسسة وفق سيناريوهات أساس/متوسط/حاد.",
      },
    ],
  }),
  component: LiquidityStress,
});

function LiquidityStress() {
  const [zakatBase, setZakatBase] = useState("1000000");
  const [cash, setCash] = useState("500000");
  const [monthlyOpex, setMonthlyOpex] = useState("120000");
  const [inflowStress, setInflowStress] = useState("30"); // % انخفاض التدفقات
  const [runwayTarget, setRunwayTarget] = useState("3"); // شهور مطلوبة

  const num = (v: string) => Math.max(0, parseFloat(v) || 0);

  const s = useMemo(() => {
    const base = num(zakatBase);
    const c = num(cash);
    const opex = num(monthlyOpex);
    const stress = num(inflowStress) / 100;
    const target = num(runwayTarget);
    const zakat = base * ZAKAT_RATE;

    const scenarios = [
      { name: "أساس", cashAfter: c - zakat, opexAdj: opex },
      { name: "متوسط", cashAfter: c - zakat, opexAdj: opex * (1 + stress / 2) },
      { name: "حاد", cashAfter: c - zakat * 1.05, opexAdj: opex * (1 + stress) },
    ].map((x) => {
      const runway = x.opexAdj > 0 ? x.cashAfter / x.opexAdj : Infinity;
      return { ...x, runway, safe: runway >= target };
    });
    return { zakat, scenarios };
  }, [zakatBase, cash, monthlyOpex, inflowStress, runwayTarget]);

  const fmt = (n: number) => new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4">
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            اختبار الإجهاد للسيولة الزكوية
            <Badge variant="secondary" className="me-auto">
              Liquidity Stress Test
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription className="text-xs">
              محاكاة أثر إخراج الزكاة على مدرج السيولة (Runway) عبر ثلاثة سيناريوهات: أساس، متوسط،
              حاد. يساعد المؤسسات على التخطيط لصرف الزكاة دون الإخلال بالتشغيل.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="الوعاء الزكوي" value={zakatBase} setter={setZakatBase} />
            <Field label="النقد المتاح" value={cash} setter={setCash} />
            <Field
              label="المصروفات التشغيلية الشهرية"
              value={monthlyOpex}
              setter={setMonthlyOpex}
            />
            <Field
              label="% انخفاض التدفقات (Stress)"
              value={inflowStress}
              setter={setInflowStress}
            />
            <Field
              label="مدرج السيولة المستهدف (شهور)"
              value={runwayTarget}
              setter={setRunwayTarget}
            />
          </div>

          <div className="rounded border p-3 bg-primary/5">
            <div className="text-xs text-muted-foreground">الزكاة المستحقة</div>
            <div className="text-2xl font-bold text-primary tabular-nums">{fmt(s.zakat)}</div>
          </div>

          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-end p-2">السيناريو</th>
                  <th className="text-start p-2">النقد بعد الزكاة</th>
                  <th className="text-start p-2">Opex معدَّل</th>
                  <th className="text-start p-2">مدرج (شهور)</th>
                  <th className="text-center p-2">الحكم</th>
                </tr>
              </thead>
              <tbody>
                {s.scenarios.map((x) => (
                  <tr key={x.name} className="border-t">
                    <td className="p-2 font-medium">{x.name}</td>
                    <td className="p-2 text-start tabular-nums">{fmt(x.cashAfter)}</td>
                    <td className="p-2 text-start tabular-nums">{fmt(x.opexAdj)}</td>
                    <td className="p-2 text-start tabular-nums">{x.runway.toFixed(1)}</td>
                    <td className="p-2 text-center">
                      {x.safe ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> آمن
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" /> تحذير
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-muted-foreground">
            التوصية الشرعية: يجوز تقسيط إخراج الزكاة إذا خُشي على المؤسسة الإخلال بالسيولة
            التشغيلية، على أن يكتمل الصرف قبل حلول الحول التالي. راجع فتوى AAOIFI SS 35 §3/2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  setter,
}: {
  label: string;
  value: string;
  setter: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => setter(e.target.value)}
        inputMode="decimal"
      />
    </div>
  );
}
