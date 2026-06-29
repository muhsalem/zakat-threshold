import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listPendingApprovals, decideApproval } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit-review")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const [{ data: isAdmin }, { data: isMod }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: data.user.id, _role: "moderator" }),
    ]);
    if (!isAdmin && !isMod) throw redirect({ to: "/" });
  },
  component: AuditReviewPage,
});

function AuditReviewPage() {
  const listFn = useServerFn(listPendingApprovals);
  const decideFn = useServerFn(decideApproval);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: () => listFn(),
  });
  const mut = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rejected"; note?: string }) => decideFn({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.decision === "approved" ? "تم الاعتماد" : "تم الرفض");
      qc.invalidateQueries({ queryKey: ["approvals", "pending"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div dir="rtl" className="container mx-auto max-w-5xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">مراجعة اعتماد الزكاة</h1>
          <p className="text-sm text-muted-foreground">طلبات اعتماد تقارير الزكاة المعلّقة (مرحلة maker→checker وفق AAOIFI GS-1).</p>
        </div>
      </div>

      {isLoading ? <p className="text-sm">جارٍ التحميل…</p> :
        !data?.rows.length ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">لا توجد طلبات معلّقة.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {data.rows.map((r: any) => (
              <ApprovalRow key={r.id} row={r} onDecide={(decision, note) => mut.mutate({ id: r.id, decision, note })} pending={mut.isPending} />
            ))}
          </div>
        )
      }
    </div>
  );
}

function ApprovalRow({ row, onDecide, pending }: {
  row: any; onDecide: (d: "approved" | "rejected", note: string) => void; pending: boolean;
}) {
  const [note, setNote] = useState("");
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">{row.title || "تقرير زكاة"}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            تاريخ التقديم: {row.submitted_at ? new Date(row.submitted_at).toLocaleString("ar-EG") : "—"}
            {row.fingerprint ? ` · بصمة: ${String(row.fingerprint).slice(0, 16)}…` : ""}
          </p>
        </div>
        <Badge variant="outline">{row.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="ملاحظات المدقّق (اختياري) — تُحفظ مع القرار في سجل التدقيق."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="destructive" size="sm" disabled={pending} onClick={() => onDecide("rejected", note)} className="gap-1">
            <XCircle className="h-4 w-4" /> رفض
          </Button>
          <Button size="sm" disabled={pending} onClick={() => onDecide("approved", note)} className="gap-1">
            <CheckCircle2 className="h-4 w-4" /> اعتماد
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
