import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Activity,
  TrendingUp,
  DollarSign,
  Timer,
  FileCheck2,
  Paperclip,
  UserCheck,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  orgId: string;
  orgName: string;
  currency: string;
}

type Role = "owner" | "admin" | "checker" | "maker" | "viewer";

interface Kpis {
  // Members
  members: number;
  membersByRole: Record<Role, number>;
  activeLast30d: number;

  // Operational
  approvalsPending: number;
  approvalsApproved: number;
  approvalsRejected: number;
  avgCycleHours: number | null; // submitted → decided
  lastActivity: string | null;

  // Financial
  totalZakatApproved: number;
  totalZakatPending: number;
  avgZakatPerApproval: number;
  byCurrency: Record<string, number>;

  // Compliance
  attachmentsTotal: number;
  attachmentsApproved: number;
  attachmentsRejected: number;
  attachmentsPending: number;
  attestationsValid: number;
  hawlRemindersOpen: number;
}

interface RecentRow {
  id: string;
  title: string;
  status: string;
  when: string;
}

const ROLES: Role[] = ["owner", "admin", "checker", "maker", "viewer"];
const ROLE_LABEL: Record<Role, string> = {
  owner: "مالك",
  admin: "مشرف",
  checker: "معتمِد",
  maker: "منشئ",
  viewer: "مشاهد",
};

export function OrgOverviewPanel({ orgId, orgName, currency }: Props) {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        membersRes,
        approvalsRes,
        attachmentsRes,
        attestationsRes,
        notificationsRes,
        auditRes,
      ] = await Promise.all([
        supabase.from("organization_members").select("user_id, role").eq("organization_id", orgId),
        supabase
          .from("zakat_approvals")
          .select("id, title, status, snapshot, decided_at, submitted_at, maker_id")
          .eq("organization_id", orgId)
          .order("submitted_at", { ascending: false }),
        supabase.from("approval_attachments").select("id, status").eq("organization_id", orgId),
        supabase
          .from("sharia_attestations")
          .select("id, issued_at")
          .order("issued_at", { ascending: false })
          .limit(500),
        supabase
          .from("notifications")
          .select("id, type, read_at")
          .eq("type", "hawl_reminder")
          .is("read_at", null)
          .limit(500),
        supabase
          .from("org_audit_log")
          .select("actor_id")
          .eq("organization_id", orgId)
          .gte("created_at", thirtyDaysAgo)
          .limit(2000),
      ]);

      if (cancelled) return;

      // ===== Members =====
      const members = (membersRes.data ?? []) as Array<{ user_id: string; role: Role }>;
      const membersByRole = ROLES.reduce(
        (acc, r) => ({ ...acc, [r]: 0 }),
        {} as Record<Role, number>,
      );
      members.forEach((m) => {
        if (membersByRole[m.role] !== undefined) membersByRole[m.role] += 1;
      });
      const activeIds = new Set(
        ((auditRes.data ?? []) as Array<{ actor_id: string | null }>)
          .map((r) => r.actor_id)
          .filter((v): v is string => !!v),
      );
      const memberIds = new Set(members.map((m) => m.user_id));
      const activeLast30d = [...activeIds].filter((id) => memberIds.has(id)).length;

      // ===== Approvals =====
      const approvals = (approvalsRes.data ?? []) as Array<{
        id: string;
        title: string;
        status: string;
        snapshot: Record<string, unknown> | null;
        decided_at: string | null;
        submitted_at: string;
      }>;

      const pending = approvals.filter((a) => a.status === "pending");
      const approved = approvals.filter((a) => a.status === "approved");
      const rejected = approvals.filter((a) => a.status === "rejected");

      const readZakat = (a: (typeof approvals)[number]) => {
        const snap = a.snapshot ?? {};
        const val = Number(
          (snap.zakat_due as number | string | undefined) ??
            (snap.total_zakat as number | string | undefined) ??
            0,
        );
        return Number.isFinite(val) ? val : 0;
      };
      const readCurrency = (a: (typeof approvals)[number]): string => {
        const snap = a.snapshot ?? {};
        const c = (snap.currency as string | undefined) ?? currency ?? "SAR";
        return c.toUpperCase();
      };

      const totalZakatApproved = approved.reduce((s, a) => s + readZakat(a), 0);
      const totalZakatPending = pending.reduce((s, a) => s + readZakat(a), 0);
      const avgZakatPerApproval = approved.length > 0 ? totalZakatApproved / approved.length : 0;

      const byCurrency: Record<string, number> = {};
      approved.forEach((a) => {
        const c = readCurrency(a);
        byCurrency[c] = (byCurrency[c] ?? 0) + readZakat(a);
      });

      const cycleTimes = approved
        .filter((a) => a.decided_at)
        .map(
          (a) =>
            (new Date(a.decided_at!).getTime() - new Date(a.submitted_at).getTime()) /
            (1000 * 60 * 60),
        )
        .filter((h) => Number.isFinite(h) && h >= 0);
      const avgCycleHours =
        cycleTimes.length > 0 ? cycleTimes.reduce((s, h) => s + h, 0) / cycleTimes.length : null;

      const lastActivity =
        approvals
          .map((a) => a.decided_at ?? a.submitted_at)
          .filter(Boolean)
          .sort()
          .pop() ?? null;

      // ===== Compliance =====
      const attachments = (attachmentsRes.data ?? []) as Array<{ status: string }>;
      const attachmentsApproved = attachments.filter((a) => a.status === "approved").length;
      const attachmentsRejected = attachments.filter((a) => a.status === "rejected").length;
      const attachmentsPending = attachments.filter(
        (a) => a.status === "pending" || a.status === "draft",
      ).length;

      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).getTime();
      const attestations = (attestationsRes.data ?? []) as Array<{ issued_at: string }>;
      const attestationsValid = attestations.filter(
        (a) => new Date(a.issued_at).getTime() >= oneYearAgo,
      ).length;

      const hawlRemindersOpen = (notificationsRes.data ?? []).length;

      setKpis({
        members: members.length,
        membersByRole,
        activeLast30d,
        approvalsPending: pending.length,
        approvalsApproved: approved.length,
        approvalsRejected: rejected.length,
        avgCycleHours,
        lastActivity,
        totalZakatApproved,
        totalZakatPending,
        avgZakatPerApproval,
        byCurrency,
        attachmentsTotal: attachments.length,
        attachmentsApproved,
        attachmentsRejected,
        attachmentsPending,
        attestationsValid,
        hawlRemindersOpen,
      });
      setRecent(
        approvals.slice(0, 6).map((a) => ({
          id: a.id,
          title: a.title,
          status: a.status,
          when: a.decided_at ?? a.submitted_at,
        })),
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, currency]);

  const fmtMoney = useMemo(
    () =>
      new Intl.NumberFormat("ar", {
        style: "currency",
        currency: currency || "SAR",
        maximumFractionDigits: 0,
      }),
    [currency],
  );

  const fmtCur = (val: number, cur: string) =>
    new Intl.NumberFormat("ar", {
      style: "currency",
      currency: cur || "SAR",
      maximumFractionDigits: 0,
    }).format(val);

  const fmtHours = (h: number) => {
    if (h < 1) return `${Math.round(h * 60)} د`;
    if (h < 48) return `${h.toFixed(1)} س`;
    return `${(h / 24).toFixed(1)} يوم`;
  };

  if (loading || !kpis) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        جارٍ تحميل نظرة عامّة عن {orgName}…
      </div>
    );
  }

  const attachmentsCompletion =
    kpis.attachmentsTotal > 0
      ? Math.round((kpis.attachmentsApproved / kpis.attachmentsTotal) * 100)
      : 0;

  const totalDecided = kpis.approvalsApproved + kpis.approvalsRejected;
  const approvalRate =
    totalDecided > 0 ? Math.round((kpis.approvalsApproved / totalDecided) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ============ الأعضاء ============ */}
      <section aria-labelledby="kpi-members" className="space-y-3">
        <h3 id="kpi-members" className="text-sm font-semibold flex items-center gap-2">
          <Users className="size-4 text-primary" /> الأعضاء
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground">
                إجمالي الأعضاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.members}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="size-4 text-emerald-600" /> نشطون (30 يوم)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{kpis.activeLast30d}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.members > 0
                  ? `${Math.round((kpis.activeLast30d / kpis.members) * 100)}٪ من الفريق`
                  : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground">
                توزيع الأدوار
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <Badge key={r} variant="outline" className="text-xs">
                    {ROLE_LABEL[r]}: {kpis.membersByRole[r]}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============ التشغيلية ============ */}
      <section aria-labelledby="kpi-ops" className="space-y-3">
        <h3 id="kpi-ops" className="text-sm font-semibold flex items-center gap-2">
          <Activity className="size-4 text-primary" /> التشغيلية
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-4 text-amber-600" /> معلَّقة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{kpis.approvalsPending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" /> معتمَدة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{kpis.approvalsApproved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <XCircle className="size-4 text-destructive" /> مرفوضة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{kpis.approvalsRejected}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <Timer className="size-4 text-primary" /> متوسط الدورة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {kpis.avgCycleHours !== null ? fmtHours(kpis.avgCycleHours) : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">من التقديم للاعتماد</p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground">
              نسبة الاعتماد ({approvalRate}٪)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={approvalRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {kpis.approvalsApproved} معتمَد من {totalDecided} قرار
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ============ المالية ============ */}
      <section aria-labelledby="kpi-fin" className="space-y-3">
        <h3 id="kpi-fin" className="text-sm font-semibold flex items-center gap-2">
          <Wallet className="size-4 text-primary" /> المالية
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="size-4 text-primary" /> إجمالي الزكاة المعتمدة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {fmtMoney.format(kpis.totalZakatApproved)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                من {kpis.approvalsApproved} اعتماد
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-4 text-amber-600" /> قيد الاعتماد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {fmtMoney.format(kpis.totalZakatPending)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.approvalsPending} طلب معلَّق
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="size-4 text-primary" /> متوسط الاعتماد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtMoney.format(kpis.avgZakatPerApproval)}</div>
            </CardContent>
          </Card>
        </div>
        {Object.keys(kpis.byCurrency).length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground">
                التوزيع حسب العملة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {Object.entries(kpis.byCurrency)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cur, amt]) => (
                    <li key={cur} className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {cur}
                      </Badge>
                      <span className="font-medium tabular-nums">{fmtCur(amt, cur)}</span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ============ الامتثال ============ */}
      <section aria-labelledby="kpi-comp" className="space-y-3">
        <h3 id="kpi-comp" className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" /> الامتثال
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <Paperclip className="size-4 text-primary" /> اكتمال المرفقات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attachmentsCompletion}٪</div>
              <Progress value={attachmentsCompletion} className="h-1.5 mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.attachmentsApproved} / {kpis.attachmentsTotal}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-4 text-amber-600" /> مرفقات قيد المراجعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{kpis.attachmentsPending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <FileCheck2 className="size-4 text-emerald-600" /> شهادات شرعية سارية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{kpis.attestationsValid}</div>
              <p className="text-xs text-muted-foreground mt-1">خلال 12 شهر</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-amber-600" /> تنبيهات الحول
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{kpis.hawlRemindersOpen}</div>
              <p className="text-xs text-muted-foreground mt-1">غير مقروءة</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============ آخر نشاط + قائمة ============ */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> آخر نشاط
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {kpis.lastActivity
                ? new Date(kpis.lastActivity).toLocaleString("ar", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "لا يوجد نشاط بعد"}
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="size-4 text-primary" /> أحدث الاعتمادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <Alert>
                <AlertDescription>لا توجد اعتمادات بعد لهذه المؤسسة.</AlertDescription>
              </Alert>
            ) : (
              <ul className="space-y-2">
                {recent.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0 gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant={
                          r.status === "approved"
                            ? "default"
                            : r.status === "rejected"
                              ? "destructive"
                              : "outline"
                        }
                        className="text-xs shrink-0"
                      >
                        {r.status === "approved"
                          ? "معتمَد"
                          : r.status === "rejected"
                            ? "مرفوض"
                            : "معلَّق"}
                      </Badge>
                      <span className="truncate">{r.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(r.when).toLocaleString("ar", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
