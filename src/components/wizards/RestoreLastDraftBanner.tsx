import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CloudDownload, X } from "lucide-react";
import { toast } from "sonner";

type Kind = "individual" | "company" | "institution";

const WIZARD_KEYS: Record<Kind, string> = {
  individual: "wizard:individual:v1",
  company: "wizard:company:v1",
  institution: "wizard:institution:v1",
};

const KIND_LABEL: Record<Kind, string> = {
  individual: "الأفراد",
  company: "الشركات",
  institution: "المؤسسات",
};

/**
 * Offers to restore the latest cloud-saved draft for the current wizard kind
 * when localStorage has nothing newer. Silent when there's no cloud draft.
 */
export function RestoreLastDraftBanner({ kind }: { kind: Kind }) {
  const [row, setRow] = useState<{
    id: string;
    updated_at: string;
    step: number;
    snapshot: Record<string, unknown>;
    title: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("zakat_drafts" as never)
        .select("id,updated_at,step,snapshot,title")
        .eq("user_id", uid)
        .eq("wizard_kind", kind)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      const cloud = data as unknown as {
        id: string;
        updated_at: string;
        step: number;
        snapshot: Record<string, unknown>;
        title: string;
      };
      // If localStorage already holds a newer or equal draft, don't nag.
      try {
        const raw = window.localStorage.getItem(WIZARD_KEYS[kind]);
        if (raw) {
          const parsed = JSON.parse(raw) as { at?: string };
          if (parsed.at && new Date(parsed.at).getTime() >= new Date(cloud.updated_at).getTime()) {
            return;
          }
        }
      } catch {
        /* ignore */
      }
      setRow(cloud);
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  if (!row || dismissed) return null;

  function restore() {
    if (!row) return;
    const payload = { at: row.updated_at, step: row.step ?? 0, data: row.snapshot ?? {} };
    try {
      window.localStorage.setItem(WIZARD_KEYS[kind], JSON.stringify(payload));
    } catch {
      /* quota */
    }
    toast.success("تم استرجاع المسودّة — أعِد التحميل للاستئناف");
    // Reload so the wizard mounts and picks up the restored draft.
    window.location.reload();
  }

  const when = new Date(row.updated_at).toLocaleString("ar");
  const isAuto = row.title === "__autosave__";
  return (
    <Alert className="mb-4 border-primary/40 bg-primary/5">
      <CloudDownload className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <span>
          وجدنا آخر مسودّة {isAuto ? "محفوظة تلقائيًا" : `«${row.title}»`} على السحابة لمعالج{" "}
          <b>{KIND_LABEL[kind]}</b> بتاريخ <b>{when}</b>. هل تريد استعادتها؟
        </span>
        <div className="flex gap-2">
          <Button size="sm" onClick={restore} className="h-7 gap-1.5">
            <CloudDownload className="h-3.5 w-3.5" /> استعادة
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="h-7 gap-1"
          >
            <X className="h-3.5 w-3.5" /> تجاهل
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
