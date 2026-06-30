import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { User, Building2, Landmark, CheckCircle2, FileCheck, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "بيانات تجريبية للجنة التحكيم — منصة نِصاب" },
      { name: "description", content: "ست سيناريوهات تجريبية لحساب الزكاة: أفراد، شركات، ومؤسسات، مع موافقات شرعية، تدقيق، وتقارير مُعَدّة للعرض على لجنة التحكيم." },
      { property: "og:title", content: "بيانات تجريبية — منصة نِصاب" },
      { property: "og:description", content: "أمثلة جاهزة على الزكاة الفردية والشركاتية والمؤسسية مع شهادات شرعية." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/demo" },
    ],
    links: [{ rel: "canonical", href: "/demo" }],
  }),
  component: DemoPage,
});

const fmt = (n: number, c = "SAR") => new Intl.NumberFormat("ar-EG", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

const INDIVIDUALS = [
  {
    name: "أحمد المالكي", country: "السعودية", currency: "SAR",
    assets: { cash: 120000, gold_g: 200, silver_g: 0, investments: 80000, receivables: 15000 },
    liabilities: 25000, mazhab: "حنبلي", nisabBasis: "ذهب (85ج)",
    zakat: 5300, status: "approved",
    notes: "نصاب الذهب 22,950 ر.س — تجاوزها بفارق كبير.",
  },
  {
    name: "فاطمة العنزي", country: "الإمارات", currency: "AED",
    assets: { cash: 45000, gold_g: 110, silver_g: 0, investments: 20000, receivables: 0 },
    liabilities: 8000, mazhab: "مالكي", nisabBasis: "ذهب (85ج)",
    zakat: 1825, status: "approved",
    notes: "حليّ للاستعمال خصم منه ما هو للزينة دون الإسراف.",
  },
  {
    name: "خالد عبدالله", country: "مصر", currency: "EGP",
    assets: { cash: 450000, gold_g: 0, silver_g: 0, investments: 200000, receivables: 50000, crypto: 80000 },
    liabilities: 100000, mazhab: "حنفي", nisabBasis: "فضة (595ج)",
    zakat: 17000, status: "pending",
    notes: "محفظة كريبتو (BTC/ETH) اعتُمد رأي الجمهور بوجوب الزكاة.",
  },
];

const COMPANIES = [
  {
    name: "شركة الأنوار للتجارة", country: "السعودية", currency: "SAR", sector: "تجارة جملة",
    zakatableAssets: 8_500_000, deductibleLiabilities: 1_200_000, fixedAssets: 2_000_000,
    base: 7_300_000, zakat: 182_500, rate: "2.578% (حول شمسي)",
    status: "approved", board: "هيئة شرعية مستقلة",
    breakdown: [
      { item: "نقد وبنوك", amount: 1_800_000 },
      { item: "مخزون عروض تجارة", amount: 5_500_000 },
      { item: "ذمم مدينة محصّلة", amount: 900_000 },
      { item: "استثمارات قصيرة الأجل", amount: 300_000 },
      { item: "أصول ثابتة (مستبعدة)", amount: -2_000_000 },
      { item: "التزامات قصيرة الأجل", amount: -1_200_000 },
    ],
  },
  {
    name: "مجموعة طيبة الزراعية", country: "السعودية", currency: "SAR", sector: "زراعة محاصيل",
    zakatableAssets: 0, deductibleLiabilities: 0, fixedAssets: 0,
    base: 1_200_000, zakat: 60_000, rate: "5% (سُقي بكلفة)",
    status: "approved", board: "AAOIFI",
    breakdown: [
      { item: "محصول قمح — 800 طن × 1500 ر.س", amount: 1_200_000 },
    ],
  },
];

const ORG = {
  name: "مؤسسة الزكاة الخيرية (مثال)", country: "متعدد", currency: "USD",
  collected: 12_500_000,
  distributed: {
    "الفقراء": 4_375_000,
    "المساكين": 2_500_000,
    "العاملين عليها": 625_000,
    "المؤلفة قلوبهم": 250_000,
    "في الرقاب": 125_000,
    "الغارمين": 1_500_000,
    "في سبيل الله": 2_000_000,
    "ابن السبيل": 1_125_000,
  },
  approvals: 47, auditors: 3, period: "1445-1446هـ",
};

function StatusBadge({ s }: { s: string }) {
  if (s === "approved") return <Badge className="bg-emerald-500"><CheckCircle2 className="h-3 w-3 ml-1" />معتمد</Badge>;
  if (s === "pending") return <Badge className="bg-amber-500">قيد المراجعة</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

function DemoPage() {
  return (
    <main id="main" className="container mx-auto px-4 py-8 space-y-6" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2">سيناريوهات تجريبية للعرض</Badge>
          <h1 className="text-3xl font-bold">بيانات تجريبية مُعَدّة للجنة التحكيم</h1>
          <p className="text-muted-foreground mt-1">
            ست حالات واقعية — ثلاثة أفراد، شركتان، ومؤسسة زكاة — تُظهر كل قدرات المنصة من الحساب
            إلى التدقيق الشرعي والتوزيع على المصارف الثمانية.
          </p>
        </div>
        <Button asChild variant="outline"><Link to="/showcase"><ArrowLeft className="h-4 w-4 ml-1" />العودة لعرض اللجنة</Link></Button>
      </header>

      <div className="grid md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center"><User className="h-6 w-6 mx-auto text-primary" /><div className="text-2xl font-bold mt-2">3</div><div className="text-xs text-muted-foreground">أفراد (مذاهب مختلفة)</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><Building2 className="h-6 w-6 mx-auto text-primary" /><div className="text-2xl font-bold mt-2">2</div><div className="text-xs text-muted-foreground">شركات (تجارة + زراعة)</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><Landmark className="h-6 w-6 mx-auto text-primary" /><div className="text-2xl font-bold mt-2">1</div><div className="text-xs text-muted-foreground">مؤسسة زكاة (8 مصارف)</div></CardContent></Card>
      </div>

      <Tabs defaultValue="individuals">
        <TabsList>
          <TabsTrigger value="individuals">أفراد</TabsTrigger>
          <TabsTrigger value="companies">شركات</TabsTrigger>
          <TabsTrigger value="org">مؤسسة زكاة</TabsTrigger>
          <TabsTrigger value="audit">سجل التدقيق</TabsTrigger>
        </TabsList>

        <TabsContent value="individuals" className="grid lg:grid-cols-3 gap-4">
          {INDIVIDUALS.map(p => {
            const totalAssets = Object.values(p.assets).reduce((a: number, b) => a + (b as number), 0);
            return (
              <Card key={p.name}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <StatusBadge s={p.status} />
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground"><span>{p.country}</span>·<span>{p.mazhab}</span>·<span>أساس النصاب: {p.nisabBasis}</span></div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Table>
                    <TableBody>
                      <TableRow><TableCell>إجمالي الأصول</TableCell><TableCell className="text-left">{fmt(totalAssets, p.currency)}</TableCell></TableRow>
                      <TableRow><TableCell>الالتزامات</TableCell><TableCell className="text-left text-rose-600">−{fmt(p.liabilities, p.currency)}</TableCell></TableRow>
                      <TableRow className="font-bold border-t-2"><TableCell>الزكاة المستحقّة</TableCell><TableCell className="text-left text-primary text-lg">{fmt(p.zakat, p.currency)}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">{p.notes}</div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          {COMPANIES.map(c => (
            <Card key={c.name}>
              <CardHeader>
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>{c.name}</CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">{c.country} · {c.sector} · هيئة: {c.board} · {c.rate}</div>
                  </div>
                  <StatusBadge s={c.status} />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>البند</TableHead><TableHead className="text-left">المبلغ</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.breakdown.map((b, i) => (
                      <TableRow key={i}>
                        <TableCell>{b.item}</TableCell>
                        <TableCell className={"text-left " + (b.amount < 0 ? "text-rose-600" : "")}>{fmt(b.amount, c.currency)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold border-t-2"><TableCell>وعاء الزكاة</TableCell><TableCell className="text-left">{fmt(c.base, c.currency)}</TableCell></TableRow>
                    <TableRow className="font-bold bg-primary/5"><TableCell>الزكاة المستحقّة</TableCell><TableCell className="text-left text-primary text-lg">{fmt(c.zakat, c.currency)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="org">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <CardTitle>{ORG.name}</CardTitle>
                  <div className="text-xs text-muted-foreground mt-1">{ORG.country} · فترة: {ORG.period} · {ORG.approvals} موافقة · {ORG.auditors} مدققون شرعيون</div>
                </div>
                <Badge className="bg-emerald-500"><FileCheck className="h-3 w-3 ml-1" />موزّعة بالكامل</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 text-center bg-primary/5">
                  <div className="text-xs text-muted-foreground">إجمالي المُحصَّل</div>
                  <div className="text-3xl font-bold text-primary mt-1">{fmt(ORG.collected, ORG.currency)}</div>
                </div>
                <div className="rounded-lg border p-4 text-center bg-emerald-500/5">
                  <div className="text-xs text-muted-foreground">إجمالي الموزَّع</div>
                  <div className="text-3xl font-bold text-emerald-600 mt-1">{fmt(Object.values(ORG.distributed).reduce((a, b) => a + b, 0), ORG.currency)}</div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>المصرف الشرعي</TableHead><TableHead className="text-left">المبلغ</TableHead><TableHead className="text-left">النسبة</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(ORG.distributed).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell className="font-medium">{k}</TableCell>
                      <TableCell className="text-left">{fmt(v, ORG.currency)}</TableCell>
                      <TableCell className="text-left">{((v / ORG.collected) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle>سجل التدقيق الشرعي (آخر 8 إجراءات)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>التاريخ</TableHead><TableHead>الحالة</TableHead><TableHead>المدقّق</TableHead><TableHead>الإجراء</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { d: "1446/06/12", c: "أحمد المالكي", a: "د. عبدالرحمن الفقيه", x: "اعتماد حساب زكاة المال على نصاب الذهب" },
                    { d: "1446/06/12", c: "فاطمة العنزي", a: "د. عبدالرحمن الفقيه", x: "اعتماد استثناء حليّ الاستعمال (مذهب مالكي)" },
                    { d: "1446/06/10", c: "خالد عبدالله", a: "أ. منى الخطيب", x: "تعليق حتى مراجعة تقييم محفظة الكريبتو" },
                    { d: "1446/06/08", c: "شركة الأنوار للتجارة", a: "هيئة شرعية مستقلة", x: "اعتماد إخراج 182,500 ر.س مع شهادة موقّعة" },
                    { d: "1446/06/05", c: "مجموعة طيبة الزراعية", a: "AAOIFI", x: "اعتماد نسبة 5% للمحصول المسقي بكلفة" },
                    { d: "1446/06/01", c: "مؤسسة الزكاة الخيرية", a: "لجنة المصارف", x: "اعتماد توزيع 12.5 مليون على 8 مصارف" },
                    { d: "1446/05/28", c: "شركة الأنوار للتجارة", a: "نظام نِصاب", x: "توليد QR ZATCA لتقرير الزكاة السنوي" },
                    { d: "1446/05/25", c: "نظام", a: "نظام نِصاب", x: "تحديث أسعار الذهب/الفضة من LBMA/SAMA" },
                  ].map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.d}</TableCell>
                      <TableCell><Badge variant="outline">{r.c}</Badge></TableCell>
                      <TableCell className="text-sm">{r.a}</TableCell>
                      <TableCell className="text-sm">{r.x}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <footer className="text-xs text-muted-foreground text-center border-t pt-4">
        البيانات أعلاه افتراضية ومُعَدّة لأغراض العرض على لجان التحكيم — لا تمثّل أشخاصاً أو شركات حقيقية.
      </footer>
    </main>
  );
}
