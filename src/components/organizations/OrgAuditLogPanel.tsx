import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ScrollText,
  Download,
  RefreshCw,
  Search,
  Loader2,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  organization_id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  changed_fields: string[] | null;
  before_state: any;
  after_state: any;
  note: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const ACTION_LABEL: Record<string, string> = {
  insert: "إنشاء",
  update: "تعديل",
  delete: "حذف",
  approve: "اعتماد",
  reject: "رفض",
  reopen: "إعادة فتح",
};

const ACTION_STYLE: Record<string, string> = {
  insert: "bg-blue-100 text-blue-800 border-blue-300",
  update: "bg-amber-100 text-amber-800 border-amber-300",
  delete: "bg-red-100 text-red-800 border-red-300",
  approve: "bg-emerald-100 text-emerald-800 border-emerald-300",
  reject: "bg-rose-100 text-rose-800 border-rose-300",
  reopen: "bg-purple-100 text-purple-800 border-purple-300",
};

const FIELD_LABEL: Record<string, string> = {
  status: "الحالة",
  title: "العنوان",
  snapshot: "بيانات الوعاء",
  checker_id: "المدقّق",
  checker_note: "ملاحظة المدقّق",
  decided_at: "تاريخ القرار",
  fingerprint: "البصمة",
  zakat_record_id: "سجل الزكاة",
  updated_at: "آخر تحديث",
};

export function OrgAuditLogPanel({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<AuditRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("org_audit_log")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data as AuditRow[]) || [];
    setRows(list);
    // جلب أسماء المنفّذين
    const ids = Array.from(new Set(list.map((r) => r.actor_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      (prof || []).forEach((p: any) => (map[p.user_id] = p.display_name || ""));
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (orgId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (qLower) {
        const hay = [
          r.action,
          r.entity_id,
          r.actor_id,
          profiles[r.actor_id || ""],
          r.note,
          JSON.stringify(r.after_state?.title || ""),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [rows, actionFilter, q, profiles]);

  const exportCsv = () => {
    const header = [
      "created_at",
      "action",
      "entity_type",
      "entity_id",
      "actor",
      "changed_fields",
      "note",
      "before",
      "after",
    ];
    const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      lines.push(
        [
          r.created_at,
          ACTION_LABEL[r.action] || r.action,
          r.entity_type,
          r.entity_id || "",
          profiles[r.actor_id || ""] || r.actor_id || "",
          (r.changed_fields || []).join("|"),
          r.note || "",
          JSON.stringify(r.before_state ?? ""),
          JSON.stringify(r.after_state ?? ""),
        ]
          .map((x) => escape(String(x)))
          .join(","),
      );
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `org-audit-${orgId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`تم تصدير ${filtered.length} سجلاً`);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `org-audit-${orgId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-primary" />
            سجل التدقيق الشامل — كل التغييرات على اعتمادات الزكاة ({filtered.length})
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="gap-1">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
            </Button>
            <Button size="sm" variant="outline" onClick={exportJson} className="gap-1">
              <Download className="h-3.5 w-3.5" /> JSON
            </Button>
            <Button size="sm" onClick={exportCsv} className="gap-1">
              <Download className="h-3.5 w-3.5" /> تصدير CSV
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالإجراء / العنوان / المستخدم…"
              className="pe-8 h-9 text-sm"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الإجراءات</SelectItem>
              {Object.entries(ACTION_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Alert>
            <AlertDescription>
              لا توجد أحداث تدقيق مسجّلة بعد لهذه المؤسسة — سيبدأ التتبّع تلقائياً مع أول عملية على
              الاعتمادات.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-start px-2 py-2 font-semibold">التاريخ</th>
                    <th className="text-start px-2 py-2 font-semibold">الإجراء</th>
                    <th className="text-start px-2 py-2 font-semibold">المُنفِّذ</th>
                    <th className="text-start px-2 py-2 font-semibold">العنوان</th>
                    <th className="text-start px-2 py-2 font-semibold">الحقول المتغيّرة</th>
                    <th className="text-start px-2 py-2 font-semibold w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((r) => {
                    const title =
                      r.after_state?.title ||
                      r.before_state?.title ||
                      `#${(r.entity_id || "").slice(0, 8)}`;
                    return (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="px-2 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString("ar-EG")}
                        </td>
                        <td className="px-2 py-2">
                          <Badge variant="outline" className={`text-[10px] ${ACTION_STYLE[r.action] || ""}`}>
                            {ACTION_LABEL[r.action] || r.action}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {profiles[r.actor_id || ""] ||
                            (r.actor_id ? r.actor_id.slice(0, 8) : "—")}
                        </td>
                        <td className="px-2 py-2 text-xs font-medium">{title}</td>
                        <td className="px-2 py-2 text-xs text-muted-foreground">
                          {(r.changed_fields || [])
                            .filter((f) => f !== "updated_at")
                            .map((f) => FIELD_LABEL[f] || f)
                            .join("، ") || "—"}
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setDetail(r)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className={ACTION_STYLE[detail?.action || ""] || ""}>
                {ACTION_LABEL[detail?.action || ""] || detail?.action}
              </Badge>
              تفاصيل الحدث
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <MetaItem label="التاريخ" value={new Date(detail.created_at).toLocaleString("ar-EG")} />
                <MetaItem label="المُنفِّذ" value={profiles[detail.actor_id || ""] || detail.actor_id || "—"} />
                <MetaItem label="نوع الكيان" value={detail.entity_type} />
                <MetaItem label="معرّف الكيان" value={detail.entity_id?.slice(0, 8) || "—"} />
              </div>
              {detail.note && (
                <div>
                  <div className="text-muted-foreground mb-1">ملاحظة:</div>
                  <div className="bg-muted/30 p-2 rounded">{detail.note}</div>
                </div>
              )}
              {detail.changed_fields && detail.changed_fields.length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1">الحقول المتغيّرة:</div>
                  <div className="rounded border divide-y">
                    {detail.changed_fields
                      .filter((f) => f !== "updated_at")
                      .map((f) => (
                        <div key={f} className="p-2">
                          <div className="font-semibold text-[11px] mb-1">
                            {FIELD_LABEL[f] || f}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-[10px] text-muted-foreground">قبل</div>
                              <pre className="bg-red-50 text-red-900 p-1.5 rounded text-[10px] overflow-auto max-h-40">
                                {formatVal(detail.before_state?.[f])}
                              </pre>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground">بعد</div>
                              <pre className="bg-emerald-50 text-emerald-900 p-1.5 rounded text-[10px] overflow-auto max-h-40">
                                {formatVal(detail.after_state?.[f])}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/20 p-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-semibold text-xs mt-0.5 break-all">{value}</div>
    </div>
  );
}

function formatVal(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

export default OrgAuditLogPanel;
