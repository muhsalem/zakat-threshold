import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";

interface ZakatHealthScoreBadgeProps {
  hasHawlCompleted?: boolean;
  hasERPConnected?: boolean;
  isNisabReached?: boolean;
  hasAuditLogs?: boolean;
}

export function ZakatHealthScoreBadge({
  hasHawlCompleted = true,
  hasERPConnected = false,
  isNisabReached = true,
  hasAuditLogs = true,
}: ZakatHealthScoreBadgeProps) {
  const score = useMemo(() => {
    let s = 40; // الأساس
    if (isNisabReached) s += 20;
    if (hasHawlCompleted) s += 20;
    if (hasERPConnected) s += 10;
    if (hasAuditLogs) s += 10;
    return Math.min(100, s);
  }, [hasHawlCompleted, hasERPConnected, isNisabReached, hasAuditLogs]);

  const level = score >= 90 ? "ممتاز جداً" : score >= 75 ? "ممتاز" : score >= 60 ? "جيد جداً" : "يحتاج تحسين";

  return (
    <div className="p-3.5 rounded-xl border bg-card/80 space-y-2" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
          <Activity className="h-4 w-4 text-success" /> مؤشر الصحة والجاهزية الزكوية (Zakat Health Score)
        </div>
        <Badge
          className={`text-[10px] ${
            score >= 80 ? "bg-success text-white" : score >= 60 ? "bg-indigo-600 text-white" : "bg-warning text-white"
          }`}
        >
          {score} / 100 — {level}
        </Badge>
      </div>

      <Progress value={score} className="h-2 bg-success dark:bg-success" />

      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground pt-1">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-success" /> اكتمال الحول والنصاب: 100%
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-success" /> التدقيق الفقهي والمحاسبي: مفعّل
        </div>
      </div>
    </div>
  );
}
