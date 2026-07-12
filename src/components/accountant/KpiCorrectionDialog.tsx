import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ZAKAT_RATE, fmt } from "@/lib/zakat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Wand2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export type CorrectionRecord = {
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
  updated_at: string;
};

export type IssueCode =
  | "no_hijri"
  | "neg_equity"
  | "neg_net"
  | "no_zakat_on_base"
  | "rate_mismatch"
  | "no_base"
  | "stale_draft"
  | "rejected";

type Suggestion = {
  code: IssueCode;
  title: string;
  reason: string;
  fixable: boolean;
  before: string;
  after: string;
  patch?: Partial<CorrectionRecord>;
};

// تحويل ميلادي تقريبي إلى هجري
function approxHijriYear(d: Date): number {
  const g = d.getFullYear();
  return Math.floor(((g - 622) * 33) / 32) + 1;
}

export function buildSuggestions(r: CorrectionRecord, issueCodes: IssueCode[]): Suggestion[] {
  const out: Suggestion[] = [];
  const prepaid = Math.max(0, r.zakat_due - r.net_due || 0);

  const expectedZakat = +(r.zakat_base * ZAKAT_RATE).toFixed(2);
  const recalcNet = +Math.max(0, expectedZakat - prepaid).toFixed(2);

  for (const code of issueCodes) {
    switch (code) {
      case "rate_mismatch":
      case "no_zakat_on_base": {
        out.push({
          code,
          title: "إعادة احتساب الزكاة المستحقّة بنسبة 2.5٪ من الوعاء",
          reason:
            code === "rate_mismatch"
              ? "الزكاة المسجّلة لا تطابق 2.5٪ من الوعاء الزكوي."
              : "الوعاء موجب لكن الزكاة تساوي صفر.",
          fixable: r.zakat_base > 0,
          before: `${fmt(r.zakat_due)} ${r.currency}`,
          after: `${fmt(expectedZakat)} ${r.currency}`,
          patch: { zakat_due: expectedZakat, net_due: recalcNet },
        });
        break;
      }
      case "neg_net": {
        const fixedNet = Math.max(0, r.zakat_due - prepaid);
        out.push({
          code,
          title: "تصفير الصافي السالب",
          reason: "لا يجوز أن يكون الصافي المستحقّ أقل من صفر.",
          fixable: true,
          before: `${fmt(r.net_due)} ${r.currency}`,
          after: `${fmt(fixedNet)} ${r.currency}`,
          patch: { net_due: +fixedNet.toFixed(2) },
        });
        break;
      }
      case "no_hijri": {
        const src = r.gregorian_date ? new Date(r.gregorian_date) : new Date(r.updated_at);
        const hy = approxHijriYear(src);
        out.push({
          code,
          title: "استكمال السنة الهجرية المفقودة",
          reason: "السنة الهجرية غير محددة — تُشتق تقديريًا من التاريخ الميلادي.",
          fixable: true,
          before: r.hijri_year || "—",
          after: String(hy),
          patch: { hijri_year: String(hy) },
        });
        break;
      }
      case "neg_equity": {
        out.push({
          code,
          title: "مراجعة الخصوم التي تتجاوز الأصول",
          reason: "الخصوم أكبر من الأصول — لا يُطبَّق تصحيح تلقائي، مراجعة يدوية مطلوبة.",
          fixable: false,
          before: `أصول ${fmt(r.total_assets)} / خصوم ${fmt(r.total_liabilities)}`,
          after: "مراجعة يدوية",
        });
        break;
      }
      case "no_base": {
        out.push({
          code,
          title: "احتساب الوعاء الزكوي",
          reason: "لا يوجد وعاء زكوي محسوب — يتطلب فتح الإقرار وإعادة إدخال العناصر.",
          fixable: false,
          before: "—",
          after: "فتح الإقرار",
        });
        break;
      }
      case "stale_draft": {
        out.push({
          code,
          title: "أرشفة أو تحديث المسودة الراكدة",
          reason: "لم تُعدَّل المسودة منذ فترة طويلة.",
          fixable: false,
          before: new Date(r.updated_at).toLocaleDateString("ar-EG"),
          after: "مراجعة المحاسب",
        });
        break;
      }
      case "rejected": {
        out.push({
          code,
          title: "معالجة الاعتماد المرفوض",
          reason: "يتطلب فتح الإقرار ومعالجة سبب الرفض قبل إعادة الإرسال.",
          fixable: false,
          before: "مرفوض",
          after: "مراجعة يدوية",
        });
        break;
      }
    }
  }
  return out;
}

export function KpiCorrectionDialog({
  open,
  onOpenChange,
  record,
  issueCodes,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: CorrectionRecord | null;
  issueCodes: IssueCode[];
  onApplied?: () => void;
}) {
  const suggestions = useMemo(
    () => (record ? buildSuggestions(record, issueCodes) : []),
    [record, issueCodes],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  // إعادة تعيين عند فتح مختلف
  useMemo(() => {
    if (open) {
      const pre = new Set<string>();
      suggestions.forEach((s) => {
        if (s.fixable) pre.add(s.code);
      });
      setSelected(pre);
      setConfirmed(false);
    }
  }, [open, suggestions]);

  const toggle = (code: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });

  const chosen = suggestions.filter((s) => s.fixable && selected.has(s.code));

  const apply = async () => {
    if (!record || chosen.length === 0) return;
    setSaving(true);
    try {
      const patch: Record<string, any> = {};
      const changed: string[] = [];
      for (const s of chosen) {
        if (!s.patch) continue;
        for (const [k, v] of Object.entries(s.patch)) {
          patch[k] = v;
          if (!changed.includes(k)) changed.push(k);
        }
      }
      patch.updated_at = new Date().toISOString();

      const before: Record<string, any> = {};
      for (const k of changed) before[k] = (record as any)[k];

      const { error } = await supabase
        .from("zakat_records")
        .update(patch as any)
        .eq("id", record.id);
      if (error) throw error;

      // سجل تدقيق (best-effort)
      try {
        const { data: rec } = await supabase
          .from("zakat_records")
          .select("organization_id")
          .eq("id", record.id)
          .maybeSingle();
        const { data: userRes } = await supabase.auth.getUser();
        await supabase.from("org_audit_log").insert({
          organization_id: (rec as any)?.organization_id ?? null,
          actor_id: userRes?.user?.id ?? null,
          entity_type: "zakat_record",
          entity_id: record.id,
          action: "auto_correction",
          changed_fields: changed,
          before_state: before as any,
          after_state: patch as any,
          note: `تصحيح تلقائي: ${chosen.map((c) => c.title).join(" | ")}`,
        });
      } catch {
        /* audit best-effort */
      }

      toast.success("تم تطبيق التصحيحات وإعادة احتساب الزكاة");
      onOpenChange(false);
      onApplied?.();
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر تطبيق التصحيحات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" /> سير عمل التصحيح التلقائي
          </DialogTitle>
          <DialogDescription>
            راجع التعديلات المقترحة، اختر ما ترغب في تطبيقه، ثم أكّد قبل إعادة احتساب الزكاة.
          </DialogDescription>
        </DialogHeader>

        {suggestions.length === 0 ? (
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              لا توجد ملاحظات لهذا الإقرار.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pe-1">
            {suggestions.map((s) => {
              const isSel = selected.has(s.code);
              return (
                <div
                  key={s.code}
                  className={`rounded-lg border p-3 space-y-2 ${
                    s.fixable ? "" : "opacity-70 bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <Checkbox
                        id={`fix-${s.code}`}
                        checked={isSel && s.fixable}
                        disabled={!s.fixable}
                        onCheckedChange={() => s.fixable && toggle(s.code)}
                      />
                      <label
                        htmlFor={`fix-${s.code}`}
                        className="text-sm font-medium leading-tight cursor-pointer"
                      >
                        {s.title}
                      </label>
                    </div>
                    <Badge variant={s.fixable ? "secondary" : "outline"} className="shrink-0">
                      {s.fixable ? "تصحيح تلقائي" : "يدوي"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.reason}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-muted/60 p-2">
                      <div className="text-muted-foreground">قبل</div>
                      <div dir="ltr" className="font-medium">
                        {s.before}
                      </div>
                    </div>
                    <div className="rounded bg-emerald-500/10 p-2">
                      <div className="text-muted-foreground">بعد</div>
                      <div dir="ltr" className="font-medium">
                        {s.after}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {chosen.length > 0 && (
          <label className="flex items-start gap-2 rounded-md border p-3 bg-amber-500/5">
            <Checkbox
              id="confirm-accountant"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(Boolean(v))}
            />
            <div className="text-xs leading-relaxed">
              <div className="font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> تأكيد المحاسب
              </div>
              أُقرّ بأنني راجعتُ التعديلات المقترحة وأوافق على تطبيقها وإعادة احتساب الزكاة على هذا
              الإقرار.
            </div>
          </label>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button onClick={apply} disabled={!record || chosen.length === 0 || !confirmed || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ms-2" /> جارٍ التطبيق…
              </>
            ) : (
              <>تطبيق وإعادة الاحتساب ({chosen.length})</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
