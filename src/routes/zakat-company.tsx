import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Calculator, ShieldCheck, BookOpen, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/zakat-company")({
  head: () => ({
    meta: [
      { title: "زكاة الشركات — احتساب زكاة عروض التجارة | نِصاب" },
      {
        name: "description",
        content:
          "دليل شامل لاحتساب زكاة الشركات والمؤسسات وفق معيار AAOIFI 35: عروض التجارة، الأصول التشغيلية، الخصوم قصيرة الأجل، والاستثمارات.",
      },
      { property: "og:title", content: "زكاة الشركات — دليل المحاسب المعتمد" },
      {
        property: "og:description",
        content: "احتساب زكاة عروض التجارة والشركات المساهمة والمؤسسات مع تقرير معتمد.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ZakatCompanyPage,
});

function ZakatCompanyPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6" dir="rtl">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">
          الرئيسية
        </Link>{" "}
        · <span>زكاة الشركات</span>
      </nav>

      <header className="space-y-3">
        <Badge variant="outline" className="gap-1">
          <Building2 className="h-3 w-3" /> AAOIFI 35 · مجمع الفقه الإسلامي
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight">زكاة الشركات وعروض التجارة</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          الوعاء الزكوي للشركة = <b>الأصول الزكوية المتداولة − الخصوم قصيرة الأجل</b>، ومقدار الزكاة{" "}
          <b>2.577% للحول الميلادي</b> أو <b>2.5% للحول الهجري</b> من صافي الوعاء.
        </p>
      </header>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" /> احسب زكاة شركتك
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            حاسبة زكاة الشركات في نِصاب تدعم استيراد ميزان المراجعة، تصنيف الأصول، ونماذج القطاعات
            (تجاري، صناعي، عقاري، مصرفي).
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button asChild size="lg" className="gap-1.5">
              <Link to="/client-intake">
                <Calculator className="h-4 w-4" /> ابدأ حساب الشركة
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/enterprise">الحلول المؤسسية</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid md:grid-cols-2 gap-4">
        <InfoBlock
          title="الأصول الزكوية"
          body="النقد والأرصدة البنكية، الذمم المدينة المرجوّة، عروض التجارة (مخزون)، الأوراق المالية للمتاجرة، الاستثمارات القصيرة."
        />
        <InfoBlock
          title="الأصول غير الزكوية"
          body="الأصول الثابتة المستخدمة في الإنتاج (مبانٍ، آلات، سيارات تشغيلية) لا زكاة في عينها — فقط في إيراداتها المتحققة."
        />
        <InfoBlock
          title="الخصوم قصيرة الأجل"
          body="تُخصم الديون المستحقة خلال السنة (موردون، قروض قصيرة، مصاريف مستحقة) من الوعاء الزكوي."
        />
        <InfoBlock
          title="الحول والنصاب"
          body="يبدأ الحول من تاريخ بلوغ رأس المال النصاب (85 جرام ذهب أو ما يعادلها) ويكتمل عند إعداد الميزانية السنوية."
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" /> المرجعيات المعتمدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            • <span className="text-foreground">معيار AAOIFI 35 — الزكاة</span>: بند 5 لأساس صافي
            الأصول الزكوية للشركات.
          </p>
          <p>
            • <span className="text-foreground">قرار مجمع الفقه الإسلامي 3/1</span>: زكاة الأسهم
            بحسب نية المساهم (متاجرة/استثمار).
          </p>
          <p>
            • <span className="text-foreground">قرار المجمع 4/28</span>: زكاة عروض التجارة تُقوَّم
            بسعر البيع الحاضر يوم وجوب الزكاة.
          </p>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-primary/5 p-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-5 w-5 text-primary" /> اطلب تقريراً معتمداً من محاسب مرخّص خلال
          يومَي عمل.
        </div>
        <Button asChild variant="ghost" className="gap-1">
          <Link to="/client-intake">اطلب التقرير</Link>
        </Button>
      </div>

      <div className="pt-4">
        <Button asChild variant="ghost" className="gap-1">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> عودة للرئيسية
          </Link>
        </Button>
      </div>
    </main>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border p-4 bg-card">
      <h3 className="font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
