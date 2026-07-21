/**
 * لوحة تحليلات المنتج — المقياس النجم الشمالي والقمع الوظيفي.
 * يسدّ فجوة تدقيق: «لا تحليلات منتج ولا North Star Metric».
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  TrendingUp,
  Rocket,
  Calculator,
  CheckCircle2,
  FileDown,
  Award,
} from "lucide-react";
import { getFunnelStats, type FunnelStats } from "@/lib/analyticsQueries.functions";

const STEPS: Array<{ key: keyof FunnelStats["counts"]; label: string; icon: typeof Rocket }> = [
  { key: "landing_view", label: "زيارة الصفحة الرئيسية", icon: Rocket },
  { key: "calculator_started", label: "بدء استخدام حاسبة", icon: Calculator },
  { key: "report_exported", label: "تصدير تقرير", icon: FileDown },
  { key: "certified_report_requested", label: "طلب تقرير معتمد", icon: Award },
];

export function ProductFunnelPanel() {
  const fetchStats = useServerFn(getFunnelStats);
  const [stats, setStats] = useState<FunnelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats({ data: { windowDays: 30 } })
      .then((s) => setStats(s))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [fetchStats]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحميل تحليلات المنتج...
        </CardContent>
      </Card>
    );
  }
  if (!stats) return null;

  const max = Math.max(1, stats.counts.landing_view);

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          تحليلات المنتج — آخر {stats.windowDays} يوماً
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              المقياس النجم الشمالي (North Star)
            </div>
            <div className="text-sm font-semibold">تقارير الزكاة المعتمدة المطلوبة شهرياً</div>
          </div>
          <div className="text-3xl font-bold text-primary tabular-nums">{stats.northStar}</div>
        </div>

        <div className="space-y-2">
          {STEPS.map((s, i) => {
            const value = stats.counts[s.key];
            const pct = Math.round((value / max) * 100);
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>{s.label}</span>
                    <span className="tabular-nums font-semibold">{value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {i === STEPS.length - 1 && (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" /> النجم الشمالي
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          تحليلات من الطرف الأول (بلا أداة خارجية) — لا تُسجَّل أي مبالغ أو بيانات شخصية، فقط أحداث
          القمع الوظيفي.
        </p>
      </CardContent>
    </Card>
  );
}
