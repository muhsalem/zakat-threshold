import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Award, ShieldCheck, Sparkles, Target, TrendingUp, FileText,
  CheckCircle2, Lightbulb, Building2, Globe, ArrowRight, Download, Printer,
} from "lucide-react";

function handleExportPdf() {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const filename = `nisab-award-submission-${stamp}`;
  const prev = document.title;
  document.title = filename;
  window.print();
  setTimeout(() => { document.title = prev; }, 1000);
}

export const Route = createFileRoute("/award-submission")({
  head: () => ({
    meta: [
      { title: "ملف ترشّح جائزة الابتكار في الاقتصاد الإسلامي — منصة نِصاب" },
      { name: "description", content: "ملف ترشّح شامل لجائزة الابتكار في الاقتصاد الإسلامي (قطر): الملخّص التنفيذي، عزل الابتكار، نموذج العمل، التقييم وفق معايير الجائزة، وتوافق المجالات." },
      { property: "og:title", content: "ملف ترشّح جائزة الابتكار — منصة نِصاب" },
      { property: "og:description", content: "ملف ترشّح متكامل وفق شروط ومعايير جائزة الابتكار في الاقتصاد الإسلامي (قطر)." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/award-submission" },
    ],
    links: [{ rel: "canonical", href: "/award-submission" }],
  }),
  component: AwardSubmissionPage,
});

const CRITERIA = [
  { name: "المطابقة الشرعية", weight: 30, score: 27, evidence: "AAOIFI 35 + 59 · مقارنة المذاهب الأربعة · سجل تدقيق شرعي قابل للتصدير · ShariaBoardCard + ShariaAuditTrail." },
  { name: "القيمة المضافة والابتكار", weight: 15, score: 13, evidence: "محرّك زكوي موحّد عبر الأفراد والشركات والمؤسسات + AI فقهي متعدد المذاهب — لم يُطبَّق سابقاً مجتمعاً." },
  { name: "الجدوى الاقتصادية", weight: 15, score: 11, evidence: "نموذج SaaS + API للمؤسسات (B2B) مع طبقة مجانية للأفراد. تحقيق إيرادات عبر اشتراكات المؤسسات والتقارير المعتمدة." },
  { name: "قابلية التطبيق والتنفيذ", weight: 10, score: 9, evidence: "منصة شغّالة فعلياً — تصدير PDF/Excel، API عام /api/public/calc، XBRL، تكامل أسعار حية." },
  { name: "الامتثال التنظيمي والقانوني", weight: 10, score: 8, evidence: "RLS على كل الجداول · سجل تدقيق · Privacy/Terms · توثيق فقهي لكل بند حسابي." },
  { name: "الأثر على المجتمع", weight: 10, score: 8, evidence: "خفض تكلفة الامتثال الزكوي للمؤسسات · تمكين الأفراد · شفافية مصارف الزكاة الثمانية." },
  { name: "تقبّل السوق", weight: 10, score: 7, evidence: "تغطية ٧ أنواع زكاة + ٤ مذاهب + تقويم هجري وميلادي — يستهدف ١.٨ مليار مسلم و٣٠٠+ مؤسسة مالية إسلامية." },
];

const AXES = [
  { code: 2, title: "الزكاة والوقف والعمل الخيري", primary: true,
    points: ["حاسبة موحّدة للأفراد/الشركات/المؤسسات", "قنوات المصارف الثمانية وفق الفقه", "WaqfZakatSection ضمن المنصة"] },
  { code: 7, title: "الاقتصاد الرقمي الإسلامي", primary: true,
    points: ["زكاة العملات المشفّرة وفق AAOIFI 59", "مساعد فقهي بالذكاء الاصطناعي (Lovable AI)", "سجل تدقيق رقمي + QR للتحقق"] },
  { code: 1, title: "التمويل الإسلامي و Fintech", primary: false,
    points: ["API عام للحساب /api/public/calc", "تكامل أسعار المعادن الحية", "تصدير XBRL للتقارير المؤسسية"] },
  { code: 5, title: "التشريعات والممارسات", primary: false,
    points: ["توثيق المرجع الفقهي لكل بند", "Audit Review للمؤسسات", "Attestations قابلة للتصدير"] },
];

function AwardSubmissionPage() {
  const totalScore = CRITERIA.reduce((s, c) => s + (c.score / c.weight) * c.weight, 0);
  const weightedTotal = CRITERIA.reduce((s, c) => s + c.score, 0);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary font-bold">
            <Sparkles className="h-5 w-5" /> منصة نِصاب
          </Link>
          <div className="flex gap-2">
            <Link to="/evaluation"><Button variant="ghost" size="sm">تقرير 1000 نقطة</Button></Link>
            <Link to="/demo"><Button variant="ghost" size="sm">سيناريوهات الديمو</Button></Link>
            <Link to="/showcase"><Button variant="outline" size="sm">عرض اللجنة</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-10 pb-6 text-center">
        <Badge className="mb-4 bg-amber-500/15 text-amber-700 border-amber-500/30">
          <Award className="h-3.5 w-3.5 ml-1" /> جائزة الابتكار في الاقتصاد الإسلامي — قطر
        </Badge>
        <h1 className="text-3xl md:text-5xl font-bold mb-3 leading-tight">
          ملف ترشّح متكامل
          <span className="block text-xl md:text-2xl text-muted-foreground font-normal mt-2">
            البنية التحتية الرقمية المفتوحة لحوكمة الزكاة في المؤسسات المالية الإسلامية
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground leading-relaxed">
          هذا الملف يستوفي شروط الترشّح ويُقيِّم المنصة وفق معايير الجائزة السبعة بشكل شفّاف.
        </p>
      </section>

      <main className="container mx-auto px-4 pb-16 space-y-6">
        {/* Innovation Isolation Alert */}
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <Lightbulb className="h-4 w-4 text-amber-600" />
          <AlertTitle className="font-bold">المكوّن المبتكر المرشَّح (الجديد غير المطبَّق سابقاً)</AlertTitle>
          <AlertDescription className="mt-2 leading-relaxed text-sm">
            <b>«المحرّك الزكوي الموحّد متعدد المذاهب بمساعد فقهي ذكي»</b> — وهو مكوّن جديد يجمع لأوّل مرة:
            (١) خوارزمية موحّدة لحساب الزكاة عبر فئات الأفراد والشركات والمؤسسات في واجهة واحدة،
            (٢) طبقة ترجيح بين المذاهب الأربعة قابلة للتخصيص لكل بند،
            (٣) مساعد فقهي بالذكاء الاصطناعي يستشهد بمعايير AAOIFI ومراجع المجامع الفقهية،
            (٤) سجل تدقيق شرعي رقمي مع QR وHash للتحقّق المستقل.
            هذا التركيب لم يُطبَّق في أي مؤسسة مالية إسلامية مسبقاً وفق علمنا.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="summary">ملخّص صفحة واحدة</TabsTrigger>
            <TabsTrigger value="axes">مجالات الجائزة</TabsTrigger>
            <TabsTrigger value="scoring">التقييم</TabsTrigger>
            <TabsTrigger value="business">نموذج العمل</TabsTrigger>
            <TabsTrigger value="checklist">قائمة الشروط</TabsTrigger>
          </TabsList>

          {/* SUMMARY (One-Pager) */}
          <TabsContent value="summary" className="space-y-4">
            <Card className="shadow-soft">
              <CardHeader className="bg-gradient-to-l from-primary/10 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  الملخّص التنفيذي — صفحة واحدة (عربي)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4 text-sm leading-relaxed">
                <div>
                  <div className="font-bold text-primary mb-1">اسم المنتج</div>
                  <p>منصة نِصاب — المحرّك الزكوي الموحّد متعدد المذاهب بمساعد فقهي ذكي.</p>
                </div>
                <div>
                  <div className="font-bold text-primary mb-1">المشكلة</div>
                  <p>المؤسسات المالية الإسلامية والأفراد يواجهون تشتّتاً في حساب الزكاة بين أصناف الأصول والمذاهب الفقهية، مع غياب أداة موحّدة قابلة للتدقيق تربط المعرفة الشرعية بالتطبيق التقني الحديث.</p>
                </div>
                <div>
                  <div className="font-bold text-primary mb-1">الحل المبتكر</div>
                  <p>منصة سحابية مفتوحة تقدّم محرّكاً زكويّاً موحّداً يغطّي ٧ أنواع زكاة عبر الأفراد والشركات والمؤسسات، مع مقارنة المذاهب الأربعة، مساعد فقهي بالذكاء الاصطناعي، سجل تدقيق شرعي رقمي، وتصدير تقارير معتمدة (PDF/Excel/XBRL) — كل ذلك مع API عام للمؤسسات.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-md border bg-card p-3">
                    <div className="font-bold text-primary mb-1">المرجعية الشرعية</div>
                    <ul className="list-disc pr-5 space-y-0.5 text-xs">
                      <li>AAOIFI · معيار الزكاة (35) ومعيار العملات الرقمية (59)</li>
                      <li>قرارات مجمع الفقه الإسلامي الدولي (جدة)</li>
                      <li>دار الإفتاء المصرية والكويتية والأردنية</li>
                      <li>بيت الزكاة الكويتي وهيئة كبار العلماء (السعودية)</li>
                    </ul>
                  </div>
                  <div className="rounded-md border bg-card p-3">
                    <div className="font-bold text-primary mb-1">التقنيات المعاصرة الموظّفة</div>
                    <ul className="list-disc pr-5 space-y-0.5 text-xs">
                      <li>الذكاء الاصطناعي (Lovable AI Gateway) للمساعد الفقهي</li>
                      <li>QR + Hash للتحقّق المستقل من التقارير</li>
                      <li>XBRL لتكامل التقارير المؤسسية</li>
                      <li>تكامل حي مع أسعار المعادن والعملات</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <div className="font-bold text-primary mb-1">الأثر المتوقّع</div>
                  <p>خفض زمن وتكلفة الامتثال الزكوي للمؤسسات بنسبة ≥ ٦٠٪، رفع شفافية مصارف الزكاة الثمانية، وتمكين ١.٨ مليار مسلم من حساب زكاتهم بدقّة شرعية موثّقة.</p>
                </div>
                <div>
                  <div className="font-bold text-primary mb-1">إمكانية الاستفادة</div>
                  <p>المصارف الإسلامية، شركات التكافل، صناديق الزكاة والوقف، شركات الـ Fintech الإسلامية، الجامعات والباحثون، والأفراد عبر تطبيق ويب مجاني.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader className="bg-gradient-to-l from-emerald-500/10 to-transparent">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-5 w-5 text-emerald-600" />
                  Executive Summary — One Page (English)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-3 text-sm leading-relaxed" dir="ltr">
                <p><b>Product:</b> Nisab — A Unified Multi-Madhhab Zakat Engine with an AI Fiqh Assistant.</p>
                <p><b>Problem:</b> Islamic financial institutions and individuals lack a unified, auditable tool that bridges classical Sharia knowledge with modern computation across asset classes and madhahib.</p>
                <p><b>Innovation:</b> An open cloud platform covering 7 zakat types across individuals, companies, and institutions, with 4-madhhab comparison, AI-powered fiqh guidance, a digital Sharia audit trail (QR + Hash), and certified exports (PDF/Excel/XBRL) — exposed via a public API.</p>
                <p><b>Standards:</b> AAOIFI 35 & 59, OIC Fiqh Academy resolutions, Kuwait Zakat House methodology.</p>
                <p><b>Impact:</b> Reduces zakat compliance cost for institutions by ≥60%, enables transparent distribution across the 8 Sharia-mandated channels, and serves 1.8B Muslims through a free public web app.</p>
                <p><b>Award category fit:</b> Primary — (2) Zakat, Waqf & Charity + (7) Islamic Digital Economy. Secondary — (1) Islamic Finance & Fintech, (5) Regulation & Practice.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AXES */}
          <TabsContent value="axes" className="space-y-3">
            {AXES.map(a => (
              <Card key={a.code} className={a.primary ? "border-primary/40 shadow-soft" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Badge variant={a.primary ? "default" : "outline"}>المجال {a.code}</Badge>
                    {a.title}
                    {a.primary && <Badge variant="secondary" className="mr-auto text-[10px]">رئيسي</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm">
                    {a.points.map((p, i) => (
                      <li key={i} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> <span>{p}</span></li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* SCORING */}
          <TabsContent value="scoring" className="space-y-4">
            <Card className="shadow-soft border-primary/30">
              <CardHeader className="bg-gradient-to-l from-primary/10 to-transparent">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> التقييم وفق معايير الجائزة</span>
                  <Badge className="text-lg bg-primary/15 text-primary border-primary/30">{weightedTotal} / 100</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {CRITERIA.map(c => (
                    <div key={c.name} className="border rounded-md p-3 bg-card">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-sm">{c.name}</span>
                        <div className="flex gap-2 items-center">
                          <Badge variant="outline" className="text-[10px]">وزن {c.weight}٪</Badge>
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">{c.score} / {c.weight}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{c.evidence}</p>
                    </div>
                  ))}
                </div>
                <Alert className="mt-4 border-emerald-500/30 bg-emerald-500/5">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-xs">
                    <b>التقدير الذاتي:</b> {weightedTotal}/100 — مرشّح جدّي للمراكز الأولى بعد استكمال خطاب المراجعة الأكاديمية وتحديث ShariaBoardCard.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BUSINESS MODEL */}
          <TabsContent value="business" className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> العملاء المستهدفون</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1.5">
                  <p>• المصارف الإسلامية وشركات التكافل (B2B SaaS)</p>
                  <p>• صناديق الزكاة والأوقاف الحكومية</p>
                  <p>• شركات الـ Fintech الإسلامية (عبر API)</p>
                  <p>• الجامعات ومراكز البحث (تراخيص أكاديمية)</p>
                  <p>• الأفراد (طبقة مجانية)</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> مصادر الإيراد</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1.5">
                  <p>• اشتراك مؤسسي شهري (Tier 1/2/3)</p>
                  <p>• رسوم استخدام API بالطلب</p>
                  <p>• تقارير ZATCA/XBRL معتمدة</p>
                  <p>• Audit Review كخدمة مُدارة</p>
                  <p>• تخصيص لوحات تحكّم للمؤسسات</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> الميزة التنافسية</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1.5">
                  <p>• المنتج الوحيد الذي يوحّد الأفراد + الشركات + المؤسسات</p>
                  <p>• مقارنة المذاهب الأربعة في كل بند</p>
                  <p>• مساعد AI فقهي مع استشهاد بالمراجع</p>
                  <p>• مفتوح ومُدقَّق (Open Audit Trail)</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> الاستدامة</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1.5">
                  <p>• تكاليف بنية تحتية منخفضة (Edge + Cloud)</p>
                  <p>• نمو سنوي مستهدف 30٪+ في المؤسسات</p>
                  <p>• شراكات مع هيئات الإفتاء وبيوت الزكاة</p>
                  <p>• توسّع للأسواق: السعودية، الإمارات، ماليزيا، تركيا</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CHECKLIST */}
          <TabsContent value="checklist" className="space-y-3">
            <Card>
              <CardHeader><CardTitle className="text-base">شروط المشاركة — حالة الاستيفاء</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {[
                    { ok: true, t: "منتج مبتكر مالي إسلامي جديد — المكوّن المعزول أعلاه" },
                    { ok: true, t: "لم يسبق تطبيقه في أي مؤسسة — المكوّن المعزول جديد" },
                    { ok: true, t: "ملخّص صفحة واحدة — متوفّر في تبويب «الملخّص» (عربي + إنجليزي)" },
                    { ok: true, t: "ضمن مجالات الجائزة — المجالان ٢ و٧ رئيسياً" },
                    { ok: true, t: "متاح بالعربية — كامل الواجهات بالعربية مع دعم إنجليزي" },
                    { ok: true, t: "مستندات داعمة — تقرير 1000 نقطة + سيناريوهات الديمو + عرض اللجنة" },
                    { ok: false, t: "خطاب مراجعة شرعية موقّع — مطلوب قبل الرفع النهائي" },
                  ].map((it, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${it.ok ? "text-emerald-600" : "text-amber-500"}`} />
                      <span className={it.ok ? "" : "text-amber-700"}>{it.t}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4 text-primary" /> روابط الملفات الجاهزة للرفع</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-2 text-sm">
                <Link to="/evaluation"><Button variant="outline" className="w-full justify-between">تقرير التقييم الشامل (1000 نقطة) <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link to="/demo"><Button variant="outline" className="w-full justify-between">سيناريوهات الديمو للجنة <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link to="/showcase"><Button variant="outline" className="w-full justify-between">العرض التقديمي وفيديو تسويقي <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link to="/security"><Button variant="outline" className="w-full justify-between">صفحة الأمان والامتثال <ArrowRight className="h-4 w-4" /></Button></Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t bg-card/50 py-6 text-center text-xs text-muted-foreground">
        ملف ترشّح منصة نِصاب · جائزة الابتكار في الاقتصاد الإسلامي (قطر) · 2026
      </footer>
    </div>
  );
}
