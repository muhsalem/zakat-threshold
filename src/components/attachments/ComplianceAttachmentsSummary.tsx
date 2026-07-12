import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertCircle, Paperclip, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORY_LABEL_AR,
  computeCoverage,
  type CoverageRow,
} from "@/lib/attachmentRequirements";
import type { AttachmentCategory } from "@/components/attachments/ApprovalAttachments";

interface AttachmentLite {
  id: string;
  file_name: string;
  category: AttachmentCategory;
  label: string | null;
  status: string | null;
}

interface Props {
  recordType: string | null | undefined;
  zakatRecordId?: string;
  approvalId?: string;
  /** Optional pre-loaded rows to skip the internal fetch. */
  attachments?: AttachmentLite[];
  /** Human-readable calc summary to link results with attachments. */
  calcSummary?: { label: string; value: string }[];
}

export default function ComplianceAttachmentsSummary({
  recordType,
  zakatRecordId,
  approvalId,
  attachments: initial,
  calcSummary,
}: Props) {
  const [rows, setRows] = useState<AttachmentLite[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    if (initial) {
      setRows(initial);
      return;
    }
    if (!zakatRecordId && !approvalId) return;
    let alive = true;
    setLoading(true);
    let q = supabase
      .from("approval_attachments")
      .select("id, file_name, category, label, status");
    q = zakatRecordId
      ? q.eq("zakat_record_id", zakatRecordId)
      : q.eq("approval_id", approvalId!);
    q.then(({ data }) => {
      if (!alive) return;
      setRows((data ?? []) as AttachmentLite[]);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [initial, zakatRecordId, approvalId]);

  const coverage = useMemo(() => computeCoverage(recordType, rows), [recordType, rows]);

  const attachmentsByCategory = useMemo(() => {
    const m: Record<string, AttachmentLite[]> = {};
    for (const a of rows) (m[a.category] ??= []).push(a);
    return m;
  }, [rows]);

  const overallStatus =
    coverage.missingRequired > 0
      ? { color: "text-destructive", label: "غير مكتمل — مستندات إلزامية ناقصة" }
      : coverage.score === 100
        ? { color: "text-emerald-600", label: "مكتمل الامتثال" }
        : { color: "text-amber-600", label: "مقبول — يوجد مستندات موصى بها ناقصة" };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-primary" /> ملخص امتثال المرفقات
          <Badge variant="secondary" className="ms-auto">
            {coverage.score}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className={`text-sm font-medium ${overallStatus.color}`}>
            {overallStatus.label}
          </div>
          <Progress value={coverage.score} className="mt-2 h-2" />
          <div className="text-[11px] text-muted-foreground mt-1">
            {coverage.total - coverage.rows.filter((r) => r.status !== "covered").length} من{" "}
            {coverage.total} مستندات مكتملة
            {coverage.missingRequired > 0 &&
              ` — ${coverage.missingRequired} مستند إلزامي مفقود`}
          </div>
        </div>

        {calcSummary && calcSummary.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-2 text-[11px] grid grid-cols-2 md:grid-cols-4 gap-1.5">
            {calcSummary.map((c) => (
              <div key={c.label}>
                <div className="text-muted-foreground">{c.label}</div>
                <div className="font-medium tabular-nums">{c.value}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
            <Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحميل المرفقات…
          </div>
        ) : (
          <ul className="space-y-2">
            {coverage.rows.map((r) => (
              <CoverageItem
                key={r.category}
                row={r}
                items={attachmentsByCategory[r.category] ?? []}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CoverageItem({ row, items }: { row: CoverageRow; items: AttachmentLite[] }) {
  const icon =
    row.status === "covered" ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
    ) : row.status === "missing_required" ? (
      <XCircle className="w-4 h-4 text-destructive" />
    ) : (
      <AlertCircle className="w-4 h-4 text-amber-600" />
    );

  return (
    <li className="rounded-md border p-2.5">
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-sm font-medium">{CATEGORY_LABEL_AR[row.category]}</div>
        <Badge
          variant={row.required ? "destructive" : "outline"}
          className="text-[10px] ms-auto"
        >
          {row.required ? "إلزامي" : "موصى به"}
        </Badge>
        {row.count > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {row.count} ملف
          </Badge>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">{row.reason}</p>
      {items.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {items.map((a) => (
            <li key={a.id} className="text-[11px] flex items-center gap-1.5 truncate">
              <span className="text-primary">•</span>
              <span className="truncate">{a.file_name}</span>
              {a.label && (
                <span className="text-muted-foreground truncate">— {a.label}</span>
              )}
              {a.status && a.status !== "approved" && (
                <Badge variant="outline" className="text-[9px]">
                  {a.status === "pending"
                    ? "قيد المراجعة"
                    : a.status === "rejected"
                      ? "مرفوض"
                      : "مسودة"}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
