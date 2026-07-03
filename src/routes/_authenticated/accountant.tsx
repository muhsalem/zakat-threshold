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
import { fmt } from "@/lib/zakat";
import {
  loadClients, saveClients, wealthOf, zakatOf, complianceCheck, complianceScore,
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

  useEffect(() => { setClients(loadClients()); }, []);

  const persist = (next: Client[]) => { setClients(next); saveClients(next); };

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
  const bulkRecalculate = () => {
    if (selectedClients.length === 0) return toast.error("اختر عملاء أولاً");
    let total = 0;
    const next = clients.map((c) => {
      if (!selected.has(c.id)) return c;
      const amount = zakatOf(c);
      total += amount;
      return {
        ...c,
        lastCalcAt: new Date().toISOString(),
        lastCalcAmount: amount,
        status: "review" as ClientStatus,
        history: [...c.history, { at: new Date().toISOString(), action: "إعادة احتساب جماعي", amount }],
      };
    });
    persist(next);
    toast.success(`تم إعادة الحساب لـ ${selectedClients.length} عميل`, {
      description: `إجمالي الزكاة: ${fmt(total)} ر.س`,
    });
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

  const bulkStatus = (status: ClientStatus) => {
    if (selectedClients.length === 0) return toast.error("اختر عملاء أولاً");
    const next = clients.map((c) => selected.has(c.id) ? {
      ...c, status,
      history: [...c.history, { at: new Date().toISOString(), action: `تغيير الحالة إلى ${STATUS_LABELS[status]}` }],
    } : c);
    persist(next);
    toast.success(`تم تحديث حالة ${selectedClients.length} عميل`);
  };

  const bulkDelete = () => {
    if (selectedClients.length === 0) return;
    if (!confirm(`حذف ${selectedClients.length} عميل؟`)) return;
    persist(clients.filter((c) => !selected.has(c.id)));
    setSelected(new Set());
    toast.success("تم الحذف");
  };

  const uniqueCountries = Array.from(new Set(clients.map((c) => c.country)));
  const uniqueYears = Array.from(new Set(clients.map((c) => c.fiscalYear))).sort((a, b) => b - a);

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
          <Button size="sm" onClick={() => addClientPrompt(clients, persist)} className="gap-1"><Plus className="h-4 w-4" /> إضافة</Button>
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
        البيانات تُحفظ محلياً في متصفحك (localStorage) للتجربة السريعة — للاستخدام الإنتاجي اربط بوابة المحاسب بجداول Lovable Cloud.
      </p>
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

function addClientPrompt(clients: Client[], persist: (n: Client[]) => void) {
  const name = prompt("اسم العميل");
  if (!name) return;
  const kind = (prompt("النوع (individual / company / institution)", "individual") || "individual") as ClientKind;
  const country = prompt("رمز الدولة (SA / EG / AE ...)", "SA") || "SA";
  const madhab = (prompt("المذهب (hanafi / maliki / shafii / hanbali / mixed)", "mixed") || "mixed") as Madhab;
  persist([...clients, {
    id: crypto.randomUUID(), name, kind, currency: "SAR", country, madhab,
    fiscalYear: new Date().getFullYear(), status: "new",
    hawlDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    nisab: 24000,
    breakdown: { cash: 0, gold: 0, investments: 0, inventory: 0, receivables: 0, debts: 0 },
    history: [{ at: new Date().toISOString(), action: "أنشأ العميل يدوياً" }],
    createdVia: "manual",
  }]);
  toast.success("تمت الإضافة");
}
