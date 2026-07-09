import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/zakat";
import { BarChart3, TrendingUp, Coins, Calendar } from "lucide-react";

interface Row {
  gregorian_date: string;
  currency: string;
  zakat_base: number;
  zakat_due: number;
  hijri_year: string | null;
}

export default function ZakatStatsDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("zakat_records")
        .select("gregorian_date, currency, zakat_base, zakat_due, hijri_year")
        .order("gregorian_date", { ascending: false })
        .limit(60);
      if (mounted) {
        setRows((data as Row[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null;
  if (!rows.length) {
    return (
      <Card className="mt-4">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          لا يوجد سجل زكوي محفوظ بعد. احفظ حسابك السنوي ليظهر هنا تحليل متعدد السنوات.
        </CardContent>
      </Card>
    );
  }

  const byCurrency = rows.reduce((acc: Record<string, Row[]>, r) => {
    (acc[r.currency] ||= []).push(r);
    return acc;
  }, {});

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          لوحة إحصاءات الزكاة عبر السنوات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(byCurrency).map(([cur, list]) => {
          const totalDue = list.reduce((s, r) => s + Number(r.zakat_due || 0), 0);
          const totalBase = list.reduce((s, r) => s + Number(r.zakat_base || 0), 0);
          const avg = totalDue / list.length;
          const latest = list[0];
          const prior = list[1];
          const growth = prior
            ? ((Number(latest.zakat_base) - Number(prior.zakat_base)) /
                Math.max(1, Number(prior.zakat_base))) *
              100
            : 0;

          return (
            <div key={cur} className="rounded-lg border p-4 space-y-3">
              <div className="font-semibold">العملة: {cur}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Stat icon={<Calendar />} label="عدد السنوات" value={String(list.length)} />
                <Stat icon={<Coins />} label="إجمالي الزكاة" value={`${fmt(totalDue)}`} />
                <Stat icon={<BarChart3 />} label="متوسط/سنة" value={`${fmt(avg)}`} />
                <Stat
                  icon={<TrendingUp />}
                  label="نمو الوعاء"
                  value={`${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}
                  className={growth >= 0 ? "text-emerald-600" : "text-destructive"}
                />
              </div>
              <div className="text-xs space-y-1 pt-2 border-t">
                {list.slice(0, 6).map((r, i) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span>
                      {r.gregorian_date} {r.hijri_year ? `(${r.hijri_year})` : ""}
                    </span>
                    <span className="font-mono">
                      {fmt(Number(r.zakat_due))} {cur}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded bg-muted/40 p-3">
      <div className="flex items-center gap-1 text-muted-foreground text-xs">
        <span className="[&_svg]:h-3 [&_svg]:w-3">{icon}</span>
        {label}
      </div>
      <div className={`font-bold ${className ?? ""}`}>{value}</div>
    </div>
  );
}
