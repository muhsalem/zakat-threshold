import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { History, X, Save } from "lucide-react";

export function ResumeDraftBanner({
  savedAt,
  onResume,
  onDismiss,
}: {
  savedAt: string;
  onResume: () => void;
  onDismiss: () => void;
}) {
  const when = new Date(savedAt).toLocaleString("ar");
  return (
    <Alert className="border-primary/40 bg-primary/5">
      <History className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <span>
          وجدنا مسودّة محفوظة بتاريخ <b>{when}</b>. هل تريد الاستئناف من حيث توقفت؟
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={onResume} className="h-7 gap-1.5">
            استئناف
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss} className="h-7 gap-1.5">
            <X className="h-3.5 w-3.5" /> تجاهل
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function AutosaveIndicator({
  savedAt,
  cloudSavedAt,
  cloudStatus,
}: {
  savedAt: string | null;
  cloudSavedAt?: string | null;
  cloudStatus?: "idle" | "saving" | "saved" | "error" | "offline";
}) {
  if (!savedAt && !cloudSavedAt && !cloudStatus) return null;
  const localTime = savedAt
    ? new Date(savedAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })
    : null;
  const cloudTime = cloudSavedAt
    ? new Date(cloudSavedAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })
    : null;
  const cloudLabel =
    cloudStatus === "saving"
      ? "جاري المزامنة السحابية…"
      : cloudStatus === "error"
        ? "تعذّرت المزامنة السحابية"
        : cloudStatus === "offline"
          ? "بدون مزامنة سحابية (غير مسجّل)"
          : cloudTime
            ? `مزامنة سحابية ${cloudTime}`
            : null;
  return (
    <span className="inline-flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
      {localTime && (
        <span className="inline-flex items-center gap-1">
          <Save className="h-3 w-3" /> حُفظت المسودّة {localTime}
        </span>
      )}
      {cloudLabel && <span className="inline-flex items-center gap-1">· {cloudLabel}</span>}
    </span>
  );
}
