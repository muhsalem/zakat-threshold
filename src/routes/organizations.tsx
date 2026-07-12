import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Users,
  ShieldCheck,
  FileCheck2,
  Download,
  Plus,
  ArrowRight,
  LayoutDashboard,
  ScrollText,
} from "lucide-react";
import { OrgOverviewPanel } from "@/components/organizations/OrgOverviewPanel";
import { OrgAuditLogPanel } from "@/components/organizations/OrgAuditLogPanel";
import { ApprovalAttachments } from "@/components/attachments/ApprovalAttachments";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { toInlineXbrlHtml, toXbrlInstance, downloadFile, type XbrlFact } from "@/lib/xbrl";

export const Route = createFileRoute("/organizations")({
  head: () => ({
    meta: [
      { title: "المؤسسات والشركات — وضع متعدد المستأجرين" },
      {
        name: "description",
        content:
          "إدارة مؤسسات الزكاة، الأدوار، سير عمل الإعداد والاعتماد (Maker-Checker)، وتصدير iXBRL/XBRL.",
      },
      { property: "og:title", content: "منصّة الزكاة للمؤسسات — Maker/Checker وتقارير iXBRL" },
      { property: "og:description", content: "بيئة متعدّدة المستأجرين لإدارة مؤسسات الزكاة: أدوار متكاملة، سير عمل اعتماد، وتصدير معايير." },
      { property: "og:url", content: "/organizations" },
    ],
    links: [{ rel: "canonical", href: "/organizations" }],
  }),
  component: OrgsPage,
});

type OrgRole = "owner" | "admin" | "maker" | "checker" | "auditor" | "viewer";
type ApprovalStatus = "pending" | "approved" | "rejected";

interface Org {
  id: string;
  name: string;
  legal_name: string | null;
  registration_no: string | null;
  country: string | null;
  currency: string;
  sector: string | null;
}

interface MembershipRow {
  organization_id: string;
  role: OrgRole;
  organizations: Org;
}

interface Member {
  id: string;
  user_id: string;
  role: OrgRole;
}

interface Approval {
  id: string;
  organization_id: string;
  title: string;
  status: ApprovalStatus;
  maker_id: string;
  checker_id: string | null;
  checker_note: string | null;
  submitted_at: string;
  decided_at: string | null;
  snapshot: Record<string, unknown>;
}

const ROLE_LABEL: Record<OrgRole, string> = {
  owner: "مالك",
  admin: "مدير",
  maker: "مُعِدّ",
  checker: "مراجع",
  auditor: "مدقق",
  viewer: "مشاهد",
};

function OrgsPage() {
  const { user, loading } = useAuth();
  const [orgs, setOrgs] = useState<Array<{ org: Org; role: OrgRole }>>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(*)")
        .eq("user_id", user.id);
      if (error) {
        toast.error("تعذّر تحميل المؤسسات");
        return;
      }
      const rows = (data ?? []) as unknown as MembershipRow[];
      const mapped = rows
        .filter((r) => r.organizations)
        .map((r) => ({ org: r.organizations, role: r.role }));
      setOrgs(mapped);
      if (mapped.length && !activeOrgId) setActiveOrgId(mapped[0].org.id);
    })();
  }, [user, refreshKey]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">جارٍ التحميل…</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5" /> المؤسسات والشركات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                سجّل الدخول للوصول إلى وضع المؤسسات متعدد المستأجرين وسير عمل الإعداد والاعتماد.
              </p>
              <Link to="/auth">
                <Button>
                  تسجيل الدخول <ArrowRight className="size-4 ms-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeRole = orgs.find((o) => o.org.id === activeOrgId)?.role;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="size-6 text-primary" /> المؤسسات والشركات
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              إدارة الشركات، الأدوار، وسير عمل Maker-Checker للزكاة المؤسسية.
            </p>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm">
              العودة للحاسبة
            </Button>
          </Link>
        </div>

        <CreateOrgCard onCreated={() => setRefreshKey((k) => k + 1)} userId={user.id} />

        {orgs.length === 0 ? (
          <Alert>
            <AlertDescription>لا توجد لديك مؤسسات بعد. أنشئ مؤسستك الأولى أعلاه.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <Label className="text-sm">المؤسسة النشطة:</Label>
              <Select value={activeOrgId} onValueChange={setActiveOrgId}>
                <SelectTrigger className="w-72">
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
              {activeRole && <Badge variant="secondary">{ROLE_LABEL[activeRole]}</Badge>}
            </div>

            {activeOrgId && (
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">
                    <LayoutDashboard className="size-4 me-1" /> نظرة عامّة
                  </TabsTrigger>
                  <TabsTrigger value="members">
                    <Users className="size-4 me-1" /> الأعضاء
                  </TabsTrigger>
                  <TabsTrigger value="approvals">
                    <ShieldCheck className="size-4 me-1" /> الاعتمادات
                  </TabsTrigger>
                  <TabsTrigger value="export">
                    <Download className="size-4 me-1" /> تصدير XBRL
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-4">
                  <OrgOverviewPanel
                    orgId={activeOrgId}
                    orgName={orgs.find((o) => o.org.id === activeOrgId)!.org.name}
                    currency={orgs.find((o) => o.org.id === activeOrgId)!.org.currency}
                  />
                </TabsContent>
                <TabsContent value="members" className="mt-4">
                  <MembersPanel
                    orgId={activeOrgId}
                    canManage={activeRole === "owner" || activeRole === "admin"}
                  />
                </TabsContent>
                <TabsContent value="approvals" className="mt-4">
                  <ApprovalsPanel
                    orgId={activeOrgId}
                    role={activeRole!}
                    userId={user.id}
                    org={orgs.find((o) => o.org.id === activeOrgId)!.org}
                  />
                </TabsContent>
                <TabsContent value="export" className="mt-4">
                  <XbrlPanel org={orgs.find((o) => o.org.id === activeOrgId)!.org} />
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CreateOrgCard({ onCreated, userId }: { onCreated: () => void; userId: string }) {
  const [name, setName] = useState("");
  const [legal, setLegal] = useState("");
  const [reg, setReg] = useState("");
  const [country, setCountry] = useState("SA");
  const [currency, setCurrency] = useState("SAR");
  const [sector, setSector] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("اسم المؤسسة مطلوب");
      return;
    }
    setBusy(true);
    const { data: org, error } = await supabase
      .from("organizations")
      .insert({
        name: name.trim(),
        legal_name: legal || null,
        registration_no: reg || null,
        country,
        currency,
        sector: sector || null,
        created_by: userId,
      })
      .select()
      .single();
    if (error || !org) {
      toast.error(error?.message ?? "تعذّر الإنشاء");
      setBusy(false);
      return;
    }
    const { error: memErr } = await supabase
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: userId, role: "owner" });
    if (memErr) {
      toast.error(memErr.message);
      setBusy(false);
      return;
    }
    toast.success("تم إنشاء المؤسسة وتعيينك مالكاً");
    setName("");
    setLegal("");
    setReg("");
    setSector("");
    setOpen(false);
    setBusy(false);
    onCreated();
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Plus className="size-4" /> إنشاء مؤسسة جديدة
          </span>
          <span className="text-xs text-muted-foreground">{open ? "إخفاء" : "إظهار"}</span>
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>اسم المؤسسة *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>الاسم النظامي</Label>
            <Input value={legal} onChange={(e) => setLegal(e.target.value)} />
          </div>
          <div>
            <Label>رقم السجل التجاري</Label>
            <Input value={reg} onChange={(e) => setReg(e.target.value)} />
          </div>
          <div>
            <Label>الدولة</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={3} />
          </div>
          <div>
            <Label>العملة</Label>
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={4}
            />
          </div>
          <div>
            <Label>القطاع</Label>
            <Input
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="تجارة / صناعة / خدمات…"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={submit} disabled={busy}>
              {busy ? "جارٍ…" : "إنشاء المؤسسة"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function MembersPanel({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("maker");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("id, user_id, role")
        .eq("organization_id", orgId);
      setMembers((data ?? []) as Member[]);
    })();
  }, [orgId, refresh]);

  const addMember = async () => {
    if (!email.trim()) return;
    setBusy(true);
    // Look up profile by display_name fallback: we search profiles by user_id from email is unavailable client-side.
    // For now, allow adding by user_id (UUID). Email-based invite would need an Edge invite flow.
    const id = email.trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      toast.error("في النسخة الحالية أدخل معرّف المستخدم (UUID). إضافة الدعوات بالبريد قريباً.");
      setBusy(false);
      return;
    }
    const { error } = await supabase
      .from("organization_members")
      .insert({ organization_id: orgId, user_id: id, role });
    if (error) toast.error(error.message);
    else {
      toast.success("تمت الإضافة");
      setEmail("");
      setRefresh((r) => r + 1);
    }
    setBusy(false);
  };

  const updateRole = async (memberId: string, newRole: OrgRole) => {
    const { error } = await supabase
      .from("organization_members")
      .update({ role: newRole })
      .eq("id", memberId);
    if (error) toast.error(error.message);
    else {
      toast.success("تم التحديث");
      setRefresh((r) => r + 1);
    }
  };

  const remove = async (memberId: string) => {
    const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
    if (error) toast.error(error.message);
    else {
      toast.success("تمت الإزالة");
      setRefresh((r) => r + 1);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">أعضاء المؤسسة ({members.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="grid md:grid-cols-[1fr_180px_auto] gap-2 items-end p-3 rounded border bg-muted/30">
            <div>
              <Label>معرّف المستخدم (UUID)</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                dir="ltr"
              />
            </div>
            <div>
              <Label>الدور</Label>
              <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["admin", "maker", "checker", "auditor", "viewer"] as OrgRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addMember} disabled={busy}>
              إضافة
            </Button>
          </div>
        )}
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-2 rounded border">
              <code className="text-xs">{m.user_id}</code>
              <div className="flex items-center gap-2">
                {canManage && m.role !== "owner" ? (
                  <Select value={m.role} onValueChange={(v) => updateRole(m.id, v as OrgRole)}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["admin", "maker", "checker", "auditor", "viewer"] as OrgRole[]).map(
                        (r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge>{ROLE_LABEL[m.role]}</Badge>
                )}
                {canManage && m.role !== "owner" && (
                  <Button size="sm" variant="ghost" onClick={() => remove(m.id)}>
                    حذف
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalsPanel({
  orgId,
  role,
  userId,
  org,
}: {
  orgId: string;
  role: OrgRole;
  userId: string;
  org: Org;
}) {
  const [items, setItems] = useState<Approval[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [base, setBase] = useState("");
  const [note, setNote] = useState("");

  const isMaker = role === "maker" || role === "admin" || role === "owner";
  const isChecker = role === "checker" || role === "admin" || role === "owner";

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("zakat_approvals")
        .select("*")
        .eq("organization_id", orgId)
        .order("submitted_at", { ascending: false });
      setItems((data ?? []) as Approval[]);
    })();
  }, [orgId, refresh]);

  const submit = async () => {
    if (!title.trim() || !amount) {
      toast.error("العنوان والمبلغ مطلوبان");
      return;
    }
    const snapshot = {
      title,
      currency: org.currency,
      zakat_base: Number(base) || 0,
      zakat_due: Number(amount),
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("zakat_approvals").insert({
      organization_id: orgId,
      title: title.trim(),
      snapshot,
      maker_id: userId,
      status: "pending",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("تم رفع الطلب للمراجعة");
      setTitle("");
      setAmount("");
      setBase("");
      setRefresh((r) => r + 1);
    }
  };

  const decide = async (id: string, status: ApprovalStatus) => {
    const { error } = await supabase
      .from("zakat_approvals")
      .update({
        status,
        checker_id: userId,
        checker_note: note || null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(status === "approved" ? "تم الاعتماد" : "تم الرفض");
      setNote("");
      setRefresh((r) => r + 1);
    }
  };

  return (
    <div className="space-y-4">
      {isMaker && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck2 className="size-4" /> رفع طلب اعتماد جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>العنوان (مثل: زكاة 2026 — قسم التجزئة)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>وعاء الزكاة ({org.currency})</Label>
              <Input type="number" value={base} onChange={(e) => setBase(e.target.value)} />
            </div>
            <div>
              <Label>قيمة الزكاة المستحقة ({org.currency})</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={submit}>رفع للمراجعة</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">طلبات الاعتماد ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد طلبات بعد.</p>
          )}
          {items.map((a) => {
            const snap = a.snapshot as {
              zakat_base?: number;
              zakat_due?: number;
              currency?: string;
            };
            return (
              <div key={a.id} className="p-3 rounded border space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      قُدِّم: {new Date(a.submitted_at).toLocaleString("ar")}
                    </div>
                  </div>
                  <Badge
                    variant={
                      a.status === "approved"
                        ? "default"
                        : a.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {a.status === "pending"
                      ? "بانتظار المراجعة"
                      : a.status === "approved"
                        ? "معتمد"
                        : "مرفوض"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    وعاء الزكاة:{" "}
                    <strong>
                      {snap.zakat_base?.toLocaleString()} {snap.currency}
                    </strong>
                  </div>
                  <div>
                    الزكاة المستحقة:{" "}
                    <strong>
                      {snap.zakat_due?.toLocaleString()} {snap.currency}
                    </strong>
                  </div>
                </div>
                {a.checker_note && (
                  <div className="text-xs p-2 rounded bg-muted">
                    ملاحظة المراجع: {a.checker_note}
                  </div>
                )}
                {a.status === "pending" && isChecker && a.maker_id !== userId && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="ملاحظة (اختيارية)…"
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => decide(a.id, "approved")}>
                      اعتماد
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => decide(a.id, "rejected")}
                    >
                      رفض
                    </Button>
                  </div>
                )}
                {a.status === "pending" && a.maker_id === userId && (
                  <Alert>
                    <AlertDescription className="text-xs">
                      لا يمكن للمُعِدّ اعتماد طلبه؛ بانتظار مراجع مستقل (فصل الواجبات).
                    </AlertDescription>
                  </Alert>
                )}
                <div className="pt-2 border-t">
                  <ApprovalAttachments
                    approvalId={a.id}
                    organizationId={orgId}
                    canWrite={isMaker || isChecker}
                    compact
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function XbrlPanel({ org }: { org: Org }) {
  const [zakatBase, setZakatBase] = useState("1000000");
  const [zakatDue, setZakatDue] = useState("25000");
  const [assets, setAssets] = useState("1500000");
  const [liabilities, setLiabilities] = useState("500000");
  const [start, setStart] = useState(new Date().getFullYear() + "-01-01");
  const [end, setEnd] = useState(new Date().getFullYear() + "-12-31");

  const facts = useMemo<XbrlFact[]>(
    () => [
      { concept: "zk:TotalAssets", value: Number(assets) || 0 },
      { concept: "zk:TotalLiabilities", value: Number(liabilities) || 0 },
      { concept: "zk:ZakatBase", value: Number(zakatBase) || 0 },
      { concept: "zk:ZakatDue", value: Number(zakatDue) || 0 },
    ],
    [assets, liabilities, zakatBase, zakatDue],
  );

  const build = () => ({
    entity: { identifier: org.registration_no || org.id, name: org.name },
    period: { startDate: start, endDate: end },
    currency: org.currency,
    facts,
    title: `تقرير زكاة ${org.name} — ${start.slice(0, 4)}`,
  });

  const exportIxbrl = () => {
    const html = toInlineXbrlHtml(build());
    downloadFile(
      `zakat-${org.name}-${start.slice(0, 4)}.ixbrl.html`,
      html,
      "application/xhtml+xml",
    );
  };

  const exportXbrl = () => {
    const xml = toXbrlInstance(build());
    downloadFile(`zakat-${org.name}-${start.slice(0, 4)}.xbrl.xml`, xml, "application/xml");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="size-4" /> تصدير iXBRL / XBRL
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert>
          <AlertDescription className="text-xs">
            تنسيق iXBRL/XBRL معتمد عالمياً للهيئات التنظيمية ولوائح الإفصاح المالي. التصنيف هنا
            مبدئي (نموذج AAOIFI تجريبي).
          </AlertDescription>
        </Alert>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>تاريخ بداية الفترة</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label>تاريخ نهاية الفترة</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div>
            <Label>إجمالي الأصول</Label>
            <Input type="number" value={assets} onChange={(e) => setAssets(e.target.value)} />
          </div>
          <div>
            <Label>إجمالي الخصوم</Label>
            <Input
              type="number"
              value={liabilities}
              onChange={(e) => setLiabilities(e.target.value)}
            />
          </div>
          <div>
            <Label>وعاء الزكاة</Label>
            <Input type="number" value={zakatBase} onChange={(e) => setZakatBase(e.target.value)} />
          </div>
          <div>
            <Label>الزكاة المستحقة</Label>
            <Input type="number" value={zakatDue} onChange={(e) => setZakatDue(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end pt-2">
          <Button variant="outline" onClick={exportIxbrl}>
            <Download className="size-4 me-1" /> تنزيل iXBRL (HTML)
          </Button>
          <Button onClick={exportXbrl}>
            <Download className="size-4 me-1" /> تنزيل XBRL (XML)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
