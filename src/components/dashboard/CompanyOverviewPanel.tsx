import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2, ArrowLeft, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OrgOverviewPanel } from "@/components/organizations/OrgOverviewPanel";

interface Org {
  id: string;
  name: string;
  currency: string;
}

type Role = "owner" | "admin" | "maker" | "checker" | "auditor" | "viewer";

const ROLE_LABEL: Record<Role, string> = {
  owner: "مالك",
  admin: "مدير",
  maker: "مُعِدّ",
  checker: "مراجع",
  auditor: "مدقق",
  viewer: "مشاهد",
};

export function CompanyOverviewPanel() {
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Array<{ org: Org; role: Role }>>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(id, name, currency)")
        .eq("user_id", auth.user.id);
      const rows = (
        (data ?? []) as unknown as Array<{
          role: Role;
          organizations: Org | null;
        }>
      )
        .filter((r) => r.organizations)
        .map((r) => ({ org: r.organizations as Org, role: r.role }));
      setOrgs(rows);
      if (rows.length) setActiveId(rows[0].org.id);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (orgs.length === 0) {
    return (
      <Card className="mb-4 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            بوابة المؤسسة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertDescription>
              لم يتم ربط حسابك بأي مؤسسة بعد. أنشئ مؤسستك لتفعيل مؤشرات الأداء (KPIs)، اعتمادات
              Maker-Checker، وتقارير iXBRL.
            </AlertDescription>
          </Alert>
          <Button asChild size="sm">
            <Link to="/organizations">
              <Plus className="h-3 w-3 ms-1" /> إنشاء مؤسسة
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const active = orgs.find((o) => o.org.id === activeId) ?? orgs[0];

  return (
    <div className="mb-4 space-y-3">
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              بوابة المؤسسة
              <Badge variant="secondary" className="text-[11px]">
                {ROLE_LABEL[active.role]}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {orgs.length > 1 && (
                <Select value={activeId} onValueChange={setActiveId}>
                  <SelectTrigger className="w-56 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => (
                      <SelectItem key={o.org.id} value={o.org.id}>
                        {o.org.name} — {ROLE_LABEL[o.role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                <Link to="/organizations">
                  إدارة المؤسسة <ArrowLeft className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      <OrgOverviewPanel
        orgId={active.org.id}
        orgName={active.org.name}
        currency={active.org.currency}
      />
    </div>
  );
}
