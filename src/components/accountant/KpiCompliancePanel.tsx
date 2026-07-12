import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileWarning,
  Loader2,
  ShieldCheck,
  XCircle,
  Gauge,
  Wand2,
  Download,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ZAKAT_RATE, fmt } from "@/lib/zakat";
import { KpiCorrectionDialog, type IssueCode, type CorrectionRecord } from "./KpiCorrectionDialog";
import { exportKpiExcel, exportKpiPdf, type ExportRow } from "./kpiExport";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Record = {
  id: string;
  record_type: string;
  hijri_year: string | null;
  gregorian_date: string | null;
  currency: string;
  total_assets: number;
  total_liabilities: number;
  zakat_base: number;
  zakat_due: number;
  net_due: number;
  created_at: string;
  updated_at: string;
  approval_status?: "pending" | "approved" | "rejected" | null;
  submitted_at?: string | null;
  decided_at?: string | null;
};

type IssueLevel = "error" | "warning";
type Issue = { code: string; label: string; level: IssueLevel };

const STALE_DRAFT_DAYS = 30;

function detectIssues(r: Record): Issue[] {
  const out: Issue[] = [];
  const status = r.approval_status ?? "draft";

  if (!r.hijri_year) {
    out.push({ code: "no_hijri", label: "سنة هجرية مفقودة", level: "warning" });
  }
  if (r.total_liabilities > r.total_assets && r.total_assets > 0) {
    out.push({ code: "neg_equity", label: "الخصوم تتجاوز الأصول", level: "warning" });
  }
  if (r.net_due < 0) {
    out.push({ code: "neg_net", label: "صافي مستحق سالب", level: "error" });
  }
  if (r.zakat_base > 0 && r.zakat_due <= 0) {
    out.push({ code: "no_zakat_on_base", label: "وعاء موجب بدون زكاة", level: "error" });
  }
  if (r.zakat_base > 0 && r.zakat_due > 0) {
    const expected = r.zakat_base * ZAKAT_RATE;
    const drift = Math.abs(r.zakat_due - expected) / Math.max(1, expected);
    if (drift > 0.1) {
      out.push({ code: "rate_mismatch", label: "الزكاة لا تطابق 2.5% من الوعاء", level: "error" });
    }
  }
  if (r.zakat_base <= 0 && r.total_assets > 0) {
    out.push({ code: "no_base", label: "وعاء زكوي غير محسوب", level: "warning" });
  }
  if (status === "draft") {
    const ageDays = (Date.now() - new Date(r.updated_at).getTime()) / 86_400_000;
    if (ageDays > STALE_DRAFT_DAYS) {
      out.push({
        code: "stale_draft",
        label: `مسودّة راكدة > ${STALE_DRAFT_DAYS} يوم`,
        level: "warning",
      });
    }
  }
  if (status === "rejected") {
    out.push({ code: "rejected", label: "اعتماد مرفوض يحتاج مراجعة", level: "error" });
  }
  return out;
}

function complianceLevel(issues: Issue[]): "ok" | "warn" | "err" {
  if (issues.some((i) => i.level === "error")) return "err";
  if (issues.length > 0) return "warn";
  return "ok";
}

export function KpiCompliancePanel() {
  const [rows, setRows] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [fixTarget, setFixTarget] = useState<{ record: CorrectionRecord; codes: IssueCode[] } | null>(null);
  const [period, setPeriod] = useState<"all" | "30d" | "90d" | "year">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [recRes, apprRes] = await Promise.all([
        supabase
          .from("zakat_records")
          .select(
            "id,record_type,hijri_year,gregorian_date,currency,total_assets,total_liabilities,zakat_base,zakat_due,net_due,created_at,updated_at",
          )
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("zakat_approvals")
          .select("zakat_record_id,status,submitted_at,decided_at")
          .not("zakat_record_id", "is", null),
      ]);
      if (cancelled) return;
      if (recRes.error) {
        setErr(recRes.error.message);
        setLoading(false);
        return;
      }
      const apprMap = new Map<
        string,
        { status: "pending" | "approved" | "rejected"; submitted_at: string | null; decided_at: string | null }
      >();
      for (const a of (apprRes.data ?? []) as any[]) {
        if (a.zakat_record_id)
          apprMap.set(a.zakat_record_id, {
            status: a.status,
            submitted_at: a.submitted_at,
            decided_at: a.decided_at,
          });
      }
      setRows(
        ((recRes.data ?? []) as any[]).map((r) => {
          const a = apprMap.get(r.id);
          return {
            ...r,
            total_assets: Number(r.total_assets) || 0,
            total_liabilities: Number(r.total_liabilities) || 0,
            zakat_base: Number(r.zakat_base) || 0,
            zakat_due: Number(r.zakat_due) || 0,
            net_due: Number(r.net_due) || 0,
            approval_status: a?.status ?? null,
            submitted_at: a?.submitted_at ?? null,
            decided_at: a?.decided_at ?? null,
          } as Record;
        }),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filteredRows = useMemo(() => {
    if (period === "all") return rows;
    const now = Date.now();
    let cutoff = 0;
    if (period === "30d") cutoff = now - 30 * 86_400_000;
    else if (period === "90d") cutoff = now - 90 * 86_400_000;
    else if (period === "year") cutoff = new Date(new Date().getFullYear(), 0, 1).getTime();
    return rows.filter((r) => new Date(r.created_at).getTime() >= cutoff);
  }, [rows, period]);

  const enriched = useMemo(
    () => filteredRows.map((r) => ({ r, issues: detectIssues(r), level: complianceLevel(detectIssues(r)) })),
    [filteredRows],
  );

  const stats = useMemo(() => {
    const total = filteredRows.length;
    const byStatus = { draft: 0, pending: 0, approved: 0, rejected: 0 };
    for (const r of filteredRows) byStatus[(r.approval_status ?? "draft") as keyof typeof byStatus]++;
    const compliance = { ok: 0, warn: 0, err: 0 };
    for (const e of enriched) compliance[e.level]++;
    const approvalRate = total ? Math.round((byStatus.approved / total) * 100) : 0;
    const complianceRate = total ? Math.round((compliance.ok / total) * 100) : 0;

    // متوسط زمن الاعتماد بالساعات
    const decided = filteredRows.filter(
      (r) => r.approval_status === "approved" && r.submitted_at && r.decided_at,
    );
    const avgApprovalH =
      decided.length === 0
        ? 0
        : Math.round(
            decided.reduce(
              (s, r) =>
                s +
                (new Date(r.decided_at!).getTime() - new Date(r.submitted_at!).getTime()) / 3_600_000,
              0,
            ) / decided.length,
          );

    // ترتيب الأخطاء الأكثر شيوعًا
    const errorCounts = new Map<string, { label: string; level: IssueLevel; count: number }>();
    for (const e of enriched) {
      for (const i of e.issues) {
        const cur = errorCounts.get(i.code);
        if (cur) cur.count++;
        else errorCounts.set(i.code, { label: i.label, level: i.level, count: 1 });
      }
    }
    const topErrors = Array.from(errorCounts.entries())
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return { total, byStatus, compliance, approvalRate, complianceRate, avgApprovalH, topErrors };
  }, [filteredRows, enriched]);

  const attentionRows = useMemo(
    () =>
      enriched
        .filter((e) => e.level !== "ok")
        .sort((a, b) => (a.level === "err" ? -1 : 1) - (b.level === "err" ? -1 : 1))
        .slice(0, 12),
    [enriched],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin ml-2" /> جارٍ تحميل مؤشرات الأداء…
      </div>
    );
  }
  if (err) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{err}</AlertDescription>
      </Alert>
    );
  }
  if (stats.total === 0) {
    return (
      <Alert>
        <AlertDescription>لا توجد إقرارات بعد لعرض مؤشرات الأداء.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      {/* بطاقات KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Activity className="h-4 w-4" />}
          label="إجمالي الإقرارات"
          value={String(stats.total)}
          hint={`آخر ${stats.total} سجل`}
        />
        <KpiCard
          icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
          label="نسبة الامتثال"
          value={`${stats.complianceRate}%`}
          progress={stats.complianceRate}
          hint={`${stats.compliance.ok} سليم / ${stats.compliance.warn} تحذير / ${stats.compliance.err} خطأ`}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
          label="نسبة الاعتماد"
          value={`${stats.approvalRate}%`}
          progress={stats.approvalRate}
          hint={`${stats.byStatus.approved} معتمد / ${stats.byStatus.pending} قيد المراجعة`}
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="متوسط زمن الاعتماد"
          value={stats.avgApprovalH > 0 ? `${stats.avgApprovalH}h` : "—"}
          hint="من الإرسال حتى القرار"
        />
      </div>

      {/* شريط التقدّم عبر الحالات */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" /> توزيع حالات الإقرارات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusBar
            total={stats.total}
            approved={stats.byStatus.approved}
            pending={stats.byStatus.pending}
            rejected={stats.byStatus.rejected}
            draft={stats.byStatus.draft}
          />
          <div className="flex flex-wrap gap-2 text-xs">
            <Legend color="bg-emerald-500" label={`معتمد (${stats.byStatus.approved})`} />
            <Legend color="bg-amber-500" label={`قيد المراجعة (${stats.byStatus.pending})`} />
            <Legend color="bg-red-500" label={`مرفوض (${stats.byStatus.rejected})`} />
            <Legend color="bg-slate-400" label={`مسودة (${stats.byStatus.draft})`} />
          </div>
        </CardContent>
      </Card>

      {/* الأخطاء الشائعة */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-amber-600" /> الأخطاء الشائعة عبر الإقرارات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> لا توجد أخطاء متكررة — كل السجلات
              ضمن معايير الامتثال.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {stats.topErrors.map((e) => {
                const pct = Math.round((e.count / stats.total) * 100);
                return (
                  <li
                    key={e.code}
                    className="flex items-center justify-between gap-3 rounded-md border p-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {e.level === "error" ? (
                        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      )}
                      <span className="text-sm truncate">{e.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        {e.count} · {pct}%
                      </span>
                      <Badge variant={e.level === "error" ? "destructive" : "secondary"}>
                        {e.level === "error" ? "خطأ" : "تحذير"}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* جدول الحالات التي تحتاج انتباه */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> حالات تحتاج انتباه
            <span className="text-xs font-normal text-muted-foreground">
              (أعلى 12 سجلاً بحاجة إلى مراجعة)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attentionRows.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> جميع الإقرارات ضمن الامتثال.
            </p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>السنة</TableHead>
                    <TableHead className="text-end">الزكاة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الملاحظات</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attentionRows.map(({ r, issues, level }) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.record_type === "individual" ? "فرد" : "شركة"}
                      </TableCell>
                      <TableCell className="text-xs">{r.hijri_year || "—"}</TableCell>
                      <TableCell className="text-end font-medium" dir="ltr">
                        {fmt(r.zakat_due)} {r.currency}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            level === "err"
                              ? "destructive"
                              : level === "warn"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {level === "err" ? "خطأ" : level === "warn" ? "تحذير" : "سليم"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap gap-1">
                          {issues.slice(0, 3).map((i) => (
                            <span
                              key={i.code}
                              className="inline-block rounded bg-muted px-1.5 py-0.5"
                            >
                              {i.label}
                            </span>
                          ))}
                          {issues.length > 3 && (
                            <span className="text-muted-foreground">
                              +{issues.length - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button asChild size="sm" variant="outline" className="gap-1">
                            <Link to="/certified-report/$recordId" params={{ recordId: r.id }}>
                              <ExternalLink className="h-3.5 w-3.5" /> فتح
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1"
                            onClick={() =>
                              setFixTarget({
                                record: {
                                  id: r.id,
                                  record_type: r.record_type,
                                  hijri_year: r.hijri_year,
                                  gregorian_date: r.gregorian_date,
                                  currency: r.currency,
                                  total_assets: r.total_assets,
                                  total_liabilities: r.total_liabilities,
                                  zakat_base: r.zakat_base,
                                  zakat_due: r.zakat_due,
                                  net_due: r.net_due,
                                  updated_at: r.updated_at,
                                },
                                codes: issues.map((i) => i.code as IssueCode),
                              })
                            }
                          >
                            <Wand2 className="h-3.5 w-3.5" /> تصحيح
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <KpiCorrectionDialog
        open={!!fixTarget}
        onOpenChange={(v) => !v && setFixTarget(null)}
        record={fixTarget?.record ?? null}
        issueCodes={fixTarget?.codes ?? []}
        onApplied={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  progress?: number;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon} {label}
        </div>
        <div className="text-2xl font-bold" dir="ltr">
          {value}
        </div>
        {typeof progress === "number" && <Progress value={progress} className="h-1.5" />}
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBar({
  total,
  approved,
  pending,
  rejected,
  draft,
}: {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  draft: number;
}) {
  if (total === 0) return null;
  const pct = (n: number) => (n / total) * 100;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
      <div className="bg-emerald-500" style={{ width: `${pct(approved)}%` }} />
      <div className="bg-amber-500" style={{ width: `${pct(pending)}%` }} />
      <div className="bg-red-500" style={{ width: `${pct(rejected)}%` }} />
      <div className="bg-slate-400" style={{ width: `${pct(draft)}%` }} />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${color}`} />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
