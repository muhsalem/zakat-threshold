import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Paperclip,
  Loader2,
  History,
  CheckCircle2,
  Clock,
  FileEdit,
  XCircle,
  RotateCw,
} from "lucide-react";

type AttachmentStatus = "draft" | "pending" | "approved" | "rejected";

type Attachment = {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: string;
  label: string | null;
  status: AttachmentStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  storage_path: string;
  uploaded_by: string;
  zakat_record_id: string | null;
  organization_id: string | null;
  approval_id: string | null;
  created_at: string;
  updated_at: string;
};

type AuditRow = {
  id: string;
  attachment_id: string;
  action: "created" | "updated" | "deleted" | "status_changed";
  status_before: string | null;
  status_after: string | null;
  changed_fields: string[] | null;
  actor_id: string | null;
  note: string | null;
  created_at: string;
};

const STATUS_META: Record<AttachmentStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  draft: { label: "مسودّة", cls: "bg-slate-500/15 text-slate-700 border-slate-500/30", icon: <FileEdit className="h-3 w-3" /> },
  pending: { label: "قيد المراجعة", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30", icon: <Clock className="h-3 w-3" /> },
  approved: { label: "معتمد", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: "مرفوض", cls: "bg-red-500/15 text-red-700 border-red-500/30", icon: <XCircle className="h-3 w-3" /> },
};

const ACTION_LABEL: Record<AuditRow["action"], string> = {
  created: "إنشاء",
  updated: "تعديل",
  status_changed: "تغيير الحالة",
  deleted: "حذف",
};

export const Route = createFileRoute("/_authenticated/attachments-review")({
  component: AttachmentsReviewPage,
});

function AttachmentsReviewPage() {
  const [rows, setRows] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | AttachmentStatus>("all");
  const [reload, setReload] = useState(0);
  const [historyFor, setHistoryFor] = useState<Attachment | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await (supabase as any)
        .from("approval_attachments")
        .select(
          "id,file_name,mime_type,size_bytes,category,label,status,review_note,reviewed_by,reviewed_at,storage_path,uploaded_by,zakat_record_id,organization_id,approval_id,created_at,updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(300);
      if (cancelled) return;
      if (error) setErr(error.message);
      else setRows((data ?? []) as Attachment[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const counts = useMemo(() => {
    const c = { draft: 0, pending: 0, approved: 0, rejected: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  const filtered = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  );

  const changeStatus = async (a: Attachment, next: AttachmentStatus, note?: string) => {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("approval_attachments")
      .update({
        status: next,
        review_note: note ?? null,
        reviewed_by: userRes?.user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", a.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success(`تم تحديث الحالة إلى ${STATUS_META[next].label}`);
    setReload((k) => k + 1);
    return true;
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-primary" /> مراجعة المرفقات
        </h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setReload((k) => k + 1)}>
            <RotateCw className="h-3.5 w-3.5" /> تحديث
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="مسودّة" value={counts.draft} status="draft" />
        <StatCard label="قيد المراجعة" value={counts.pending} status="pending" />
        <StatCard label="معتمد" value={counts.approved} status="approved" />
        <StatCard label="مرفوض" value={counts.rejected} status="rejected" />
      </div>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">المرفقات ({filtered.length})</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">تصفية</span>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="draft">مسودّة</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin ml-2" /> جارٍ التحميل…
            </div>
          ) : err ? (
            <Alert variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد مرفقات ضمن هذه التصفية.</p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الملف</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>آخر تحديث</TableHead>
                    <TableHead>ملاحظة</TableHead>
                    <TableHead className="text-end">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <AttachmentRow
                      key={a.id}
                      a={a}
                      onChange={changeStatus}
                      onHistory={() => setHistoryFor(a)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AuditHistoryDialog
        open={!!historyFor}
        onOpenChange={(v) => !v && setHistoryFor(null)}
        attachment={historyFor}
      />

      {/* استخدام router لمنع تحذير */}
      <span className="hidden" data-router={router.state.location.pathname} />
    </div>
  );
}

function StatCard({ label, value, status }: { label: string; value: number; status: AttachmentStatus }) {
  const m = STATUS_META[status];
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <Badge variant="outline" className={`gap-1 ${m.cls}`}>{m.icon} {m.label}</Badge>
      </CardContent>
    </Card>
  );
}

function AttachmentRow({
  a,
  onChange,
  onHistory,
}: {
  a: Attachment;
  onChange: (a: Attachment, s: AttachmentStatus, note?: string) => Promise<boolean>;
  onHistory: () => void;
}) {
  const [open, setOpen] = useState<null | AttachmentStatus>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const m = STATUS_META[a.status];

  const submit = async () => {
    if (!open) return;
    setSaving(true);
    const ok = await onChange(a, open, note.trim() || undefined);
    setSaving(false);
    if (ok) {
      setOpen(null);
      setNote("");
    }
  };

  return (
    <>
      <TableRow>
        <TableCell className="max-w-[260px]">
          <div className="text-sm font-medium truncate">{a.file_name}</div>
          {a.label && <div className="text-xs text-muted-foreground truncate">{a.label}</div>}
        </TableCell>
        <TableCell className="text-xs">{a.category}</TableCell>
        <TableCell>
          <Badge variant="outline" className={`gap-1 ${m.cls}`}>{m.icon} {m.label}</Badge>
        </TableCell>
        <TableCell className="text-xs whitespace-nowrap">
          {new Date(a.updated_at).toLocaleString("ar-EG")}
        </TableCell>
        <TableCell className="text-xs max-w-[220px] truncate" title={a.review_note ?? ""}>
          {a.review_note || "—"}
        </TableCell>
        <TableCell className="text-end">
          <div className="flex flex-wrap justify-end gap-1.5">
            {a.status !== "pending" && (
              <Button size="sm" variant="secondary" onClick={() => setOpen("pending")}>
                إرسال للمراجعة
              </Button>
            )}
            {a.status !== "approved" && (
              <Button size="sm" variant="default" onClick={() => setOpen("approved")}>
                اعتماد
              </Button>
            )}
            {a.status !== "rejected" && (
              <Button size="sm" variant="destructive" onClick={() => setOpen("rejected")}>
                رفض
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1" onClick={onHistory}>
              <History className="h-3.5 w-3.5" /> السجل
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              تغيير الحالة إلى {open ? STATUS_META[open].label : ""}
            </DialogTitle>
            <DialogDescription>{a.file_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              ملاحظة المراجع {open === "rejected" ? "(مطلوبة)" : "(اختيارية)"}
            </label>
            <Textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="أدخل سبب القرار أو ملاحظة للمرفوع…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)} disabled={saving}>
              إلغاء
            </Button>
            <Button
              onClick={submit}
              disabled={saving || (open === "rejected" && note.trim().length === 0)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null} تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuditHistoryDialog({
  open,
  onOpenChange,
  attachment,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  attachment: Attachment | null;
}) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !attachment) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("attachment_audit_log")
        .select("id,attachment_id,action,status_before,status_after,changed_fields,actor_id,note,created_at")
        .eq("attachment_id", attachment.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (error) toast.error(error.message);
      setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, attachment]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> سجل تدقيق المرفق
          </DialogTitle>
          <DialogDescription>{attachment?.file_name}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin ml-2" /> جارٍ تحميل السجل…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد أحداث مسجّلة.</p>
        ) : (
          <ol className="relative border-r-2 border-muted pr-4 max-h-[60vh] overflow-y-auto space-y-4">
            {rows.map((r) => (
              <li key={r.id} className="relative">
                <span className="absolute -right-[10px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{ACTION_LABEL[r.action]}</span>
                  {r.status_before && r.status_after && r.action === "status_changed" && (
                    <span className="text-xs text-muted-foreground">
                      <Badge variant="outline" className={STATUS_META[r.status_before as AttachmentStatus]?.cls}>
                        {STATUS_META[r.status_before as AttachmentStatus]?.label ?? r.status_before}
                      </Badge>
                      <span className="mx-1">→</span>
                      <Badge variant="outline" className={STATUS_META[r.status_after as AttachmentStatus]?.cls}>
                        {STATUS_META[r.status_after as AttachmentStatus]?.label ?? r.status_after}
                      </Badge>
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground ms-auto">
                    {new Date(r.created_at).toLocaleString("ar-EG")}
                  </span>
                </div>
                {r.changed_fields && r.changed_fields.length > 0 && r.action !== "status_changed" && (
                  <div className="text-xs text-muted-foreground mt-1">
                    الحقول المعدّلة: {r.changed_fields.join(", ")}
                  </div>
                )}
                {r.note && (
                  <div className="text-xs bg-muted/50 rounded p-2 mt-1">{r.note}</div>
                )}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
