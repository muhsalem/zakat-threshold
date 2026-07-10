import { useEffect, useMemo, useState } from "react";
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
import { Loader2, ShieldCheck, RotateCcw, Database, FileText, RefreshCw } from "lucide-react";

type AuditRow = {
  id: string;
  user_id: string | null;
  action: string;
  fingerprint: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_META: Record<string, { label: string; icon: React.ReactNode; tone: string }> = {
  restore_draft_version: {
    label: "استعادة إصدار مسودة",
    icon: <RotateCcw className="h-3.5 w-3.5" />,
    tone: "text-amber-600",
  },
  snapshot_daily_nisab: {
    label: "لقطة نصاب يومية",
    icon: <Database className="h-3.5 w-3.5" />,
    tone: "text-sky-600",
  },
  snapshot_daily_prices: {
    label: "لقطة أسعار معادن يومية",
    icon: <Database className="h-3.5 w-3.5" />,
    tone: "text-sky-600",
  },
  snapshot_nisab_prices: {
    label: "لقطة أسعار نصاب شهرية",
    icon: <Database className="h-3.5 w-3.5" />,
    tone: "text-sky-600",
  },
  create_zakat_record: {
    label: "إنشاء سجل زكاة",
    icon: <FileText className="h-3.5 w-3.5" />,
    tone: "text-primary",
  },
};

function actionMeta(action: string) {
  return (
    ACTION_META[action] ?? {
      label: action,
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      tone: "text-muted-foreground",
    }
  );
}

const FILTERS = [
  { value: "all", label: "كل الأحداث" },
  { value: "restore_draft_version", label: "استعادة إصدارات" },
  { value: "snapshot_daily_nisab", label: "لقطات النصاب" },
  { value: "snapshot_daily_prices", label: "لقطات الأسعار" },
  { value: "snapshot_nisab_prices", label: "لقطات نصاب شهرية" },
  { value: "system", label: "أحداث النظام فقط" },
  { value: "user", label: "أحداث المستخدمين فقط" },
];

export function SystemAuditPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("sharia_audit_log")
      .select("id,user_id,action,fingerprint,payload,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data as AuditRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "system") return rows.filter((r) => r.user_id === null);
    if (filter === "user") return rows.filter((r) => r.user_id !== null);
    return rows.filter((r) => r.action === filter);
  }, [rows, filter]);

  const kpis = useMemo(() => {
    const restores = rows.filter((r) => r.action === "restore_draft_version").length;
    const snapshots = rows.filter((r) => r.action.startsWith("snapshot_")).length;
    const system = rows.filter((r) => r.user_id === null).length;
    return { total: rows.length, restores, snapshots, system };
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="إجمالي الأحداث" value={kpis.total} tone="text-primary" />
        <Kpi label="استعادات إصدارات" value={kpis.restores} tone="text-amber-600" />
        <Kpi label="لقطات (snapshots)" value={kpis.snapshots} tone="text-sky-600" />
        <Kpi label="أحداث النظام" value={kpis.system} tone="text-emerald-600" />
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> سجل الأحداث الحساسة
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-8 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={load} className="h-8 gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> تحديث
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-right border-b bg-muted/40">
                <tr>
                  <th className="py-2 px-3">التاريخ</th>
                  <th className="py-2 px-3">الحدث</th>
                  <th className="py-2 px-3">المصدر</th>
                  <th className="py-2 px-3">تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      لا توجد أحداث مطابقة.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const meta = actionMeta(r.action);
                    return (
                      <tr key={r.id} className="border-b hover:bg-muted/30 align-top">
                        <td className="py-2 px-3 text-xs whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString("ar-EG")}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center gap-1.5 ${meta.tone}`}>
                            {meta.icon}
                            <span className="text-xs font-medium">{meta.label}</span>
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {r.user_id === null ? (
                            <Badge variant="secondary" className="text-[10px]">نظام</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {r.user_id.slice(0, 8)}…
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-muted-foreground">
                          {r.payload ? (
                            <code className="font-mono break-all">
                              {JSON.stringify(r.payload)}
                            </code>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className={`text-xs ${tone}`}>{label}</div>
        <div className="mt-1 text-xl font-bold">{value.toLocaleString("ar-EG")}</div>
      </CardContent>
    </Card>
  );
}
