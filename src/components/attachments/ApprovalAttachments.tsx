import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Paperclip, Upload, Trash2, Download, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "approval-attachments";
const MAX_MB = 15;

export type AttachmentCategory =
  | "council_decision"
  | "financial_statement"
  | "fatwa"
  | "audit"
  | "other";

const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  council_decision: "قرار مجمع فقهي",
  financial_statement: "قوائم مالية",
  fatwa: "فتوى / رأي شرعي",
  audit: "تدقيق / مراجعة",
  other: "أخرى",
};

interface Row {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: AttachmentCategory;
  label: string | null;
  uploaded_by: string;
  created_at: string;
}

interface Props {
  approvalId?: string;
  zakatRecordId?: string;
  organizationId?: string;
  canWrite?: boolean;
  compact?: boolean;
}

export function ApprovalAttachments({
  approvalId,
  zakatRecordId,
  organizationId,
  canWrite = true,
  compact = false,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<AttachmentCategory>("council_decision");
  const [label, setLabel] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("approval_attachments")
      .select("*")
      .order("created_at", { ascending: false });
    if (approvalId) q = q.eq("approval_id", approvalId);
    else if (zakatRecordId) q = q.eq("zakat_record_id", zakatRecordId);
    else if (organizationId) q = q.eq("organization_id", organizationId);
    else {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error } = await q;
    if (error) toast.error("تعذّر تحميل المرفقات", { description: error.message });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [approvalId, zakatRecordId, organizationId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    load();
  }, [load]);

  const onPick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!userId) {
      toast.error("جلسة الدخول غير متاحة");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`الحد الأقصى ${MAX_MB} ميجابايت`);
      return;
    }
    setUploading(true);
    const scopeId = organizationId ?? userId;
    const parentId = approvalId ?? zakatRecordId ?? "general";
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${scopeId}/${parentId}/${crypto.randomUUID()}-${safe}`;

    const up = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (up.error) {
      toast.error("تعذّر رفع الملف", { description: up.error.message });
      setUploading(false);
      return;
    }
    const ins = await supabase.from("approval_attachments").insert({
      approval_id: approvalId ?? null,
      zakat_record_id: zakatRecordId ?? null,
      organization_id: organizationId ?? null,
      uploaded_by: userId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      category,
      label: label.trim() || null,
    });
    if (ins.error) {
      // rollback the storage upload
      await supabase.storage.from(BUCKET).remove([path]);
      toast.error("تعذّر تسجيل المرفق", { description: ins.error.message });
    } else {
      toast.success("تم رفع المرفق");
      setLabel("");
      await load();
    }
    setUploading(false);
  };

  const openFile = async (r: Row) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(r.storage_path, 60 * 10);
    if (error || !data) return toast.error("تعذّر إنشاء رابط التنزيل");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const remove = async (r: Row) => {
    if (!confirm(`حذف المرفق «${r.file_name}»؟`)) return;
    const del = await supabase.from("approval_attachments").delete().eq("id", r.id);
    if (del.error) return toast.error("تعذّر الحذف", { description: del.error.message });
    await supabase.storage.from(BUCKET).remove([r.storage_path]);
    toast.success("تم الحذف");
    await load();
  };

  const body = (
    <div className="space-y-3">
      {canWrite && (
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
          <div>
            <label className="text-[11px] text-muted-foreground">التصنيف</label>
            <Select value={category} onValueChange={(v) => setCategory(v as AttachmentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">
              وصف/مرجع (اختياري)
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="قرار المجمع الفقهي رقم 143…"
            />
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={onFile}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
            />
            <Button onClick={onPick} disabled={uploading} className="gap-1.5 w-full sm:w-auto">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              رفع مرفق
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          لا توجد مرفقات بعد. أرفق قرار المجمع الفقهي، القوائم المالية، أو أي مستند داعم.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted/40 transition-colors"
            >
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{r.file_name}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {CATEGORY_LABELS[r.category] ?? r.category}
                  </Badge>
                  {r.label && <span className="truncate max-w-[220px]">{r.label}</span>}
                  {r.size_bytes != null && (
                    <span dir="ltr">{(r.size_bytes / 1024).toFixed(0)} KB</span>
                  )}
                  <span>{new Date(r.created_at).toLocaleDateString("ar-EG")}</span>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => openFile(r)} className="gap-1">
                <Download className="h-3.5 w-3.5" /> فتح
              </Button>
              {(canWrite || r.uploaded_by === userId) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(r)}
                  className="text-destructive"
                  aria-label="حذف"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (compact) return body;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" /> المرفقات والمستندات الداعمة
          {rows.length > 0 && (
            <Badge variant="secondary" className="ms-auto">
              {rows.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
