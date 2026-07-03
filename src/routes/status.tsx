import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Activity } from "lucide-react";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "حالة الخدمة — Zakat Platform Status" },
      { name: "description", content: "لوحة حالة تشغيل حاسبة الزكاة: صحة الخدمة، واجهات API، ومحرك الفتوى." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Zakat Platform — Live Status" },
      { property: "og:description", content: "Real-time uptime and health for the Zakat calculator APIs." },
    ],
  }),
  component: StatusPage,
});

type Health = {
  ok: boolean;
  service: string;
  version: string;
  uptime_ms: number;
  time: string;
  runtime: string;
  checks: Record<string, string>;
};

function StatusPage() {
  const [h, setH] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      const t0 = performance.now();
      try {
        const r = await fetch("/api/public/health", { cache: "no-store" });
        const j = (await r.json()) as Health;
        if (!cancel) {
          setH(j);
          setLatency(Math.round(performance.now() - t0));
          setErr(null);
        }
      } catch (e) {
        if (!cancel) setErr(e instanceof Error ? e.message : "network_error");
      }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => { cancel = true; clearInterval(id); };
  }, []);

  const healthy = h?.ok && !err;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center gap-3">
          <Activity className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">حالة المنصّة</h1>
            <p className="text-sm text-muted-foreground">Live health of Zakat calculator services</p>
          </div>
        </header>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>الحالة الإجمالية</CardTitle>
            {healthy ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Operational</Badge>
            ) : (
              <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3.5 w-3.5" /> Degraded</Badge>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Version" value={h?.version ?? "—"} />
            <Stat label="Runtime" value={h?.runtime ?? "—"} />
            <Stat label="Latency" value={latency != null ? `${latency} ms` : "—"} />
            <Stat label="Uptime" value={h ? fmtUptime(h.uptime_ms) : "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>مكوّنات الخدمة</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(h ? Object.entries(h.checks) : [
              ["fatwa_engine", "…"], ["erp_journal", "…"], ["openapi", "…"],
            ]).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded border p-3 text-sm">
                <span className="font-mono">{k}</span>
                <Badge variant={v === "ok" ? "default" : "secondary"} className={v === "ok" ? "bg-emerald-600 hover:bg-emerald-600" : ""}>
                  {v}
                </Badge>
              </div>
            ))}
            {err && <div className="text-sm text-destructive">تعذّر الوصول للخدمة: {err}</div>}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          يتم تحديث الحالة تلقائياً كل 15 ثانية · Endpoint:{" "}
          <code className="font-mono">/api/public/health</code>
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold truncate">{value}</div>
    </div>
  );
}

function fmtUptime(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}
