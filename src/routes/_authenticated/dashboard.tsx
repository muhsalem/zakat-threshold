import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Building2, Landmark, Loader2, ArrowLeft } from "lucide-react";
import { IndividualWizard } from "@/components/wizards/IndividualWizard";
import { CompanyWizard } from "@/components/wizards/CompanyWizard";
import { InstitutionWizard } from "@/components/wizards/InstitutionWizard";
import { RestoreLastDraftBanner } from "@/components/wizards/RestoreLastDraftBanner";

type AccountType = "individual" | "company" | "institution" | "admin";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحتي — حاسبة الزكاة" },
      { name: "description", content: "لوحة موجّهة لحساب الزكاة حسب نوع حسابك (فرد/شركة/مؤسسة)." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<AccountType | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }

      // Accountants/Admins get the full workspace, not a wizard.
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id);
      const roleList = ((roles as any[]) ?? []).map((r) => r.role);
      if (roleList.includes("accountant") || roleList.includes("admin")) {
        navigate({ to: "/accountant" });
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("account_type, display_name")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      setType(((data as any)?.account_type as AccountType) ?? "individual");
      setDisplayName((data as any)?.display_name ?? auth.user.email ?? "");
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const label =
    type === "admin"
      ? "مدير"
      : type === "company"
        ? "شركة"
        : type === "institution"
          ? "مؤسسة"
          : "فرد";
  const Icon =
    type === "admin"
      ? Landmark
      : type === "company"
        ? Building2
        : type === "institution"
          ? Landmark
          : User;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">مرحباً {displayName}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  نوع الحساب: {label}
                </Badge>
                {type !== "individual" && (
                  <Button asChild size="sm" variant="ghost" className="h-6 text-xs">
                    <Link to="/">
                      الوضع المتقدم <ArrowLeft className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
                <Button asChild size="sm" variant="ghost" className="h-6 text-xs">
                  <Link to="/drafts">المسودات والسجل</Link>
                </Button>

              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            هذه لوحة موجّهة خطوة‑بخطوة تجمع أهم مدخلاتك وتصدر تقريراً جاهزاً. للوصول إلى كل
            التبويبات التفصيلية استخدم زر "الوضع المتقدم" أعلاه.
          </p>
        </CardContent>
      </Card>

      {type === "individual" && (
        <>
          <RestoreLastDraftBanner kind="individual" />
          <IndividualWizard />
        </>
      )}
      {type === "company" && (
        <>
          <RestoreLastDraftBanner kind="company" />
          <CompanyWizard />
        </>
      )}
      {type === "institution" && (
        <>
          <RestoreLastDraftBanner kind="institution" />
          <InstitutionWizard />
        </>
      )}
    </div>
  );
}
