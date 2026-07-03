import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableFooter } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase, Users, Building2, Search, Plus, TrendingUp, Wallet, Calculator, FileText, AlertTriangle, CheckCircle2, Filter, Landmark, LineChart } from "lucide-react";
import { PricesHistoryPanel } from "@/components/zakat/PricesHistoryPanel";
import { NisabHistory } from "@/components/zakat/NisabHistory";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
const IndividualTab = lazy(() => import("@/components/zakat/IndividualTab").then((m) => ({ default: m.IndividualTab })));
const CompanyTab = lazy(() => import("@/components/zakat/CompanyTab").then((m) => ({ default: m.CompanyTab })));
const FitrCalculator = lazy(() => import("@/components/zakat/FitrCalculator").then((m) => ({ default: m.FitrCalculator })));
import { fmt } from "@/lib/zakat";
import { AccountantDashboard } from "@/components/accountant/AccountantDashboard";

import { supabase } from "@/integrations/supabase/client";
import {
  fetchClients, createClient, updateClient, deleteClients, addHistory,
  wealthOf, zakatOf, complianceCheck, complianceScore,
  COUNTRY_LABELS, MADHAB_LABELS, STATUS_LABELS, KIND_LABELS,
  type Client, type ClientKind, type ClientStatus, type Madhab,
} from "@/lib/accountantStore";

export const Route = createFileRoute("/_authenticated/accountant")({
  head: () => ({
    meta: [
      { title: "بوابة المحاسب — تجميع زكاة الأفراد والشركات" },
      { name: "description", content: "لوحة موحّدة للمحاسبين: إجراءات جماعية، تنبيهات امتثال، فلترة متقدمة، وصفحات تفاصيل لكل عميل." },
      { property: "og:title", content: "بوابة المحاسب — حاسبة الزكاة" },
      { property: "og:description", content: "تجميع بيانات الأفراد والشركات في لوحة واحدة" },
      { property: "og:type", content: "article" },
    ],
  }),
  component: AccountantPortal,
});

function AccountantPortal() {
  // بوابة مقيّدة بدور 'accountant' — تُمنح عبر /a-console بكلمة المرور الرئيسية.
  const [roleChecked, setRoleChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setRoleChecked(true); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: auth.user.id, _role: "accountant" });
      setHasAccess(Boolean(data));
      setRoleChecked(true);
    })();
  }, []);
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({
    kind: "all" as "all" | ClientKind,
    country: "all",
    madhab: "all" as "all" | Madhab,
    fiscalYear: "all",
    status: "all" as "all" | ClientStatus,
    calculated: "all" as "all" | "yes" | "no",
  });

  const reload = async () => {
    try { setClients(await fetchClients()); }
    catch (e) { toast.error("تعذّر تحميل العملاء", { description: (e as Error).message }); }
  };

  useEffect(() => {
    let ownerId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribeRealtime = (uid: string) => {
      if (channel) supabase.removeChannel(channel);
      channel = supabase
        .channel(`accountant_clients:${uid}:${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "accountant_clients", filter: `owner_id=eq.${uid}` },
          () => { void reload(); },
        )
        .subscribe();
    };

    void (async () => {
      const { data } = await supabase.auth.getUser();
      ownerId = data.user?.id ?? null;
      await reload();
      if (ownerId) subscribeRealtime(ownerId);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        const uid = session?.user?.id ?? null;
        if (uid && uid !== ownerId) {
          ownerId = uid;
          subscribeRealtime(uid);
        }
        void reload();
      } else if (event === "SIGNED_OUT") {
        ownerId = null;
        if (channel) { supabase.removeChannel(channel); channel = null; }
        setClients([]);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const rows = useMemo(() => {
    return clients
      .filter((c) => filters.kind === "all" || c.kind === filters.kind)
      .filter((c) => filters.country === "all" || c.country === filters.country)
      .filter((c) => filters.madhab === "all" || c.madhab === filters.madhab)
      .filter((c) => filters.fiscalYear === "all" || String(c.fiscalYear) === filters.fiscalYear)
      .filter((c) => filters.status === "all" || c.status === filters.status)
      .filter((c) => filters.calculated === "all" || (filters.calculated === "yes" ? !!c.lastCalcAt : !c.lastCalcAt))
      .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
      .map((c) => ({
        c,
        wealth: wealthOf(c),
        zakat: zakatOf(c),
        score: complianceScore(c),
        issues: complianceCheck(c),
      }));
  }, [clients, q, filters]);

  const totals = useMemo(() => {
    const ind = rows.filter((r) => r.c.kind === "individual");
    const com = rows.filter((r) => r.c.kind !== "individual");
    return {
      individuals: ind.length,
      companies: com.length,
      wealth: rows.reduce((s, r) => s + r.wealth, 0),
      zakat: rows.reduce((s, r) => s + r.zakat, 0),
      needsAttention: rows.filter((r) => r.issues.some((i) => i.level === "error")).length,
    };
  }, [rows]);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.c.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.c.id)));
  };
  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectedClients = clients.filter((c) => selected.has(c.id));

  // ---- إجراءات جماعية ----
  const bulkRecalculate = async () => {
    if (selectedClients.length === 0) return toast.error("اختر عملاء أولاً");
    let total = 0;
    try {
      for (const c of selectedClients) {
        const amount = zakatOf(c);
        total += amount;
        await updateClient(c.id, {
          lastCalcAt: new Date().toISOString(),
          lastCalcAmount: amount,
          status: "review",
        });
        await addHistory(c.id, { action: "إعادة احتساب جماعي", amount });
      }
      await reload();
      toast.success(`تم إعادة الحساب لـ ${selectedClients.length} عميل`, {
        description: `إجمالي الزكاة: ${fmt(total)} ر.س`,
      });
    } catch (e) { toast.error("تعذّر التنفيذ", { description: (e as Error).message }); }
  };

  const bulkReports = () => {
    if (selectedClients.length === 0) return toast.error("اختر عملاء أولاً");
    const header = ["الاسم", "النوع", "الدولة", "المذهب", "السنة", "الحالة", "الوعاء", "النصاب", "الزكاة", "امتثال %", "تاريخ الحول"];
    const lines = selectedClients.map((c) => [
      c.name, KIND_LABELS[c.kind], COUNTRY_LABELS[c.country] ?? c.country,
      MADHAB_LABELS[c.madhab], c.fiscalYear, STATUS_LABELS[c.status],
      Math.round(wealthOf(c)), c.nisab, Math.round(zakatOf(c)),
      complianceScore(c), c.hawlDate,
    ].join(","));
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `batch-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`تم إنشاء دفعة تقارير لـ ${selectedClients.length} عميل`);
  };

  const bulkStatus = async (status: ClientStatus) => {
    if (selectedClients.length === 0) return toast.error("اختر عملاء أولاً");
    try {
      for (const c of selectedClients) {
        await updateClient(c.id, { status });
        await addHistory(c.id, { action: `تغيير الحالة إلى ${STATUS_LABELS[status]}` });
      }
      await reload();
      toast.success(`تم تحديث حالة ${selectedClients.length} عميل`);
    } catch (e) { toast.error("تعذّر التنفيذ", { description: (e as Error).message }); }
  };

  const bulkDelete = async () => {
    if (selectedClients.length === 0) return;
    if (!confirm(`حذف ${selectedClients.length} عميل؟`)) return;
    try {
      await deleteClients(selectedClients.map((c) => c.id));
      setSelected(new Set());
      await reload();
      toast.success("تم الحذف");
    } catch (e) { toast.error("تعذّر الحذف", { description: (e as Error).message }); }
  };



  const uniqueCountries = Array.from(new Set(clients.map((c) => c.country)));
  const uniqueYears = Array.from(new Set(clients.map((c) => c.fiscalYear))).sort((a, b) => b - a);

  if (!roleChecked) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!hasAccess) {
    return (
      <main className="container mx-auto max-w-md px-4 py-16 text-center" dir="rtl">
        <Alert variant="destructive">
          <AlertDescription>
            هذه البوابة مقيّدة لحسابات المحاسبين المعتمدين فقط. إن كنت تملك كلمة المرور الرئيسية فادخل عبر <Link to="/a-console" className="underline font-medium">البوابة الإدارية</Link>.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8 space-y-6" dir="rtl">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-primary" /> بوابة المحاسب
          </h1>
          <p className="text-muted-foreground text-sm">
            محفظتك الموحّدة: إجراءات جماعية، تنبيهات امتثال، فلترة متقدمة، وتفاصيل لكل عميل.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/client-intake">نافذة العميل التسويقية</Link>
          </Button>
          <Button asChild>
            <Link to="/portal-signin">تسجيل دخول موحّد</Link>
          </Button>
        </div>
      </header>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1.5"><LineChart className="h-3.5 w-3.5" /> لوحة التحكم</TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5"><Users className="h-3.5 w-3.5" /> العملاء والمحفظة</TabsTrigger>
          <TabsTrigger value="saved" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> المحفوظات (تقارير معتمدة)</TabsTrigger>
          <TabsTrigger value="prices" className="gap-1.5"><LineChart className="h-3.5 w-3.5" /> الأنصبة وسجل الأسعار</TabsTrigger>
          <TabsTrigger value="calc" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Calculator className="h-3.5 w-3.5" /> الحاسبة الشاملة</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0"><AccountantDashboard /></TabsContent>
        <TabsContent value="saved" className="mt-0"><SavedRecordsPanel /></TabsContent>


        <TabsContent value="clients" className="space-y-6 mt-0">
      <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={<Users className="h-4 w-4" />} label="أفراد" value={String(totals.individuals)} />
        <Kpi icon={<Building2 className="h-4 w-4" />} label="شركات/مؤسسات" value={String(totals.companies)} />
        <Kpi icon={<Wallet className="h-4 w-4" />} label="إجمالي الأوعية" value={fmt(totals.wealth)} suffix="ر.س" />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="الزكاة المستحقة" value={fmt(totals.zakat)} suffix="ر.س" />
        <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="تحتاج تدخل" value={String(totals.needsAttention)} note="نواقص بيانات" />
      </section>

      {/* فلترة متقدمة */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> فلترة متقدمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <div className="relative col-span-2 md:col-span-2">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)} className="pr-8" />
            </div>
            <FilterSelect label="النوع" value={filters.kind} onChange={(v) => setFilters({ ...filters, kind: v as any })}
              options={[["all", "الكل"], ["individual", "فرد"], ["company", "شركة"], ["institution", "مؤسسة"]]} />
            <FilterSelect label="الدولة" value={filters.country} onChange={(v) => setFilters({ ...filters, country: v })}
              options={[["all", "الكل"], ...uniqueCountries.map((c) => [c, COUNTRY_LABELS[c] ?? c] as [string, string])]} />
            <FilterSelect label="المذهب" value={filters.madhab} onChange={(v) => setFilters({ ...filters, madhab: v as any })}
              options={[["all", "الكل"], ...(Object.entries(MADHAB_LABELS) as [string, string][])]} />
            <FilterSelect label="السنة" value={filters.fiscalYear} onChange={(v) => setFilters({ ...filters, fiscalYear: v })}
              options={[["all", "الكل"], ...uniqueYears.map((y) => [String(y), String(y)] as [string, string])]} />
            <FilterSelect label="الحالة" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v as any })}
              options={[["all", "الكل"], ...(Object.entries(STATUS_LABELS) as [string, string][])]} />
            <FilterSelect label="سبق حسابه؟" value={filters.calculated} onChange={(v) => setFilters({ ...filters, calculated: v as any })}
              options={[["all", "الكل"], ["yes", "نعم"], ["no", "لا"]]} />
          </div>
        </CardContent>
      </Card>

      {/* شريط الإجراءات الجماعية */}
      {selected.size > 0 && (
        <Alert className="border-primary/40 bg-primary/5">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">تم اختيار {selected.size} عميل:</span>
            <Button size="sm" onClick={bulkRecalculate} className="gap-1"><Calculator className="h-3.5 w-3.5" /> إعادة الحساب</Button>
            <Button size="sm" variant="secondary" onClick={bulkReports} className="gap-1"><FileText className="h-3.5 w-3.5" /> دفعة تقارير</Button>
            <Button size="sm" variant="outline" onClick={() => bulkStatus("review")}>وضع في المراجعة</Button>
            <Button size="sm" variant="outline" onClick={() => bulkStatus("completed")}>وسم كمكتمل</Button>
            <Button size="sm" variant="outline" onClick={() => bulkStatus("archived")}>أرشفة</Button>
            <Button size="sm" variant="destructive" onClick={bulkDelete}>حذف</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>إلغاء التحديد</Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> العملاء ({rows.length})</CardTitle>
          <Button size="sm" onClick={() => void addClientPrompt(reload)} className="gap-1"><Plus className="h-4 w-4" /> إضافة</Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="تحديد الكل" />
                  </TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الدولة/المذهب</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-end">الوعاء</TableHead>
                  <TableHead className="text-end">الزكاة</TableHead>
                  <TableHead>امتثال</TableHead>
                  <TableHead>تفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">لا يوجد عملاء مطابقون للفلاتر</TableCell></TableRow>
                )}
                {rows.map(({ c, wealth, zakat, score, issues }) => {
                  const errors = issues.filter((i) => i.level === "error").length;
                  const warns = issues.filter((i) => i.level === "warn").length;
                  return (
                    <TableRow key={c.id} data-state={selected.has(c.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} aria-label={`اختيار ${c.name}`} />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {c.lastCalcAt ? `آخر حساب: ${new Date(c.lastCalcAt).toLocaleDateString("ar")}` : "لم يُحسب بعد"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.kind === "individual" ? "outline" : "secondary"}>{KIND_LABELS[c.kind]}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {COUNTRY_LABELS[c.country] ?? c.country}
                        <div className="text-muted-foreground">{MADHAB_LABELS[c.madhab]} · {c.fiscalYear}</div>
                      </TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-end" dir="ltr">{fmt(wealth)}</TableCell>
                      <TableCell className="text-end font-semibold text-primary" dir="ltr">{wealth >= c.nisab ? fmt(zakat) : "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {errors > 0 ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> :
                            warns > 0 ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> :
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                          <span className="text-xs">{score}%</span>
                        </div>
                        {(errors + warns) > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {errors > 0 && <span className="text-destructive">{errors} خطأ</span>}
                            {errors > 0 && warns > 0 && " · "}
                            {warns > 0 && <span>{warns} تحذير</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/accountant/$clientId" params={{ clientId: c.id }}>فتح</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="font-bold">الإجمالي المعروض</TableCell>
                  <TableCell className="text-end font-bold" dir="ltr">{fmt(totals.wealth)}</TableCell>
                  <TableCell className="text-end font-bold text-primary" dir="ltr">{fmt(totals.zakat)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        بيانات العملاء محفوظة في Lovable Cloud بحماية RLS — لا يراها إلا مالك الحساب.
      </p>
        </TabsContent>

        <TabsContent value="prices" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChart className="h-5 w-5 text-primary" /> قاعدة الأنصبة وسجل أسعار الذهب والفضة
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                مرجع موحّد: قاعدة بيانات الأنصبة السنوية/الشهرية بالعملات المحلية + السجل التاريخي اليومي بالدولار — لاحتساب نصاب زكاة عملائك لأي تاريخ حَول.
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="nisab" className="space-y-3">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="nisab" className="gap-1.5"><Landmark className="h-3.5 w-3.5" /> قاعدة بيانات الأنصبة</TabsTrigger>
                  <TabsTrigger value="daily" className="gap-1.5"><LineChart className="h-3.5 w-3.5" /> السجل اليومي للأسعار</TabsTrigger>
                </TabsList>
                <TabsContent value="nisab" className="mt-0"><NisabHistory /></TabsContent>
                <TabsContent value="daily" className="mt-0"><PricesHistoryPanel compact /></TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calc" className="mt-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-5 w-5 text-primary" /> الحاسبة الشاملة داخل بوابة المحاسب
              </CardTitle>
              <p className="text-xs text-muted-foreground">جميع مسارات الزكاة (أفراد، شركات ومؤسسات، زكاة الفطر) في تبويبات فرعية — بدون مغادرة اللوحة.</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="individual" className="space-y-3">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="individual" className="gap-1.5"><Users className="h-3.5 w-3.5" /> زكاة الأفراد</TabsTrigger>
                  <TabsTrigger value="company" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> زكاة الشركات والمؤسسات</TabsTrigger>
                  <TabsTrigger value="fitr" className="gap-1.5"><Calculator className="h-3.5 w-3.5" /> زكاة الفطر</TabsTrigger>
                </TabsList>
                <Suspense fallback={<div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin ml-2" /> جارٍ التحميل...</div>}>
                  <TabsContent value="individual" className="mt-0"><IndividualTab /></TabsContent>
                  <TabsContent value="company" className="mt-0"><CompanyTab /></TabsContent>
                  <TabsContent value="fitr" className="mt-0"><FitrCalculator /></TabsContent>
                </Suspense>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Kpi({ icon, label, value, suffix, note }: { icon: React.ReactNode; label: string; value: string; suffix?: string; note?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</div>
        <div className="text-2xl font-bold mt-1">{value}{suffix && <span className="text-sm text-muted-foreground ms-1">{suffix}</span>}</div>
        {note && <div className="text-[10px] text-muted-foreground mt-1">{note}</div>}
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => <SelectItem key={v} value={v}>{label}: {l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function StatusBadge({ status }: { status: ClientStatus }) {
  const styles: Record<ClientStatus, string> = {
    new: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    review: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    archived: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={`text-[10px] ${styles[status]}`}>{STATUS_LABELS[status]}</Badge>;
}

async function addClientPrompt(reload: () => Promise<void>) {
  const name = prompt("اسم العميل");
  if (!name) return;
  const kind = (prompt("النوع (individual / company / institution)", "individual") || "individual") as ClientKind;
  const country = prompt("رمز الدولة (SA / EG / AE ...)", "SA") || "SA";
  const madhab = (prompt("المذهب (hanafi / maliki / shafii / hanbali / mixed)", "mixed") || "mixed") as Madhab;
  try {
    await createClient({ name, kind, country, madhab, createdVia: "manual" });
    await reload();
    toast.success("تمت الإضافة");
  } catch (e) {
    toast.error("تعذّرت الإضافة", { description: (e as Error).message });
  }
}


function SavedRecordsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("zakat_records")
        .select("id,record_type,hijri_year,gregorian_date,currency,total_assets,zakat_base,zakat_due,net_due,notes,created_at,user_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) setErr(error.message); else setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    !query || r.id.includes(query) || (r.hijri_year ?? "").includes(query) || (r.notes ?? "").includes(query)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-primary" /> نماذج الحاسبة المحفوظة
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          كل عميل يحفظ حسبته من داخل الحاسبة تظهر هنا فوراً — اضغط "تقرير معتمد" لفتح المستند القابل للطباعة مع بصمة التدقيق الشرعي.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="بحث بالرقم أو السنة أو الملاحظات..." value={query} onChange={(e) => setQuery(e.target.value)} />
        {loading && <div className="text-center text-muted-foreground py-8">جارٍ التحميل...</div>}
        {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
        {!loading && !err && (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>السنة</TableHead>
                  <TableHead>العملة</TableHead>
                  <TableHead className="text-end">الوعاء</TableHead>
                  <TableHead className="text-end">الزكاة</TableHead>
                  <TableHead className="text-end">الصافي</TableHead>
                  <TableHead>إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا توجد نماذج محفوظة بعد.</TableCell></TableRow>
                )}
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell><Badge variant="outline">{r.record_type === "individual" ? "فرد" : "شركة"}</Badge></TableCell>
                    <TableCell className="text-xs">{r.hijri_year || "—"}</TableCell>
                    <TableCell className="text-xs">{r.currency}</TableCell>
                    <TableCell className="text-end" dir="ltr">{fmt(Number(r.total_assets))}</TableCell>
                    <TableCell className="text-end font-semibold text-primary" dir="ltr">{fmt(Number(r.zakat_due))}</TableCell>
                    <TableCell className="text-end" dir="ltr">{fmt(Number(r.net_due))}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" className="gap-1">
                        <Link to="/certified-report/$recordId" params={{ recordId: r.id }}>
                          <FileText className="h-3.5 w-3.5" /> تقرير معتمد
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CalcModeGate() {
  const [mode, setMode] = useState<"individual" | "company" | "fitr" | null>(null);
  if (!mode) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-bold mb-1">اختر نوع الحساب</h3>
          <p className="text-xs text-muted-foreground">حدّد المسار قبل عرض الأسئلة لتفادي الحقول غير ذات الصلة.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <GateCard color="from-primary/15 to-primary/5 border-primary/30" icon={<Users className="h-6 w-6 text-primary" />}
            title="زكاة الأفراد" desc="مال، ذهب، فضة، راتب، استثمارات." onClick={() => setMode("individual")} />
          <GateCard color="from-emerald-500/15 to-emerald-500/5 border-emerald-500/30" icon={<Building2 className="h-6 w-6 text-emerald-600" />}
            title="زكاة الشركات والمؤسسات" desc="عروض التجارة، المخزون، الذمم، الالتزامات." onClick={() => setMode("company")} />
          <GateCard color="from-amber-500/15 to-amber-500/5 border-amber-500/30" icon={<Calculator className="h-6 w-6 text-amber-600" />}
            title="زكاة الفطر" desc="حسب عدد أفراد الأسرة قبيل عيد الفطر." onClick={() => setMode("fitr")} />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <button onClick={() => setMode(null)} className="text-sm text-primary hover:underline">← تغيير نوع الحساب</button>
      <Suspense fallback={<div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin ml-2" /> جارٍ التحميل...</div>}>
        {mode === "individual" && <IndividualTab />}
        {mode === "company" && <CompanyTab />}
        {mode === "fitr" && <FitrCalculator />}
      </Suspense>
    </div>
  );
}

function GateCard({ color, icon, title, desc, onClick }: { color: string; icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`text-right rounded-xl border-2 bg-gradient-to-br ${color} p-4 hover:shadow-md hover:-translate-y-0.5 transition-all`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-10 w-10 rounded-lg bg-background/70 flex items-center justify-center">{icon}</div>
        <h4 className="font-bold">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      <div className="mt-2 text-xs font-semibold text-primary">ابدأ ←</div>
    </button>
  );
}


