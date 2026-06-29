import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listUsersWithRoles, grantRole, revokeRole } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { Shield, UserPlus, UserMinus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: ok } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!ok) throw redirect({ to: "/" });
  },
  component: AdminPage,
});

type Role = "admin" | "moderator" | "user";
const ROLE_LABEL: Record<Role, string> = {
  admin: "مدير",
  moderator: "مشرف/مدقّق",
  user: "مستخدم",
};

function AdminPage() {
  const listFn = useServerFn(listUsersWithRoles);
  const grantFn = useServerFn(grantRole);
  const revokeFn = useServerFn(revokeRole);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => listFn(),
  });

  const grantM = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => grantFn({ data: v }),
    onSuccess: () => { toast.success("تم منح الدور"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const revokeM = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => revokeFn({ data: v }),
    onSuccess: () => { toast.success("تم سحب الدور"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div dir="rtl" className="container mx-auto max-w-6xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">لوحة الإدارة — إدارة الأدوار</h1>
            <p className="text-sm text-muted-foreground">منح وسحب صلاحيات RBAC (مدير، مدقّق، مستخدم).</p>
          </div>
        </div>
        <Link to="/audit-review"><Button variant="outline">مراجعة الاعتمادات</Button></Link>
      </div>

      <Card>
        <CardHeader><CardTitle>المستخدمون</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">جارٍ التحميل…</p> :
            !data?.length ? <p className="text-sm text-muted-foreground">لا يوجد مستخدمون.</p> :
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-right border-b">
                  <tr>
                    <th className="py-2 px-2">البريد</th>
                    <th className="py-2 px-2">الأدوار</th>
                    <th className="py-2 px-2">آخر دخول</th>
                    <th className="py-2 px-2">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((u) => (
                    <UserRow key={u.id} user={u}
                      onGrant={(role) => grantM.mutate({ userId: u.id, role })}
                      onRevoke={(role) => revokeM.mutate({ userId: u.id, role })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          }
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        كل منح/سحب يُسجَّل في <code>sharia_audit_log</code> مع بصمة المستخدم والدور لأغراض التدقيق.
      </p>
    </div>
  );
}

function UserRow({ user, onGrant, onRevoke }: {
  user: { id: string; email: string; roles: Role[]; last_sign_in_at: string | null };
  onGrant: (r: Role) => void; onRevoke: (r: Role) => void;
}) {
  const [pick, setPick] = useState<Role>("user");
  return (
    <tr className="border-b">
      <td className="py-2 px-2 font-mono text-xs">{user.email}</td>
      <td className="py-2 px-2">
        <div className="flex gap-1 flex-wrap">
          {user.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
          {user.roles.map((r) => (
            <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="gap-1">
              {ROLE_LABEL[r]}
              <button onClick={() => onRevoke(r)} className="opacity-60 hover:opacity-100" title="سحب"><UserMinus className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      </td>
      <td className="py-2 px-2 text-xs">
        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("ar-EG") : "—"}
      </td>
      <td className="py-2 px-2">
        <div className="flex items-center gap-2">
          <Select value={pick} onValueChange={(v) => setPick(v as Role)}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">مدير</SelectItem>
              <SelectItem value="moderator">مدقّق</SelectItem>
              <SelectItem value="user">مستخدم</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => onGrant(pick)} className="gap-1">
            <UserPlus className="h-3 w-3" /> منح
          </Button>
        </div>
      </td>
    </tr>
  );
}
