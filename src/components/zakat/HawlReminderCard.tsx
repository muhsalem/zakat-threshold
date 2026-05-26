import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarClock, BellRing, CheckCircle2 } from "lucide-react";
import { HAWL_DAYS_HIJRI } from "@/lib/zakat";

/**
 * Visual Hawl reminder: shows days until next Hawl based on the last record date.
 * Hijri year ≈ 354.367 days. We use HAWL_DAYS_HIJRI for consistency.
 */
export function HawlReminderCard({ lastDate }: { lastDate: string | null }) {
  const info = useMemo(() => {
    if (!lastDate) return null;
    const last = new Date(lastDate);
    const next = new Date(last);
    next.setDate(next.getDate() + HAWL_DAYS_HIJRI);
    const now = new Date();
    const msInDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.ceil((next.getTime() - now.getTime()) / msInDay);
    const overdue = daysRemaining < 0;
    const due = daysRemaining <= 0;
    return { next, daysRemaining, overdue, due };
  }, [lastDate]);

  if (!info) return null;

  return (
    <Card className="shadow-soft border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" /> تذكير الحول القادم
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs text-muted-foreground">تاريخ الحول القادم</div>
            <div className="text-lg font-bold">{info.next.toLocaleDateString("ar")}</div>
          </div>
          <Badge
            variant={info.overdue ? "destructive" : info.due ? "default" : "secondary"}
            className="text-sm py-1.5 px-3"
          >
            {info.overdue
              ? `متأخر بـ ${Math.abs(info.daysRemaining)} يوم`
              : info.due
              ? "حلّ موعد الزكاة"
              : `بعد ${info.daysRemaining} يوم`}
          </Badge>
        </div>

        {info.due ? (
          <Alert className="border-primary/30 bg-primary/5">
            <BellRing className="h-4 w-4" />
            <AlertDescription className="text-xs leading-relaxed">
              {info.overdue
                ? "حال عليك الحول وتأخّر إخراج الزكاة. سارع بإخراجها فإنّها واجبة فوراً عند تمام الحول."
                : "حلّ موعد إخراج الزكاة. احسب أموالك اليوم وأخرج زكاتها."}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-muted">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-xs leading-relaxed">
              لم يحُل الحول بعد. التذكير محسوب وفق السنة الهجرية ({HAWL_DAYS_HIJRI} يوماً) من تاريخ آخر سجل لك.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
