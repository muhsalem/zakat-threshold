import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

const KEY = "pwa_install_dismissed_v1";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function PWAInstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { if (window.localStorage.getItem(KEY)) return; } catch {}
    // hide on already-installed / standalone
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;

    function onBIP(e: Event) {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBIP as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", onBIP as EventListener);
  }, []);

  if (!visible || !evt) return null;

  function dismiss() {
    try { window.localStorage.setItem(KEY, String(Date.now())); } catch {}
    setVisible(false);
  }

  async function install() {
    try {
      await evt!.prompt();
      const { outcome } = await evt!.userChoice;
      if (outcome === "accepted") dismiss();
    } catch {
      dismiss();
    }
  }

  return (
    <div
      role="dialog"
      aria-label="تثبيت التطبيق"
      className="print:hidden fixed bottom-20 sm:bottom-4 inset-x-3 sm:inset-x-auto sm:right-4 z-40 max-w-sm rounded-xl border border-primary/30 bg-card p-3 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm">ثبّت نِصاب على جهازك</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            استخدم الحاسبة بسرعة وبدون فتح المتصفّح، مع تذكير الحول محلياً.
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={install}>تثبيت</Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>لاحقاً</Button>
          </div>
        </div>
        <button aria-label="إغلاق" onClick={dismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
