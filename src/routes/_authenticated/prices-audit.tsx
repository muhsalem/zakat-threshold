import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, AlertTriangle, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type AuditRow = {
  id: string;
  run_at: string;
  job_name: string;
  status: "success" | "partial" | "error";
  primary_source: string | null;
  fallback_source: string | null;
  fallback_used: boolean;
  currencies_requested: string[] | null;
  currencies_missing: string[] | null;
  records_written: number | null;
  duration_ms: number | null;
  http_status: number | null;
  error_message: string | null;
  metadata: Record<string, any> | null;
};

const JOB_LABEL: Record<string, string> = {
  "snapshot-daily-prices": "أسعار المعادن اليومية",
  "snapshot-daily-nisab": "نصاب الدول اليومي",
  "daily-metal-prices-snapshot": "لقطة أسعار (قديم)",
};

const STATUS_META: Record<string, { label: string; className: string; icon: any }> = {
  success: {
    label: "نجاح",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    icon: CheckCircle2,
  },
  partial: {
    label: "جزئي",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    icon: AlertTriangle,
  },
  error: {
    label: "خطأ",
    className: "bg-red-500/10 text-red-600 border-red-500/30",
    icon: AlertCircle,
  },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export const Route = createFileRoute("/_authenticated/prices-audit")({
  head: () => ({
    meta: [
      { title: "سجل تدقيق سحب الأسعار — Zaka" },
      {
        name: "description",
        content:
          "سجل تدقيق لكل محاولات سحب أسعار المعادن ونصاب الدول اليومي مع المصدر المستخدم وأي حالات fallback أو أخطاء شبكة.",
      },
    ],
  }),
  component: PricesAuditPage,
});

function PricesAuditPage() {
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["price-fetch-audit", jobFilter, statusFilter],
    queryFn: async (): Promise<AuditRow[]> => {
      let q = (supabase.from("price_fetch_audit" as any) as any)
        .select("*")
        .order("run_at", { ascending: false })
        .limit(200);
      if (jobFilter !== "all") q = q.eq("job_name", jobFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const rows = data ?? [];
  const counts = {
    total: rows.length,
    success: rows.filter((r) => r.status === "success").length,
    partial: rows.filter((r) => r.status === "partial").length,
    error: rows.filter((r) => r.status === "error").length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">سجل تدقيق سحب الأسعار</h1>
          <p className="text-sm text-muted-foreground mt-1">
            كل محاولة سحب أسعار المعادن ونِصاب الدول اليومي، مع المصدر المستخدم و أي احتياط
            (fallback) أو خطأ شبكة.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ml-2 ${isFetching ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي المحاولات" value={counts.total} />
        <StatCard label="نجاح" value={counts.success} tone="emerald" />
        <StatCard label="جزئي" value={counts.partial} tone="amber" />
        <StatCard label="خطأ" value={counts.error} tone="red" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="w-56">
          <label className="text-xs text-muted-foreground mb-1 block">المهمة</label>
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المهام</SelectItem>
              <SelectItem value="snapshot-daily-prices">أسعار المعادن اليومية</SelectItem>
              <SelectItem value="snapshot-daily-nisab">نصاب الدول اليومي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <label className="text-xs text-muted-foreground mb-1 block">الحالة</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="success">نجاح</SelectItem>
              <SelectItem value="partial">جزئي</SelectItem>
              <SelectItem value="error">خطأ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">آخر 200 محاولة</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">جارٍ التحميل…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">لا توجد سجلات مطابقة للفلاتر.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs">
                  <tr>
                    <th className="text-right p-3">الوقت</th>
                    <th className="text-right p-3">المهمة</th>
                    <th className="text-right p-3">الحالة</th>
                    <th className="text-right p-3">المصدر</th>
                    <th className="text-right p-3">Fallback</th>
                    <th className="text-right p-3">عملات مفقودة</th>
                    <th className="text-right p-3">صفوف</th>
                    <th className="text-right p-3">المدة</th>
                    <th className="text-right p-3">تفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const meta = STATUS_META[r.status] ?? STATUS_META.error;
                    const Icon = meta.icon;
                    return (
                      <tr key={r.id} className="border-t align-top">
                        <td className="p-3 whitespace-nowrap text-xs">{formatDate(r.run_at)}</td>
                        <td className="p-3 text-xs">{JOB_LABEL[r.job_name] ?? r.job_name}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs" dir="ltr">
                          {r.primary_source ?? "—"}
                        </td>
                        <td className="p-3 text-xs" dir="ltr">
                          {r.fallback_used ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-700 border-amber-500/30"
                            >
                              {r.fallback_source ?? "used"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">لا</span>
                          )}
                        </td>
                        <td className="p-3 text-xs" dir="ltr">
                          {r.currencies_missing?.length ? r.currencies_missing.join(", ") : "—"}
                        </td>
                        <td className="p-3 text-xs text-center">{r.records_written ?? 0}</td>
                        <td className="p-3 text-xs" dir="ltr">
                          {r.duration_ms != null ? `${r.duration_ms}ms` : "—"}
                        </td>
                        <td className="p-3 text-xs max-w-xs">
                          {r.error_message ? (
                            <span className="text-red-600 break-words">{r.error_message}</span>
                          ) : r.metadata ? (
                            <details>
                              <summary className="cursor-pointer text-muted-foreground">
                                عرض
                              </summary>
                              <pre
                                dir="ltr"
                                className="mt-1 text-[10px] bg-muted p-2 rounded overflow-x-auto"
                              >
                                {JSON.stringify(r.metadata, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "amber" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "red"
          ? "text-red-600"
          : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
