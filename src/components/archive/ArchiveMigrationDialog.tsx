import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CloudUpload, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabaseReady";

import {
  commitMigration,
  isMigrationDismissed,
  previewMigration,
  setMigrationDismissed,
  discardLocal,
  MIGRATABLE_KINDS,
  type MigrationPreview,
  type MigrationStrategy,
} from "@/lib/archive/cloud";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const KIND_LABEL: Record<string, string> = {
  fitr: "زكاة الفطر",
};

export function ArchiveMigrationDialog() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    if (isMigrationDismissed()) return;
    try {
      const p = await previewMigration();
      if (p.totalLocal > 0) {
        setPreview(p);
        setOpen(true);
      }
    } catch (e) {
      console.error("[archive-migration] preview failed", e);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    try {
      (async () => {
        try {
          const { data } = await supabase.auth.getUser();
          if (!mounted) return;
          if (data.user) await check();
        } catch (e) {
          console.error("[archive-migration] auth check failed", e);
        }
      })();
      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") {
          setMigrationDismissed(false);
          void check();
        }
        if (event === "SIGNED_OUT") {
          setOpen(false);
          setPreview(null);
        }
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    } catch (e) {
      console.error("[archive-migration] supabase unavailable", e);
    }
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [check]);


  async function run(strategy: MigrationStrategy) {
    setBusy(true);
    try {
      const res = await commitMigration(strategy);
      toast.success(
        `تمت المزامنة: رُفع ${res.uploaded} سجل${res.skipped ? ` وتم تخطي ${res.skipped}` : ""}`,
      );
      setOpen(false);
      setPreview(null);
    } catch (e) {
      console.error(e);
      toast.error("تعذّرت مزامنة الأرشيف. يرجى المحاولة مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  function later() {
    setMigrationDismissed(true);
    setOpen(false);
  }

  function deleteLocal() {
    if (!preview) return;
    const ok = window.confirm("سيتم حذف السجلات المحلية دون رفعها إلى حسابك. هل أنت متأكد؟");
    if (!ok) return;
    const kinds = Array.from(new Set(preview.items.map((i) => i.kind)));
    for (const k of kinds) discardLocal(k);
    setMigrationDismissed(true);
    setOpen(false);
    setPreview(null);
    toast.message("تم حذف السجلات المحلية");
  }

  if (!preview) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : later())}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5 text-primary" />
            مزامنة الأرشيف إلى حسابك
          </DialogTitle>
          <DialogDescription>
            وجدنا {preview.totalLocal} سجل محفوظ محلياً على هذا الجهاز.
            {preview.duplicateCount > 0 ? (
              <>
                {" "}
                منها <b>{preview.newCount}</b> جديد و<b> {preview.duplicateCount}</b> موجود مسبقاً
                في حسابك.
              </>
            ) : (
              <> جميعها جديدة ولم تُرفع بعد.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-64 rounded-md border">
          <ul className="divide-y">
            {preview.items.map((it, i) => (
              <li
                key={`${it.kind}-${it.year}-${it.currency}-${i}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {KIND_LABEL[it.kind] ?? it.kind} — {it.year ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    العملة: {it.currency ?? "—"}
                  </span>
                </div>
                <Badge variant={it.status === "new" ? "default" : "secondary"}>
                  {it.status === "new" ? "جديد" : "موجود مسبقاً"}
                </Badge>
              </li>
            ))}
          </ul>
        </ScrollArea>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={later} disabled={busy}>
              لاحقاً
            </Button>
            <Button variant="ghost" onClick={deleteLocal} disabled={busy}>
              حذف المحلية
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {preview.duplicateCount > 0 && (
              <Button variant="outline" onClick={() => run("overwrite")} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "استبدال الموجود"}
              </Button>
            )}
            <Button
              onClick={() => run("skip-duplicates")}
              disabled={busy || preview.newCount === 0}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : preview.newCount > 0 ? (
                `رفع الجديد فقط (${preview.newCount})`
              ) : (
                "لا يوجد جديد"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
