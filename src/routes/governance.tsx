import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShieldCheck,
  Target,
  Compass,
  Award,
  Users,
  Scale,
  BookOpen,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/governance")({
  head: () => ({
    meta: [
      { title: "الرؤية والرسالة والحوكمة | نِصاب" },
      {
        name: "description",
        content:
          "ميثاق الحوكمة الشرعية والمؤسسية لمنصة نِصاب: الرؤية، الرسالة، القيم، أعضاء الهيئة الاستشارية، ومصادر الفتاوى المعتمدة.",
      },
      { property: "og:title", content: "الحوكمة والميثاق — نِصاب" },
      {
        property: "og:description",
        content: "شفافية كاملة حول منهج نِصاب في حساب الزكاة، الهيئة الشرعية، والحوكمة المؤسسية.",
      },
    ],
  }),
  component: GovernancePage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">{(error as Error).message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">الصفحة غير موجودة</div>,
});

function GovernancePage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 space-y-8" dir="rtl">
      <header className="text-center space-y-3">
        <Badge className="bg-primary/10 text-primary border-primary/20">
          Governance Charter — v1.0
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold">الرؤية والرسالة والحوكمة</h1>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          ميثاق الحوكمة الشرعية والمؤسسية لمنصة نِصاب. نلتزم بأعلى معايير الشفافية والمصداقية
          الفقهية والمهنية.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-soft border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Compass className="h-4 w-4 text-primary" /> الرؤية (Vision)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            أن نكون المرجع العالمي الأول لحساب الزكاة للأفراد والمؤسسات، بجودة مؤسسية، ودقة شرعية
            موثّقة، وشفافية كاملة عبر جميع الولايات القضائية والمذاهب الفقهية.
          </CardContent>
        </Card>

        <Card className="shadow-soft border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" /> الرسالة (Mission)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            تمكين المسلم — فرداً أو مؤسسة — من إخراج زكاته بدقة وثقة، عبر منصة تجمع بين العمق الفقهي
            (AAOIFI، مجامع الفقه، الفتاوى الوطنية) والاحتراف المحاسبي (IFRS، ZATCA، XBRL) والذكاء
            الاصطناعي المسؤول.
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-primary" /> القيم الجوهرية
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3 text-sm">
          {[
            { t: "الأمانة الشرعية", d: "كل رقم موثَّق بدليله الفقهي ومصدره." },
            { t: "الشفافية الكاملة", d: "منهج مفتوح، خطوات حساب مرئية، سجل تعديلات فتاوى علني." },
            {
              t: "الدقة المهنية",
              d: "اختبارات آلية شاملة (Unit + Property-based) على المحرك الحسابي.",
            },
            { t: "التعددية الفقهية", d: "احترام المذاهب الأربعة وفتاوى الهيئات الوطنية." },
            { t: "الخصوصية أولاً", d: "بيانات المزكّي مُشفَّرة، لا نبيعها ولا نشاركها." },
            { t: "الاستقلالية", d: "لا نتلقّى تمويلاً يؤثّر على استقلالية الفتوى." },
          ].map((v) => (
            <div key={v.t} className="rounded-md border border-border p-3 bg-card">
              <div className="font-semibold text-primary mb-1">{v.t}</div>
              <div className="text-xs text-muted-foreground">{v.d}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-soft border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> الحوكمة الشرعية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Alert className="border-primary/20 bg-primary/5">
            <BookOpen className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>حالة الاعتماد الشرعي:</strong> المنصة في مرحلة السعي للاعتماد الرسمي من هيئة
              شرعية مستقلة. حتى ذلك الحين، تعتمد المنصة على المعايير المنشورة (AAOIFI، مجامع الفقه)
              ولا تُغني عن استفتاء عالم مختصّ.
            </AlertDescription>
          </Alert>

          <div>
            <h3 className="font-semibold mb-2">المصادر الشرعية المعتمدة</h3>
            <ul className="grid md:grid-cols-2 gap-1 text-xs list-disc pr-4">
              <li>AAOIFI — معيار الزكاة (35)</li>
              <li>AAOIFI — معيار العملات الرقمية (59)</li>
              <li>AAOIFI — معيار الأوراق المالية (21)</li>
              <li>AAOIFI — معيار الصكوك (17)</li>
              <li>مجمع الفقه الإسلامي الدولي (جدة)</li>
              <li>المجمع الفقهي الإسلامي (رابطة العالم الإسلامي)</li>
              <li>هيئة كبار العلماء (السعودية)</li>
              <li>دار الإفتاء المصرية / الأردنية / الكويتية</li>
              <li>Majlis Fatwa (ماليزيا)</li>
              <li>Fiqh Council of North America</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">منهجية إضافة الفتاوى</h3>
            <ol className="text-xs list-decimal pr-4 space-y-1">
              <li>توثيق الفتوى بمصدرها الأصلي (كتاب، قرار، رقم معيار).</li>
              <li>تصنيفها حسب: الموضوع، الهيئة، المذهب، الولاية القضائية.</li>
              <li>مراجعة من عالم مختصّ قبل النشر.</li>
              <li>
                تسجيلها في{" "}
                <Link to="/sharia-changelog" className="text-primary underline">
                  سجل التغيير
                </Link>{" "}
                مع التاريخ والمرجع.
              </li>
              <li>إشعار المستخدمين المتأثرين عند حدوث تغيير جوهري.</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> الهيئة الاستشارية
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-muted-foreground text-xs">
            نرحّب بانضمام العلماء الشرعيين والخبراء المحاسبيين المُعتمَدين إلى هيئتنا الاستشارية.
            التركيبة المستهدفة:
          </p>
          <ul className="text-xs list-disc pr-4 space-y-1">
            <li>3 علماء شريعة مُتخصّصين في فقه المعاملات (بمذاهب مختلفة).</li>
            <li>2 محاسبين قانونيين خبراء في AAOIFI وIFRS.</li>
            <li>خبير في التمويل الإسلامي والصكوك.</li>
            <li>خبير في التقنيات المالية الحديثة (كريبتو، DeFi).</li>
          </ul>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <a href="mailto:board@nisab.app">التقدّم لعضوية الهيئة</a>
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" /> الحوكمة المؤسسية والامتثال
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid md:grid-cols-2 gap-3">
            {[
              {
                t: "خصوصية البيانات",
                d: "التزام بـ GDPR والأنظمة المحلية. لا مشاركة بيانات مع أطراف ثالثة.",
              },
              { t: "الأمن السيبراني", d: "تشفير TLS، RLS على قاعدة البيانات، سجلّ عمليات كامل." },
              { t: "التدقيق الشرعي", d: "سجلّ Sharia Audit Trail قابل للتصدير لكل حساب." },
              { t: "استمرارية الأعمال", d: "نسخ احتياطية يومية، استعادة كوارث خلال 4 ساعات." },
            ].map((v) => (
              <div key={v.t} className="rounded-md border border-border p-3 bg-card flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs">{v.t}</div>
                  <div className="text-[11px] text-muted-foreground">{v.d}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 justify-center">
        <Button asChild variant="outline" size="sm">
          <Link to="/sharia-changelog">
            سجل تحديث الفتاوى <ArrowRight className="h-4 w-4 mr-1" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/legal/privacy">سياسة الخصوصية</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/legal/terms">شروط الاستخدام</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/faq">الأسئلة الشائعة</Link>
        </Button>
      </div>
    </div>
  );
}
