import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  Copy,
  Trash2,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import {
  runDiagnostics,
  hardRefresh,
  clearSessionData,
  diagnosticsSummary,
  type DiagnosticCheck,
} from "@/lib/diagnostics";

export const Route = createFileRoute("/diagnostics")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تشخيص التطبيق — نِصاب" },
      {
        name: "description",
        content:
          "شاشة تشخيص داخل التطبيق تكشف سبب فشل تحميل الصفحة وتقدّم خطوات إصلاح تلقائية مثل التحديث القسري.",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "تشخيص التطبيق — نِصاب" },
      {
        property: "og:description",
        content: "افحص الاتصال بالخدمة السحابية والكاش وService Worker وأصلح المشكلات تلقائياً.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiagnosticsPage,
});

const ICONS = {
  ok: <CheckCircle2 className="h-4 w-4 text-success" />,
  warn: <AlertTriangle className="h-4 w-4 text-warning" />,
  fail: <XCircle className="h-4 w-4 text-destructive" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
};

function DiagnosticsPage() {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      setChecks(await runDiagnostics());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const failed = checks.filter((c) => c.status === "fail");
  const healthy = !loading && failed.length === 0;

  return (
    <main className="min-h-screen bg-background px-4 py-10" dir="rtl">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center gap-3">
          <Activity className="h-7 w-7 text-primary" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">تشخيص التطبيق</h1>
            <p className="text-sm text-muted-foreground">
              يكشف سبب رسالة «تعذّر تحميل الصفحة» ويقترح إصلاحاً تلقائياً.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void run()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            إعادة الفحص
          </Button>
        </header>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>الخلاصة</CardTitle>
            {loading ? (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> جارٍ الفحص
              </Badge>
            ) : healthy ? (
              <Badge className="bg-success hover:bg-success gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> كل شيء سليم
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3.5 w-3.5" /> {failed.length} مشكلة
              </Badge>
            )}
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {loading
              ? "نفحص الشبكة، مفاتيح الاتصال، خادم التطبيق، الخدمة السحابية، والكاش…"
              : healthy
                ? "لم نعثر على سبب تقني لفشل التحميل. إن استمرت الرسالة فالمشكلة غالباً نسخة معاينة قديمة — نفّذ «تحديث قسري»."
                : `السبب الأرجح: ${failed[0].label} — ${failed[0].detail}`}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>نتائج الفحص</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && checks.length === 0 && (
              <div className="text-sm text-muted-foreground">جارٍ التحميل…</div>
            )}
            {checks.map((c) => (
              <div key={c.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-medium">
                    {ICONS[c.status]}
                    {c.label}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{c.detail}</span>
                </div>
                {c.hint && <p className="mt-2 text-xs text-muted-foreground">{c.hint}</p>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>إصلاح تلقائي</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FixRow
              title="تحديث قسري (Hard Refresh)"
              desc="يلغي تسجيل Service Worker ويمسح كل مخازن الكاش ثم يعيد تحميل الصفحة من الخادم — يحل معظم حالات «نسخة معاينة قديمة»."
              action={
                <Button size="sm" onClick={() => void hardRefresh()}>
                  <RefreshCw className="h-4 w-4" /> نفّذ الآن
                </Button>
              }
            />
            <FixRow
              title="مسح بيانات الجلسة"
              desc="يحذف رموز الدخول المخزّنة محلياً عند فشل المصادقة أو تعليق الجلسة (سيتم تسجيل خروجك)."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await clearSessionData();
                    toast.success("تم مسح بيانات الجلسة");
                    void run();
                  }}
                >
                  <Trash2 className="h-4 w-4" /> مسح
                </Button>
              }
            />
            <FixRow
              title="نسخ التقرير التشخيصي"
              desc="انسخ النتائج وأرسلها للدعم على support@nisab.app إن استمرت المشكلة."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(diagnosticsSummary(checks));
                    toast.success("تم نسخ التقرير");
                  }}
                >
                  <Copy className="h-4 w-4" /> نسخ
                </Button>
              }
            />
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <Home className="h-4 w-4" /> العودة للصفحة الرئيسية
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

function FixRow({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded border p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
