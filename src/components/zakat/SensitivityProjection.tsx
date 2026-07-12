import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { num, fmt, ZAKAT_RATE } from "@/lib/zakat";
import { TrendingUp, Activity } from "lucide-react";

interface Props {
  zakatBase?: number;
  annualZakat?: number;
  currencyName?: string;
}

/**
 * تحليل الحساسية + توقعات زكاة متعددة السنوات
 * Sensitivity Analysis + Multi-Year Zakat Projections
 *
 * - يعرض ماذا يحدث للزكاة إذا تغيّر الوعاء بنسبة ±%
 * - يعرض توقع الزكاة لعدة سنوات قادمة مع نمو/تضخم سنوي مركّب
 */
export default function SensitivityProjection({
  zakatBase = 0,
  annualZakat = 0,
  currencyName = "ج.م",
}: Props) {
  const [years, setYears] = useState("10");
  const [growth, setGrowth] = useState("5");
  const [inflation, setInflation] = useState("3");
  const [shock, setShock] = useState("10");

  const base = zakatBase || annualZakat / ZAKAT_RATE;
  const zakat = annualZakat || base * ZAKAT_RATE;

  const sensitivity = useMemo(() => {
    const s = Math.max(0, Math.min(100, num(shock)));
    const steps = [-s, -s / 2, 0, s / 2, s];
    return steps.map((p) => {
      const newBase = base * (1 + p / 100);
      const z = newBase * ZAKAT_RATE;
      return { pct: p, base: newBase, zakat: z, delta: z - zakat };
    });
  }, [base, zakat, shock]);

  const projection = useMemo(() => {
    const y = Math.max(1, Math.min(30, Math.floor(num(years) || 1)));
    const g = num(growth) / 100;
    const inf = num(inflation) / 100;
    let cumulativeNominal = 0;
    let cumulativeReal = 0;
    const rows: {
      year: number;
      base: number;
      zakat: number;
      realZakat: number;
    }[] = [];
    for (let i = 1; i <= y; i++) {
      const projBase = base * Math.pow(1 + g, i);
      const z = projBase * ZAKAT_RATE;
      const real = z / Math.pow(1 + inf, i);
      cumulativeNominal += z;
      cumulativeReal += real;
      rows.push({ year: i, base: projBase, zakat: z, realZakat: real });
    }
    return { rows, cumulativeNominal, cumulativeReal, years: y };
  }, [base, years, growth, inflation]);

  return (
    <Card className="border-primary/40 mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          تحليل الحساسية وتوقعات الزكاة متعددة السنوات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* المدخلات */}
        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <Label>نسبة الصدمة ± %</Label>
            <Input inputMode="decimal" value={shock} onChange={(e) => setShock(e.target.value)} />
          </div>
          <div>
            <Label>عدد السنوات (1-30)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>
          <div>
            <Label>نمو الوعاء السنوي %</Label>
            <Input inputMode="decimal" value={growth} onChange={(e) => setGrowth(e.target.value)} />
          </div>
          <div>
            <Label>تضخم سنوي %</Label>
            <Input
              inputMode="decimal"
              value={inflation}
              onChange={(e) => setInflation(e.target.value)}
            />
          </div>
        </div>

        {base <= 0 ? (
          <div className="text-sm text-muted-foreground border rounded-md p-4 bg-muted/30">
            أدخل بيانات الزكاة في تبويب الأفراد أو الشركات أولاً ليتم تحليل الحساسية والتوقعات.
          </div>
        ) : (
          <>
            {/* تحليل الحساسية */}
            <section>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                تحليل الحساسية (Sensitivity Analysis)
              </h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="text-end p-2">تغيّر الوعاء</th>
                      <th className="text-end p-2">الوعاء الجديد</th>
                      <th className="text-end p-2">الزكاة المتوقعة</th>
                      <th className="text-end p-2">الفرق عن الحالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivity.map((r) => (
                      <tr
                        key={r.pct}
                        className={r.pct === 0 ? "bg-primary/10 font-semibold" : "border-t"}
                      >
                        <td className="p-2">
                          {r.pct > 0 ? "+" : ""}
                          {r.pct.toFixed(1)}%
                        </td>
                        <td className="p-2 font-mono">
                          {fmt(r.base)} {currencyName}
                        </td>
                        <td className="p-2 font-mono">
                          {fmt(r.zakat)} {currencyName}
                        </td>
                        <td
                          className={`p-2 font-mono ${r.delta > 0 ? "text-emerald-600" : r.delta < 0 ? "text-red-600" : ""}`}
                        >
                          {r.delta > 0 ? "+" : ""}
                          {fmt(r.delta)} {currencyName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                يُظهر هذا الجدول مدى تأثّر زكاتك إذا تغيّر وعاء الزكاة ارتفاعاً أو انخفاضاً بنسبة
                الصدمة المُدخلة.
              </p>
            </section>

            {/* توقعات متعددة السنوات */}
            <section>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                توقعات الزكاة لـ {projection.years} سنة قادمة
              </h3>
              <div className="rounded-lg border overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-muted [&_th]:shadow-[inset_0_-1px_0_hsl(var(--border))]">
                    <tr>
                      <th className="text-end p-2">السنة</th>
                      <th className="text-end p-2">الوعاء المتوقع</th>
                      <th className="text-end p-2">الزكاة (اسمية)</th>
                      <th className="text-end p-2">الزكاة (حقيقية بعد التضخم)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.rows.map((r) => (
                      <tr key={r.year} className="border-t">
                        <td className="p-2">{r.year}</td>
                        <td className="p-2 font-mono">
                          {fmt(r.base)} {currencyName}
                        </td>
                        <td className="p-2 font-mono">
                          {fmt(r.zakat)} {currencyName}
                        </td>
                        <td className="p-2 font-mono text-muted-foreground">
                          {fmt(r.realZakat)} {currencyName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">إجمالي الزكاة الاسمية</div>
                  <div className="text-lg font-bold text-primary">
                    {fmt(projection.cumulativeNominal)} {currencyName}
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">
                    إجمالي الزكاة بالقيمة الحقيقية (مخصومة بالتضخم)
                  </div>
                  <div className="text-lg font-bold">
                    {fmt(projection.cumulativeReal)} {currencyName}
                  </div>
                </div>
              </div>
            </section>

            <p className="text-xs text-muted-foreground border-e-2 border-primary/40 pe-3 leading-relaxed">
              <strong>ملاحظة:</strong> هذه التوقعات استرشادية فقط لأغراض التخطيط المالي، والزكاة
              الفعلية تُحتسب على الوعاء الحقيقي عند تمام الحول كل سنة. المعدل المعتمد:{" "}
              {(ZAKAT_RATE * 100).toFixed(3)}%.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
