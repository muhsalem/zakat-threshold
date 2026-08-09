import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import {
  buildExceptionsQueue,
  EXCEPTION_REASON_LABELS,
  type ExceptionSeverity,
} from "@/lib/erp/exceptionsQueue";
import { ZAKAT_CATEGORIES, type ClassifiedRow } from "@/lib/erp/zakatMapping";

const SEVERITY_STYLE: Record<ExceptionSeverity, { label: string; className: string }> = {
  blocking: { label: "حاجب للاعتماد", className: "bg-destructive/10 text-destructive border-destructive/30" },
  warning: { label: "تنبيه", className: "bg-warning/10 text-warning border-warning/30" },
  info: { label: "معلومة", className: "bg-muted text-muted-foreground" },
};

const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });

export interface ExceptionsQueuePanelProps {
  rows: ClassifiedRow[];
  onCanApproveChange?: (canApprove: boolean) => void;
}

export function ExceptionsQueuePanel({ rows }: ExceptionsQueuePanelProps) {
  const result = useMemo(() => buildExceptionsQueue(rows), [rows]);

  return (
    <Card className="border-primary/20 shadow-soft" dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-primary" />
          طابور الاستثناءات الإلزامي
          <Badge variant="outline" className="text-[10px]">
            {result.items.length} بند
          </Badge>
          {result.blockingCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {result.blockingCount} حاجب
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.canApprove ? (
          <Alert className="border-success/30 bg-success/5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription className="text-xs">
              لا توجد استثناءات حاجبة — يجوز عرض الحساب على الاعتماد.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertDescription className="text-xs leading-relaxed">
              الاعتماد ممنوع حتى يُبتّ في {result.blockingCount} بندًا حاجبًا. المبلغ المتأثر:{" "}
              <b className="tabular-nums">{fmt(result.affectedAmount)}</b>.
            </AlertDescription>
          </Alert>
        )}

        {result.items.length > 0 && (
          <ul className="space-y-2">
            {result.items.map((item, i) => {
              const s = SEVERITY_STYLE[item.severity];
              return (
                <li
                  key={`${item.code}-${item.reason}-${i}`}
                  className="rounded-md border p-3 text-xs leading-relaxed"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{item.name}</b>
                    <span className="text-muted-foreground">#{item.code}</span>
                    <Badge variant="outline" className={`text-[10px] ${s.className}`}>
                      {s.label}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {EXCEPTION_REASON_LABELS[item.reason]}
                    </Badge>
                    <span className="ms-auto tabular-nums">{fmt(item.balance)}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    الفئة الحالية: {ZAKAT_CATEGORIES[item.category].labelAr}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default ExceptionsQueuePanel;
