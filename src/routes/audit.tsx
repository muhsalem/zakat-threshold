import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogIn, FileText, Download, Printer } from "lucide-react";

export const Route = createFileRoute("/audit")({
  component: AuditPage,
  head: () => ({ meta: [{ title: "سجل التدقيق الشرعي | نِصاب" }] }),
});

interface AuditRow {
  id: string;
  action: string;
  fingerprint: string | null;
  sharia_refs: string[] | null;
  created_at: string;
  zakat_record_id: string | null;
}

function AuditPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) {
      setBusy(false);
      return;
    }
    supabase
      .from("sharia_audit_log")
      .select("id,action,fingerprint,sharia_refs,created_at,zakat_record_id")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows((data as AuditRow[]) ?? []);
        setBusy(false);
      });
  }, [user]);

  if (loading) return null;

  const downloadPdf = async () => {
    const el = document.getElementById("audit-report");
    if (!el) {
      window.print();
      return;
    }
    try {
      const mod = await import("html2pdf.js");
      const html2pdf = (mod as any).default ?? mod;
      await html2pdf()
        .from(el)
        .set({
          margin: [10, 8, 12, 8],
          filename: `sharia-audit-${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: "jpeg", quality: 0.96 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .save();
    } catch {
      window.print();
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6" dir="rtl" id="audit-report">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">سجل التدقيق الشرعي</h1>
        </div>
        {user && rows.length > 0 && (
          <div className="flex gap-2 print:hidden">
            <Button size="sm" onClick={downloadPdf} className="gap-1.5">
              <Download className="h-4 w-4" /> تحميل التقرير
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5">
              <Printer className="h-4 w-4" /> طباعة التقرير
            </Button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        كل عملية حساب وحفظ زكاة تُسجَّل هنا ببصمة فريدة والمراجع الشرعية المستخدمة، لضمان الشفافية
        وإمكانية المراجعة.
      </p>

      {!user ? (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-sm">سجّل دخولك لعرض سجل التدقيق الخاص بك.</p>
            <Link to="/auth">
              <Button className="gap-1.5">
                <LogIn className="h-4 w-4" /> دخول
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : busy ? (
        <p className="text-sm text-muted-foreground">جاري التحميل…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            لا توجد سجلات بعد. احفظ أول حساب زكاة لتبدأ سلسلة التدقيق.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {r.action === "create_zakat_record" ? "إنشاء سجل زكاة" : r.action}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {new Date(r.created_at).toLocaleString("ar-EG")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1.5">
                {r.fingerprint && (
                  <div>
                    <span className="text-muted-foreground">البصمة:</span>{" "}
                    <code className="font-mono">{r.fingerprint}</code>
                  </div>
                )}
                {r.sharia_refs && r.sharia_refs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.sharia_refs.map((ref) => (
                      <span
                        key={ref}
                        className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
