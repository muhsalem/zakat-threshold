import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, GitCompare, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fmt } from "@/lib/zakat";

export type CalcMethodId =
  | "net_assets"
  | "net_working_capital"
  | "working_capital"
  | "net_income"
  | "net_equity"
  | "invested_funds";

type Props = {
  values: Record<CalcMethodId, number>;
  labels: Record<CalcMethodId, string>;
  labelsEn: Record<CalcMethodId, string>;
  active: CalcMethodId;
  onSelect: (m: CalcMethodId) => void;
  zakatableRatio: number;
  rate: number;
  nisabValue: number;
  currencyName: string;
};

const METHOD_FORMULA: Record<CalcMethodId, string> = {
  net_assets: "الأصول المتداولة الزكوية − المطلوبات المتداولة",
  net_working_capital: "إجمالي المتداول − إجمالي الخصوم المتداولة",
  working_capital: "(حقوق الملكية + خصوم طويلة) − (ثابتة + غير ملموسة + خسائر)",
  net_income: "الإيرادات − المصروفات التشغيلية − الإيرادات غير الزكوية",
  net_equity: "(رأس المال + الاحتياطيات + المحتجزة) − (ثابتة + غير ملموسة + خسائر)",
  invested_funds: "(حقوق + خصوم طويلة + مخصصات) − (ثابتة + غير ملموسة + استثمارات طويلة + خسائر)",
};

const METHOD_SOURCE: Record<CalcMethodId, string> = {
  net_assets: "AAOIFI FAS 9 · هيئة المحاسبة والمراجعة",
  net_working_capital: "قرار مجمع الفقه الإسلامي 28",
  working_capital: "الطريقة الأصولية — ابن رشد",
  net_income: "قرار الهيئة السعودية للزكاة والدخل",
  net_equity: "أسلوب حقوق الملكية — الزحيلي",
  invested_funds: "الطريقة الفنية — القرضاوي، فقه الزكاة",
};

export function MethodsComparison({
  values,
  labels,
  labelsEn,
  active,
  onSelect,
  zakatableRatio,
  rate,
  nisabValue,
  currencyName,
}: Props) {
  const rows = useMemo(() => {
    const items = (Object.keys(values) as CalcMethodId[]).map((id) => {
      const gross = values[id];
      const base = gross * zakatableRatio;
      const reaches = base >= nisabValue && nisabValue > 0;
      const zakat = gross > 0 && reaches ? base * rate : 0;
      return { id, gross, base, reaches, zakat };
    });
    const positive = items.filter((i) => i.zakat > 0);
    const maxZ = positive.length > 0 ? Math.max(...positive.map((i) => i.zakat)) : 0;
    const minZ = positive.length > 0 ? Math.min(...positive.map((i) => i.zakat)) : 0;
    const avgZ =
      positive.length > 0 ? positive.reduce((s, i) => s + i.zakat, 0) / positive.length : 0;
    return { items, maxZ, minZ, avgZ, positiveCount: positive.length };
  }, [values, zakatableRatio, rate, nisabValue]);

  const spread = rows.maxZ - rows.minZ;
  const spreadPct = rows.avgZ > 0 ? (spread / rows.avgZ) * 100 : 0;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompare className="h-5 w-5 text-primary" /> مقارنة الطرق الست جنبًا إلى جنب
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          احسب نفس البيانات بست معادلات فقهية-محاسبية وقارن الوعاء والزكاة قبل اعتماد طريقة واحدة.
          الطريقة المُعتمدة حاليًا مُظلَّلة.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {rows.positiveCount >= 2 && (
          <Alert className="border-primary/20 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs flex flex-wrap gap-x-4 gap-y-1">
              <span>
                أعلى زكاة:{" "}
                <b dir="ltr">
                  {fmt(rows.maxZ)} {currencyName}
                </b>
              </span>
              <span>
                أقلها:{" "}
                <b dir="ltr">
                  {fmt(rows.minZ)} {currencyName}
                </b>
              </span>
              <span>
                المتوسط:{" "}
                <b dir="ltr">
                  {fmt(rows.avgZ)} {currencyName}
                </b>
              </span>
              <span>
                فارق التشتت بين الطرق: <b dir="ltr">{spreadPct.toFixed(1)}%</b>
              </span>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.items.map((it) => {
            const isActive = it.id === active;
            const trend =
              it.zakat === rows.maxZ && rows.positiveCount > 1
                ? {
                    icon: <TrendingUp className="h-3 w-3" />,
                    tag: "الأعلى",
                    cls: "bg-destructive/10 text-destructive dark:text-destructive border-destructive/30",
                  }
                : it.zakat === rows.minZ && rows.positiveCount > 1 && it.zakat > 0
                  ? {
                      icon: <TrendingDown className="h-3 w-3" />,
                      tag: "الأدنى",
                      cls: "bg-success/10 text-success dark:text-success border-success/30",
                    }
                  : null;

            return (
              <div
                key={it.id}
                className={`rounded-lg border p-3 space-y-2 transition ${
                  isActive
                    ? "border-primary bg-primary/5 ring-2 ring-primary/40"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold flex items-center gap-1.5">
                      {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      {labels[it.id]}
                    </div>
                    <div className="text-[10px] text-muted-foreground" dir="ltr">
                      {labelsEn[it.id]}
                    </div>
                  </div>
                  {trend && (
                    <Badge variant="outline" className={`text-[10px] gap-1 ${trend.cls}`}>
                      {trend.icon}
                      {trend.tag}
                    </Badge>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed border-e-2 border-primary/30 pe-2">
                  {METHOD_FORMULA[it.id]}
                </p>

                <div className="space-y-1 text-xs">
                  <RowLine
                    label="الوعاء (خام)"
                    value={fmt(it.gross)}
                    currency={currencyName}
                    negative={it.gross < 0}
                  />
                  <RowLine
                    label="بعد استبعاد الحصص المعفاة"
                    value={fmt(it.base)}
                    currency={currencyName}
                    negative={it.base < 0}
                  />
                  <div className="flex items-center justify-between border-t pt-1.5 mt-1">
                    <span className="text-muted-foreground">الزكاة المستحقة</span>
                    <span
                      className={`font-bold text-sm ${it.zakat > 0 ? "text-primary" : "text-muted-foreground"}`}
                      dir="ltr"
                    >
                      {it.zakat > 0
                        ? `${fmt(it.zakat)} ${currencyName}`
                        : it.gross <= 0
                          ? "—"
                          : "دون النصاب"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-muted-foreground">{METHOD_SOURCE[it.id]}</span>
                  {isActive ? (
                    <Badge className="text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" /> مُعتمدة
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => onSelect(it.id)}
                    >
                      اعتمد هذه الطريقة
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {rows.positiveCount === 0 && (
          <div className="text-center text-xs text-muted-foreground py-3 flex items-center justify-center gap-2">
            <Minus className="h-4 w-4" /> لا توجد قيم كافية بعد — أدخل بيانات كل طريقة في تبويبها
            لتظهر النتائج في المقارنة.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RowLine({
  label,
  value,
  currency,
  negative,
}: {
  label: string;
  value: string;
  currency: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={negative ? "text-destructive" : ""} dir="ltr">
        {value} {currency}
      </span>
    </div>
  );
}
