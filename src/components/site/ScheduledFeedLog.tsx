import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getScheduledFeedRuns } from "@/lib/admin-console.functions";
import type { ScheduledFeedRun } from "@/lib/scheduled-feed-run";

const labels: Record<ScheduledFeedRun["status"], string> = {
  running: "قيد التنفيذ", success: "نجح", partial: "تحديث جزئي", failed: "فشل",
};
function utcTime(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

export function ScheduledFeedLog() {
  const getRuns = useServerFn(getScheduledFeedRuns);
  const [runs, setRuns] = useState<Array<ScheduledFeedRun & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setRuns(await getRuns()); }
    catch { setError("تعذّر تحميل سجل التحديثات. حاول مرة أخرى."); }
    finally { setLoading(false); }
  }, [getRuns]);
  useEffect(() => { void load(); }, [load]);
  const latest = runs[0];
  return (
    <section className="mb-8 border-b border-border pb-6" aria-labelledby="scheduled-feed-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="scheduled-feed-heading" className="flex items-center gap-2 text-xl"><Clock className="size-5 text-primary" />تحديث أسعار الصاغة المجدول</h2>
        <Button size="icon" variant="outline" aria-label="تحديث سجل المهام" title="تحديث سجل المهام" disabled={loading} onClick={() => { void load(); }}><RefreshCw className="size-4" /></Button>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {loading && <p role="status" className="mt-4 text-sm text-muted-foreground">جارٍ تحميل السجل…</p>}
      {!loading && !error && !latest && <p className="mt-4 text-sm text-muted-foreground">لم يُسجّل تحديث مجدول بعد.</p>}
      {latest && <>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">آخر تنفيذ (UTC)</dt><dd className="mt-1"><time dateTime={latest.startedAt}>{utcTime(latest.startedAt)}</time></dd></div>
          <div><dt className="text-muted-foreground">النتيجة</dt><dd className={`mt-1 font-semibold ${latest.status === "failed" ? "text-destructive" : "text-foreground"}`}>{labels[latest.status]}</dd></div>
          <div><dt className="text-muted-foreground">الدول المحدّثة</dt><dd className="mt-1 num">{latest.updated.length}{latest.updated.length > 0 && ` · ${latest.updated.join("، ")}`}</dd></div>
        </dl>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[38rem] text-sm">
            <caption className="mb-2 text-start text-muted-foreground">آخر عمليات التنفيذ · الأوقات بتوقيت UTC</caption>
            <thead><tr className="border-b border-border text-muted-foreground"><th className="py-3 text-start font-medium">البدء</th><th className="py-3 text-start font-medium">الانتهاء</th><th className="py-3 text-start font-medium">النتيجة</th><th className="py-3 text-start font-medium">دول</th><th className="py-3 text-start font-medium">تحذيرات</th></tr></thead>
            <tbody>{runs.map(run => <tr key={run.id} className="border-b border-border"><td className="py-3"><time dateTime={run.startedAt}>{utcTime(run.startedAt)}</time></td><td className="py-3">{run.finishedAt ? <time dateTime={run.finishedAt}>{utcTime(run.finishedAt)}</time> : "—"}</td><td className="py-3">{labels[run.status]}</td><td className="py-3 num">{run.updated.length}</td><td className="py-3 num">{run.warningCount}</td></tr>)}</tbody>
          </table>
        </div>
      </>}
    </section>
  );
}