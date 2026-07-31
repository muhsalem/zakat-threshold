import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Scale } from "lucide-react";
import {
  CORPORATE_METHODOLOGIES,
  computeBaseByMethodology,
  crossCheckMethodologies,
  type CategoryTotals,
  type CorporateMethodologyId,
} from "@/lib/zakat/corporate-methodologies";
import { ZAKAT_CATEGORIES, type ClassifiedRow, type ZakatCategory } from "@/lib/erp/zakatMapping";

const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });

function toTotals(rows: ClassifiedRow[]): CategoryTotals {
  const totals = Object.fromEntries(
    (Object.keys(ZAKAT_CATEGORIES) as ZakatCategory[]).map((c) => [c, 0]),
  ) as CategoryTotals;
  for (const r of rows) totals[r.category] += Math.abs(r.balance);
  return totals;
}

export interface MethodologyCrossCheckCardProps {
  rows: ClassifiedRow[];
}

export function MethodologyCrossCheckCard({ rows }: MethodologyCrossCheckCardProps) {
  const { results, check } = useMemo(() => {
    const totals = toTotals(rows);
    const ids: CorporateMethodologyId[] = Object.keys(
      CORPORATE_METHODOLOGIES,
    ) as CorporateMethodologyId[];
    return {
      results: ids.map((id) => computeBaseByMethodology(totals, id)),
      check: crossCheckMethodologies(totals),
    };
  }, [rows]);

  return (
    <Card className="border-primary/20 shadow-soft" dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-primary" />
          منهجيات وعاء زكاة الشركات — تحقق متقاطع
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          {results.map((r) => (
            <div key={r.methodology.id} className="rounded-md border p-3 text-xs">
              <div className="font-semibold">{r.methodology.nameAr}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {r.methodology.descriptionAr}
              </p>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">الوعاء</span>
                <b className="tabular-nums text-primary">{fmt(r.zakatBase)}</b>
              </div>
              <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                {r.steps.map((s, i) => (
                  <li key={i} className="flex justify-between">
                    <span>
                      {s.sign} {ZAKAT_CATEGORIES[s.label as ZakatCategory]?.labelAr ?? s.label}
                    </span>
                    <span className="tabular-nums">{fmt(s.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Alert
          className={
            check.matched
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-destructive/30 bg-destructive/5"
          }
        >
          <AlertDescription className="text-xs leading-relaxed">
            {check.note}{" "}
            <Badge variant="outline" className="text-[10px]">
              الفارق {fmt(check.difference)} · {(check.ratio * 100).toFixed(2)}%
            </Badge>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default MethodologyCrossCheckCard;
