import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableFooter,
} from "@/components/ui/table";
import {
  Briefcase, Users, Building2, Download, Search, Plus, TrendingUp, Wallet, Landmark,
} from "lucide-react";
import { ZAKAT_RATE, fmt } from "@/lib/zakat";

export const Route = createFileRoute("/_authenticated/accountant")({
  head: () => ({
    meta: [
      { title: "بوابة المحاسب — تجميع زكاة الأفراد والشركات" },
      { name: "description", content: "لوحة موحّدة للمحاسبين لإدارة عملاء الأفراد والشركات: أوعية زكوية، أنصبة، تواريخ الحول، وتصدير موحّد." },
      { property: "og:title", content: "بوابة المحاسب — حاسبة الزكاة" },
      { property: "og:description", content: "تجميع بيانات الأفراد والشركات في لوحة واحدة" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountantPortal,
});

type ClientKind = "individual" | "company";
type Client = {
  id: string;
  name: string;
  kind: ClientKind;
  currency: string;
  wealth: number;   // للأفراد: صافي الأموال الزكوية | للشركات: الوعاء الزكوي
  nisab: number;
  hawlDate: string; // ISO
  notes?: string;
};

const SEED: Client[] = [
  { id: "c1", name: "أحمد الغامدي", kind: "individual", currency: "SAR", wealth: 128000, nisab: 24000, hawlDate: "2026-08-14" },
  { id: "c2", name: "شركة الرواسي التجارية", kind: "company", currency: "SAR", wealth: 4820000, nisab: 24000, hawlDate: "2026-07-30" },
  { id: "c3", name: "منى العتيبي", kind: "individual", currency: "SAR", wealth: 42000, nisab: 24000, hawlDate: "2026-09-02" },
  { id: "c4", name: "مؤسسة نور الصناعية", kind: "company", currency: "SAR", wealth: 985000, nisab: 24000, hawlDate: "2026-10-11" },
  { id: "c5", name: "خالد الشمري", kind: "individual", currency: "SAR", wealth: 18500, nisab: 24000, hawlDate: "2026-12-01" },
];

function daysUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

function AccountantPortal() {
  const [clients, setClients] = useState<Client[]>(() => {
    if (typeof window === "undefined") return SEED;
    try {
      const raw = localStorage.getItem("accountant_clients_v1");
      return raw ? (JSON.parse(raw) as Client[]) : SEED;
    } catch {
      return SEED;
    }
  });
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | ClientKind>("all");

  const persist = (next: Client[]) => {
    setClients(next);
    try { localStorage.setItem("accountant_clients_v1", JSON.stringify(next)); } catch {}
  };

  const filtered = useMemo(() => {
    return clients
      .filter((c) => (tab === "all" ? true : c.kind === tab))
      .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  }, [clients, q, tab]);

  const rows = filtered.map((c) => {
    const above = c.wealth >= c.nisab;
    const zakat = above ? c.wealth * ZAKAT_RATE : 0;
    return { ...c, above, zakat, days: daysUntil(c.hawlDate) };
  });

  const totals = useMemo(() => {
    const ind = rows.filter((r) => r.kind === "individual");
    const com = rows.filter((r) => r.kind === "company");
    return {
      individuals: { count: ind.length, wealth: ind.reduce((s, r) => s + r.wealth, 0), zakat: ind.reduce((s, r) => s + r.zakat, 0) },
      companies: { count: com.length, wealth: com.reduce((s, r) => s + r.wealth, 0), zakat: com.reduce((s, r) => s + r.zakat, 0) },
      due30: rows.filter((r) => r.above && r.days <= 30 && r.days >= 0).length,
    };
  }, [rows]);

  const exportCsv = () => {
    const header = ["النوع", "الاسم", "العملة", "الوعاء", "النصاب", "بلغ النصاب؟", "الزكاة", "تاريخ الحول", "أيام متبقية"];
    const lines = rows.map((r) => [
      r.kind === "individual" ? "فرد" : "شركة",
      r.name, r.currency, r.wealth, r.nisab, r.above ? "نعم" : "لا",
      Math.round(r.zakat), r.hawlDate, r.days,
    ].join(","));
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `accountant-portfolio-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const addClient = (kind: ClientKind) => {
    const name = prompt(kind === "individual" ? "اسم الفرد" : "اسم الشركة");
    if (!name) return;
    const wealth = Number(prompt("الوعاء الزكوي (بالعملة المحلية)") || 0);
    const nisab = Number(prompt("قيمة النصاب") || 24000);
    const hawl = prompt("تاريخ الحول (YYYY-MM-DD)") || new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);
    persist([...clients, { id: crypto.randomUUID(), name, kind, currency: "SAR", wealth, nisab, hawlDate: hawl }]);
  };

  const removeClient = (id: string) => persist(clients.filter((c) => c.id !== id));

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8 space-y-6" dir="rtl">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-primary" /> بوابة المحاسب
          </h1>
          <p className="text-muted-foreground text-sm">
            لوحة موحّدة تجمع محافظ عملائك من الأفراد والشركات في مكان واحد — أنصبة، أوعية زكوية، وتواريخ الحول.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} className="gap-1.5"><Download className="h-4 w-4" /> تصدير CSV</Button>
          <Button onClick={() => addClient("individual")} className="gap-1.5"><Plus className="h-4 w-4" /> فرد</Button>
          <Button onClick={() => addClient("company")} variant="secondary" className="gap-1.5"><Plus className="h-4 w-4" /> شركة</Button>
        </div>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<Users className="h-4 w-4" />} label="عملاء أفراد" value={totals.individuals.count.toString()} />
        <Kpi icon={<Building2 className="h-4 w-4" />} label="عملاء شركات" value={totals.companies.count.toString()} />
        <Kpi icon={<Wallet className="h-4 w-4" />} label="إجمالي الأوعية" value={fmt(totals.individuals.wealth + totals.companies.wealth)} suffix="ر.س" />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="زكاة مستحقة" value={fmt(totals.individuals.zakat + totals.companies.zakat)} suffix="ر.س" note={`${totals.due30} حول خلال 30 يوماً`} />
      </section>

      <section className="grid md:grid-cols-2 gap-3">
        <SegmentCard title="محفظة الأفراد" icon={<Users className="h-5 w-5" />} data={totals.individuals} />
        <SegmentCard title="محفظة الشركات" icon={<Building2 className="h-5 w-5" />} data={totals.companies} />
      </section>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> قائمة العملاء</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم..." value={q} onChange={(e) => setQ(e.target.value)} className="pr-8 w-56" />
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="all">الكل</TabsTrigger>
                <TabsTrigger value="individual">أفراد</TabsTrigger>
                <TabsTrigger value="company">شركات</TabsTrigger>
              </TabsList>
              <TabsContent value="all" />
              <TabsContent value="individual" />
              <TabsContent value="company" />
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العميل</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead className="text-end">الوعاء</TableHead>
                  <TableHead className="text-end">النصاب</TableHead>
                  <TableHead className="text-end">الزكاة (2.5%)</TableHead>
                  <TableHead className="text-end">الحول</TableHead>
                  <TableHead className="text-end">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا يوجد عملاء مطابقون</TableCell></TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <Badge variant={r.kind === "company" ? "secondary" : "outline"}>
                        {r.kind === "individual" ? "فرد" : "شركة"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end" dir="ltr">{fmt(r.wealth)} {r.currency}</TableCell>
                    <TableCell className="text-end" dir="ltr">{fmt(r.nisab)}</TableCell>
                    <TableCell className="text-end font-semibold text-primary" dir="ltr">
                      {r.above ? fmt(r.zakat) : "—"}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="text-xs" dir="ltr">{r.hawlDate}</div>
                      <div className={`text-[10px] ${r.days <= 30 ? "text-destructive" : "text-muted-foreground"}`}>
                        {r.days >= 0 ? `بعد ${r.days} يوم` : `منقضٍ منذ ${-r.days} يوم`}
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="ghost" onClick={() => removeClient(r.id)}>حذف</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-bold">الإجمالي المعروض</TableCell>
                  <TableCell className="text-end font-bold" dir="ltr">
                    {fmt(rows.reduce((s, r) => s + r.wealth, 0))}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-end font-bold text-primary" dir="ltr">
                    {fmt(rows.reduce((s, r) => s + r.zakat, 0))}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">اختصارات المحاسب</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Link to="/history" className="px-3 py-1.5 rounded-md border hover:bg-muted">سجل حسابات الزكاة</Link>
          <Link to="/analytics" className="px-3 py-1.5 rounded-md border hover:bg-muted">التحليلات</Link>
          <Link to="/group-zakat" className="px-3 py-1.5 rounded-md border hover:bg-muted">زكاة المجموعات</Link>
          <Link to="/organizations" className="px-3 py-1.5 rounded-md border hover:bg-muted">المؤسسات</Link>
          <Link to="/_authenticated/erp-setup" className="px-3 py-1.5 rounded-md border hover:bg-muted">ربط ERP</Link>
          <Link to="/_authenticated/attestations" className="px-3 py-1.5 rounded-md border hover:bg-muted">الشهادات الشرعية</Link>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        البيانات تُحفظ محلياً في متصفحك (localStorage) للتجربة السريعة — للاستخدام الإنتاجي اربط بوابة المحاسب بجداول Lovable Cloud
        لمزامنة متعددة الأجهزة وصلاحيات الفريق.
      </p>
    </main>
  );
}

function Kpi({ icon, label, value, suffix, note }: { icon: React.ReactNode; label: string; value: string; suffix?: string; note?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</div>
        <div className="text-2xl font-bold mt-1">
          {value}{suffix && <span className="text-sm text-muted-foreground ms-1">{suffix}</span>}
        </div>
        {note && <div className="text-[10px] text-muted-foreground mt-1">{note}</div>}
      </CardContent>
    </Card>
  );
}

function SegmentCard({ title, icon, data }: { title: string; icon: React.ReactNode; data: { count: number; wealth: number; zakat: number } }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xs text-muted-foreground">عدد العملاء</div>
          <div className="text-xl font-bold">{data.count}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">إجمالي الوعاء</div>
          <div className="text-xl font-bold" dir="ltr">{fmt(data.wealth)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">الزكاة المستحقة</div>
          <div className="text-xl font-bold text-primary" dir="ltr">{fmt(data.zakat)}</div>
        </div>
      </CardContent>
    </Card>
  );
}
