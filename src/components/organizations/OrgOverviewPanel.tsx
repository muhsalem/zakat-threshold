import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Activity,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  orgId: string;
  orgName: string;
  currency: string;
}

interface Kpis {
  members: number;
  approvalsPending: number;
  approvalsApproved: number;
  approvalsRejected: number;
  totalZakat: number;
  lastActivity: string | null;
}

interface AuditRow {
  id: string;
  action: string;
  created_at: string;
  actor_id: string | null;
}

export function OrgOverviewPanel({ orgId, orgName, currency }: Props) {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [recent, setRecent] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);
      const [membersRes, approvalsRes, auditRes] = await Promise.all([
        supabase
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId),
        supabase
          .from("zakat_approvals")
          .select("id, status, snapshot, decided_at, submitted_at")
          .eq("organization_id", orgId),
        supabase
          .from("sharia_audit_log")
          .select("id, action, created_at, actor_id")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const approvals = (approvalsRes.data ?? []) as Array<{
        status: string;
        snapshot: Record<string, unknown> | null;
        decided_at: string | null;
        submitted_at: string;
      }>;

      const pending = approvals.filter((a) => a.status === "pending").length;
      const approved = approvals.filter((a) => a.status === "approved");
      const rejected = approvals.filter((a) => a.status === "rejected").length;

      const totalZakat = approved.reduce((sum, a) => {
        const snap = a.snapshot as Record<string, unknown> | null;
        const val = Number(
          (snap?.zakat_due as number | string | undefined) ??
            (snap?.total_zakat as number | string | undefined) ??
            0,
        );
        return sum + (Number.isFinite(val) ? val : 0);
      }, 0);

      const lastActivity =
        approvals
          .map((a) => a.decided_at ?? a.submitted_at)
          .filter(Boolean)
          .sort()
          .pop() ?? null;

      setKpis({
        members: membersRes.count ?? 0,
        approvalsPending: pending,
        approvalsApproved: approved.length,
        approvalsRejected: rejected,
        totalZakat,
        lastActivity,
      });
      setRecent((auditRes.data ?? []) as AuditRow[]);
      setLoading(false);
    })();
  }, [orgId]);

  const fmtMoney = useMemo(
    () =>
      new Intl.NumberFormat("ar", {
        style: "currency",
        currency: currency || "SAR",
        maximumFractionDigits: 0,
      }),
    [currency],
  );

  if (loading || !kpis) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        جارٍ تحميل نظرة عامّة عن {orgName}…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
              <Users className="size-4" /> الأعضاء
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.members}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-4 text-amber-600" /> اعتمادات معلّقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {kpis.approvalsPending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600" /> معتمَدة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {kpis.approvalsApproved}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
              <XCircle className="size-4 text-destructive" /> مرفوضة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {kpis.approvalsRejected}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              إجمالي الزكاة المعتمدة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {fmtMoney.format(kpis.totalZakat)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              من {kpis.approvalsApproved} اعتماد
            </p>
          </CardContent>
        </Card>

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="size-4 text-primary" /> أحدث سجلّات التدقيق
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <Alert>
              <AlertDescription>
                لا توجد سجلّات تدقيق بعد لهذه المؤسسة.
              </AlertDescription>
            </Alert>
          ) : (
            <ul className="space-y-2">
              {recent.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0"
                >
                  <Badge variant="outline" className="text-xs">
                    {r.action}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("ar", {
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
    </div>
  );
}
