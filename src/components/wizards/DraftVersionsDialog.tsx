import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { History, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Snapshot omitted from list — it is a full wizard-state JSON blob and would
// bloat the response by 10–50x. We fetch it on-demand when restoring.
type VersionMeta = {
  id: string;
  step: number;
  created_at: string;
  note: string | null;
};

/**
 * Shows the version history for a single draft and lets the user restore any
 * prior snapshot. Restoring overwrites the current draft — a fresh version is
 * automatically captured first by the DB trigger, so nothing is lost.
 */
export function DraftVersionsDialog({
  draftId,
  draftTitle,
  onRestored,
}: {
  draftId: string;
  draftTitle: string;
  onRestored?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("zakat_draft_versions" as never)
        .select("id,step,created_at,note")
        .eq("draft_id", draftId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      if (error) toast.error(error.message);
      setVersions(((data as unknown) as VersionMeta[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, draftId]);

  async function restore(v: VersionMeta) {
    if (!confirm("استعادة هذا الإصدار سيستبدل المسودة الحالية. سيتم حفظ نسخة احتياطية تلقائياً.")) {
      return;
    }
    setBusyId(v.id);
    // Fetch the snapshot only now — we intentionally skipped it in the list.
    const { data: snapRow, error: fetchErr } = await supabase
      .from("zakat_draft_versions" as never)
      .select("snapshot,step")
      .eq("id", v.id)
      .maybeSingle();
    if (fetchErr || !snapRow) {
      setBusyId(null);
      toast.error(fetchErr?.message ?? "تعذّر جلب الإصدار");
      return;
    }
    const { snapshot, step } = snapRow as unknown as {
      snapshot: Record<string, unknown>;
      step: number;
    };
    const { error } = await supabase
      .from("zakat_drafts" as never)
      .update({ snapshot: snapshot as never, step } as never)
      .eq("id", draftId);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Audit: record the restore for admin review (fire-and-forget).
    const { data: auth } = await supabase.auth.getUser();
    if (auth?.user) {
      void supabase.from("sharia_audit_log").insert({
        user_id: auth.user.id,
        action: "restore_draft_version",
        payload: {
          draft_id: draftId,
          version_id: v.id,
          version_created_at: v.created_at,
          restored_step: step,
        },
      });
    }
    toast.success("تم الرجوع إلى الإصدار المحدد");
    setOpen(false);
    onRestored?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 gap-1" title="سجل الإصدارات" aria-label={`سجل إصدارات ${draftTitle}`}>
          <History className="h-3 w-3" /> الإصدارات
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" /> إصدارات: {draftTitle}
          </DialogTitle>
          <DialogDescription className="text-xs">
            كل تعديل جوهري على المسودة يُحفظ كإصدار تلقائيًا (بحد أقصى 20 إصدارًا لكل مسودة). اختر أيّها للعودة إليه.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              لا توجد إصدارات سابقة بعد — ستُحفظ الإصدارات تلقائياً عند التعديل.
            </p>
          ) : (
            <ul className="divide-y">
              {versions.map((v, i) => (
                <li key={v.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={i === 0 ? "default" : "outline"} className="text-[10px]">
                        {i === 0 ? "الأحدث" : `إصدار ${versions.length - i}`}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">خطوة {v.step + 1}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(v.created_at).toLocaleString("ar")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => restore(v)}
                    disabled={busyId === v.id}
                    className="h-8 gap-1 shrink-0"
                  >
                    {busyId === v.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    استعادة
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
