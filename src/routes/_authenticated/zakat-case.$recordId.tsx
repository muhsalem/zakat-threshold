import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ArrowRight,
  ClipboardCheck,
  History,
  ShieldAlert,
  ScrollText,
  FileText,
  Printer,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ComplianceChecklist, {
  useComplianceChecks,
  type ComplianceInputs,
} from "@/components/zakat/ComplianceChecklist";
import ComplianceAttachmentsSummary from "@/components/attachments/ComplianceAttachmentsSummary";
import {
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
} from "@/lib/zakat";

export const Route = createFileRoute("/_authenticated/zakat-case/$recordId")({
  head: () => ({
    meta: [
      { title: "تفاصيل حالة الزكاة — نِصاب" },
      {
        name: "description",
        content:
          "صفحة تفاصيل شاملة لحالة زكاة واحدة: سجل التغييرات، مدقّق الامتثال، السبب الشرعي للمخالفة، والخطوات المقترحة للتصحيح.",
      },
    ],
  }),
  component: ZakatCaseDetail,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <main className="container mx-auto max-w-2xl px-4 py-12" dir="rtl">
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
        <Button
          className="mt-4"
          onClick={() => {
            reset();
            router.invalidate();
          }}
        >
          إعادة المحاولة
        </Button>
      </main>
    );
  },
  notFoundComponent: () => (
    <main className="container mx-auto max-w-2xl px-4 py-12" dir="rtl">
      <Alert>
        <AlertDescription>لم يتم العثور على الحالة.</AlertDescription>
      </Alert>
    </main>
  ),
});

type Snapshot = Record<string, unknown> & {
  totalGold24?: number;
  goldGrams?: number;
  silverGrams?: number;
  monetaryBase?: number;
  moneyNisab?: number;
  debts?: number;
  hawlComplete?: boolean | null;
  hawlDaysRemaining?: number;
  hawlDaysPassed?: number;
  jewelryGrams24Raw?: number;
  jewelryOpinion?: "majority" | "hanafi";
  jewelryPurpose?: "storage" | "wear";
  cropsValue?: number;
  cropsKg?: number;
  camelsN?: number;
  cowsN?: number;
  sheepN?: number;
};

interface RecordRow {
  id: string;
  user_id: string;
  record_type: string;
  hijri_year: string | null;
  gregorian_date: string;
  currency: string;
  total_assets: number;
  total_liabilities: number;
  zakat_base: number;
  zakat_due: number;
  prepaid_zakat: number;
  net_due: number;
  notes: string | null;
  snapshot: Snapshot | null;
  created_at: string;
  updated_at: string;
}

interface AuditRow {
  id: string;
  action: string;
  created_at: string;
  fingerprint: string | null;
  sharia_refs: string[] | null;
  payload: Record<string, unknown> | null;
}

interface OrgAuditRow {
  id: string;
  action: string;
  created_at: string;
  actor_id: string | null;
  changed_fields: string[] | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  note: string | null;
}

interface Attachment {
  id: string;
  file_name: string;
  category: string;
  label: string | null;
  size_bytes: number;
  created_at: string;
}

function snapshotToInputs(snap: Snapshot | null): ComplianceInputs {
  if (!snap) return {};
  const goldGrams24 =
    (snap.totalGold24 as number | undefined) ??
    (snap.goldGrams as number | undefined) ??
    0;
  return {
    goldGrams24,
    silverGrams: (snap.silverGrams as number | undefined) ?? 0,
    monetaryBase: (snap.monetaryBase as number | undefined) ?? 0,
    moneyNisab: (snap.moneyNisab as number | undefined) ?? 0,
    debts: (snap.debts as number | undefined) ?? 0,
    hawlComplete: snap.hawlComplete ?? null,
    hawlDaysRemaining: snap.hawlDaysRemaining,
    hawlDaysPassed: snap.hawlDaysPassed,
    jewelryWornGrams:
      snap.jewelryPurpose === "wear" ? (snap.jewelryGrams24Raw as number | undefined) ?? 0 : 0,
    jewelryOpinion: snap.jewelryOpinion,
    jewelryPurpose: snap.jewelryPurpose,
    cropsKg:
      (snap.cropsKg as number | undefined) ??
      (snap.cropsValue as number | undefined) ??
      0,
    camelsN: (snap.camelsN as number | undefined) ?? 0,
    cowsN: (snap.cowsN as number | undefined) ?? 0,
    sheepN: (snap.sheepN as number | undefined) ?? 0,
    fullOwnership: true,
    moneyIsGrowth: true,
  };
}

const fmt = (n: number, cur = "") =>
  `${new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(n)}${cur ? ` ${cur}` : ""}`;

const ACTION_LABEL: Record<string, string> = {
  save: "حفظ الحساب",
  update: "تحديث بيانات",
  submit: "رفع للمراجعة",
  approve: "اعتماد",
  reject: "رفض",
  reopen: "إعادة فتح",
  attest: "توقيع شرعي",
  export: "تصدير تقرير",
  delete: "حذف",
  INSERT: "إضافة",
  UPDATE: "تعديل",
  DELETE: "حذف",
};

function ZakatCaseDetail() {
  const { recordId } = Route.useParams();
  const [record, setRecord] = useState<RecordRow | null>(null);
  const [sharia, setSharia] = useState<AuditRow[]>([]);
  const [org, setOrg] = useState<OrgAuditRow[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [{ data: rec, error: eRec }, { data: shariaRows }, { data: orgRows }, { data: atts }] =
          await Promise.all([
            supabase.from("zakat_records").select("*").eq("id", recordId).maybeSingle(),
            supabase
              .from("sharia_audit_log")
              .select("id,action,created_at,fingerprint,sharia_refs,payload")
              .eq("zakat_record_id", recordId)
              .order("created_at", { ascending: false })
              .limit(100),
            supabase
              .from("org_audit_log")
              .select("id,action,created_at,actor_id,changed_fields,before_state,after_state,note")
              .eq("entity_id", recordId)
              .order("created_at", { ascending: false })
              .limit(100),
            supabase
              .from("approval_attachments")
              .select("id,file_name,category,label,size_bytes,created_at")
              .eq("zakat_record_id", recordId)
              .order("created_at", { ascending: false }),
          ]);

        if (cancelled) return;
        if (eRec) throw eRec;
        if (!rec) {
          setErr("لم يتم العثور على السجل");
        } else {
          setRecord(rec as RecordRow);
        }
        setSharia((shariaRows as AuditRow[] | null) || []);
        setOrg((orgRows as OrgAuditRow[] | null) || []);
        setAttachments((atts as Attachment[] | null) || []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recordId]);

  if (loading) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-12 flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }

  if (err || !record) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-12" dir="rtl">
        <Alert variant="destructive">
          <AlertDescription>{err || "لم يتم العثور على السجل"}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/dashboard">
            <ArrowRight className="w-4 h-4 ml-1" />
            العودة
          </Link>
        </Button>
      </main>
    );
  }

  const inputs = snapshotToInputs(record.snapshot);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-3 flex-wrap print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">تفاصيل حالة الزكاة</h1>
            <Badge variant="outline">{record.record_type}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {record.gregorian_date}
            {record.hijri_year ? ` · ${record.hijri_year}هـ` : ""} · رقم:{" "}
            <code className="text-xs bg-muted px-1 rounded">{record.id.slice(0, 8)}</code>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 ml-1" /> طباعة
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/compliance-report/$recordId" params={{ recordId }}>
              <ClipboardCheck className="w-4 h-4 ml-1" /> تقرير الامتثال
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/certified-report/$recordId" params={{ recordId }}>
              <FileText className="w-4 h-4 ml-1" /> التقرير المعتمد
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
        <SummaryCard label="إجمالي الموجودات" value={fmt(Number(record.total_assets), record.currency)} />
        <SummaryCard label="الالتزامات" value={fmt(Number(record.total_liabilities), record.currency)} />
        <SummaryCard label="الوعاء الزكوي" value={fmt(Number(record.zakat_base), record.currency)} />
        <SummaryCard label="الزكاة المستحقة" value={fmt(Number(record.zakat_due), record.currency)} highlight />
        <SummaryCard label="الصافي المستحق" value={fmt(Number(record.net_due), record.currency)} highlight />
      </div>

      <Tabs defaultValue="compliance" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="compliance">
            <ClipboardCheck className="w-4 h-4 ml-1" /> مدقّق الامتثال
          </TabsTrigger>
          <TabsTrigger value="violations">
            <ShieldAlert className="w-4 h-4 ml-1" /> المخالفات والتصحيح
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 ml-1" /> سجل التغييرات
          </TabsTrigger>
          <TabsTrigger value="sharia">
            <ScrollText className="w-4 h-4 ml-1" /> السجل الشرعي
          </TabsTrigger>
          <TabsTrigger value="attachments">
            <FileText className="w-4 h-4 ml-1" /> المرفقات ({attachments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compliance" className="mt-4">
          <ComplianceChecklist inputs={inputs} />
        </TabsContent>

        <TabsContent value="violations" className="mt-4">
          <ViolationsPanel inputs={inputs} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <ChangeHistoryPanel rows={org} />
        </TabsContent>

        <TabsContent value="sharia" className="mt-4">
          <ShariaLogPanel rows={sharia} />
        </TabsContent>

        <TabsContent value="attachments" className="mt-4 space-y-4">
          <ComplianceAttachmentsSummary
            recordType={record.record_type}
            attachments={attachments.map((a) => ({
              id: a.id,
              file_name: a.file_name,
              category: (a.category ?? "other") as never,
              label: (a as { label?: string | null }).label ?? null,
              status: (a as { status?: string | null }).status ?? null,
            }))}
            calcSummary={[
              { label: "الوعاء الزكوي", value: fmt(Number(record.zakat_base), record.currency) },
              { label: "الزكاة المستحقة", value: fmt(Number(record.zakat_due), record.currency) },
              { label: "الصافي المستحق", value: fmt(Number(record.net_due), record.currency) },
              { label: "نوع الإقرار", value: record.record_type },
            ]}
          />
          <AttachmentsPanel rows={attachments} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 border ${highlight ? "bg-primary/5 border-primary/40" : "bg-muted/30"}`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

/* ---------------------------- Violations panel ---------------------------- */

function ViolationsPanel({ inputs }: { inputs: ComplianceInputs }) {
  const checks = useComplianceChecks(inputs);
  const bad = checks.filter((c) => c.status === "fail" || c.status === "warn");

  if (bad.length === 0) {
    return (
      <Alert className="border-emerald-300 bg-emerald-50">
        <ClipboardCheck className="w-4 h-4 text-emerald-700" />
        <AlertDescription className="text-emerald-800">
          لا توجد مخالفات — جميع الشروط الشرعية المطبّقة على هذه الحالة مجتازة.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          المخالفات المكتشفة ({bad.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bad.map((c) => (
          <div
            key={c.id}
            className={`rounded-lg border p-4 ${
              c.status === "fail" ? "bg-rose-50/50 border-rose-200" : "bg-amber-50/50 border-amber-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`w-5 h-5 mt-0.5 shrink-0 ${
                  c.status === "fail" ? "text-rose-600" : "text-amber-600"
                }`}
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{c.label}</h3>
                  <Badge
                    className={
                      c.status === "fail"
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                    }
                  >
                    {c.status === "fail" ? "مخالفة" : "تنبيه"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <InfoBlock title="الوضع الحالي" body={c.detail} />
                  <InfoBlock title="السبب الشرعي" body={c.reference} highlight />
                  {c.remedy && (
                    <InfoBlock
                      title="الخطوات المقترحة للتصحيح"
                      body={c.remedy}
                      icon={<Wrench className="w-3.5 h-3.5" />}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground pt-2 border-t">
          الحلول أعلاه استرشادية. راجع مفتياً معتمداً قبل اعتماد التصحيح النهائي على الحساب.
        </p>
      </CardContent>
    </Card>
  );
}

function InfoBlock({
  title,
  body,
  highlight,
  icon,
}: {
  title: string;
  body: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-md p-3 border ${highlight ? "bg-primary/5 border-primary/30" : "bg-background border-border"}`}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
        {icon}
        {title}
      </div>
      <div className="text-xs leading-relaxed">{body}</div>
    </div>
  );
}

/* --------------------------- Change history panel ------------------------- */

function ChangeHistoryPanel({ rows }: { rows: OrgAuditRow[] }) {
  if (rows.length === 0) {
    return (
      <Alert>
        <AlertDescription>لا توجد تغييرات مسجّلة على هذه الحالة بعد.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-5 h-5 text-primary" />
          سجل التغييرات ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="border-l-2 border-primary/40 pr-3 py-1">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Badge variant="outline">{ACTION_LABEL[r.action] || r.action}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("ar-SA")}
                </span>
              </div>
              {r.changed_fields && r.changed_fields.length > 0 && (
                <div className="text-xs mt-1">
                  <span className="text-muted-foreground">الحقول المعدّلة: </span>
                  {r.changed_fields.map((f) => (
                    <code key={f} className="bg-muted px-1 py-0.5 mx-0.5 rounded text-[10px]">
                      {f}
                    </code>
                  ))}
                </div>
              )}
              {r.note && <p className="text-xs mt-1 text-muted-foreground">{r.note}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ----------------------------- Sharia log panel --------------------------- */

function ShariaLogPanel({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return (
      <Alert>
        <AlertDescription>لا توجد أحداث شرعية مسجّلة على هذه الحالة.</AlertDescription>
      </Alert>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="w-5 h-5 text-primary" />
          السجل الشرعي ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-md border p-3 bg-muted/20">
            <div className="flex items-center gap-2 flex-wrap text-sm mb-1">
              <Badge variant="outline">{ACTION_LABEL[r.action] || r.action}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString("ar-SA")}
              </span>
              {r.fingerprint && (
                <code className="text-[10px] bg-muted px-1 rounded" title="بصمة SHA-256">
                  {r.fingerprint.slice(0, 12)}…
                </code>
              )}
            </div>
            {r.sharia_refs && r.sharia_refs.length > 0 && (
              <div className="text-[11px] text-muted-foreground">
                المراجع: {r.sharia_refs.join(" · ")}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* --------------------------- Attachments panel ---------------------------- */

function AttachmentsPanel({ rows }: { rows: Attachment[] }) {
  if (rows.length === 0) {
    return (
      <Alert>
        <AlertDescription>لا توجد مرفقات مرتبطة بهذه الحالة.</AlertDescription>
      </Alert>
    );
  }
  const fmtSize = (b: number) =>
    b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(1)}MB` : `${Math.round(b / 1024)}KB`;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-5 h-5 text-primary" />
          المرفقات ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 border rounded p-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.label || a.file_name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {a.category} · {fmtSize(a.size_bytes)} ·{" "}
                  {new Date(a.created_at).toLocaleDateString("ar-SA")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Silence unused-import lint if nisab constants aren't referenced (kept for parity)
void GOLD_NISAB_GRAMS;
void SILVER_NISAB_GRAMS;
