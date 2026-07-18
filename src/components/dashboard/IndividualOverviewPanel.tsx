import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  Wallet,
  Calendar,
  History,
  TrendingUp,
  Loader2,
  ArrowLeft,
  FileCheck2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HawlReminderCard } from "@/components/zakat/HawlReminderCard";

interface Row {
  hijri_year: string | null;
  gregorian_date: string;
  currency: string;
  zakat_base: number;
  zakat_due: number;
  net_due: number;
}

function fmt(n: number, ccy: string) {
  try {
    return new Intl.NumberFormat("ar", {
      style: "currency",
      currency: ccy || "SAR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${Math.round(n).toLocaleString("ar")} ${ccy}`;
  }
}

export function IndividualOverviewPanel() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("zakat_records")
        .select("hijri_year, gregorian_date, currency, zakat_base, zakat_due, net_due")
        .order("gregorian_date", { ascending: true });
      setRows(((data ?? []) as Row[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const currency = rows[rows.length - 1]?.currency || "SAR";
  const totalZakat = rows.reduce((s, r) => s + Number(r.net_due || r.zakat_due || 0), 0);
  const yearsCount = new Set(rows.map((r) => r.hijri_year || r.gregorian_date.slice(0, 4))).size;
  const last = rows[rows.length - 1];
  const lastYear = last?.hijri_year ? parseInt(last.hijri_year, 10) : null;
  const nextHawl = lastYear && !Number.isNaN(lastYear) ? String(lastYear + 1) : "—";
  const avgBase = rows.length ? rows.reduce((s, r) => s + Number(r.zakat_base || 0), 0) / rows.length : 0;

  const empty = rows.length === 0;

  return (
    <Card className="mb-4 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            نظرة عامة على زكاتك
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link to="/history">
                السجل الكامل <ArrowLeft className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            لا توجد حسابات محفوظة بعد — أكمل الحاسبة أدناه وسيظهر ملخّصك السنوي هنا.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi
              icon={<Wallet className="h-4 w-4" />}
              label="إجمالي الزكاة عبر السنين"
              value={fmt(totalZakat, currency)}
            />
            <Kpi
              icon={<History className="h-4 w-4" />}
              label="عدد السنوات المسجّلة"
              value={`${yearsCount}`}
              hint={last ? `آخر تحديث: ${new Date(last.gregorian_date).toLocaleDateString("ar")}` : undefined}
            />
            <Kpi
              icon={<Calendar className="h-4 w-4" />}
              label="حَولك القادم (هجري)"
              value={nextHawl}
              hint={lastYear ? `آخر حَول: ${lastYear}هـ` : undefined}
            />
            <Kpi
              icon={<FileCheck2 className="h-4 w-4" />}
              label="متوسّط الوعاء الزكوي"
              value={fmt(avgBase, currency)}
            />
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[11px]">
            العملة الحالية: {currency}
          </Badge>
          <Badge variant="secondary" className="text-[11px]">
            وضع الفرد — واجهة مبسّطة
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
