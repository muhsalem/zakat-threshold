import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  ShieldCheck,
  FileCheck2,
  Building2,
  Sparkles,
  Wheat,
  Scroll,
  BarChart3,
  BookOpen,
  ArrowLeft,
  Moon,
  Globe2,
  Lock,
  Users,
} from "lucide-react";
import { OG_IMAGE } from "@/lib/siteUrl";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "حاسبة الزكاة الشاملة — للأفراد والشركات بمعايير AAOIFI 35" },
      {
        name: "description",
        content:
          "منصّة متكاملة لحساب وتدقيق الزكاة وفق معيار AAOIFI 35 ومخرجات المجامع الفقهية. للأفراد والشركات والمؤسسات الخيرية، مع تقارير PDF موقّعة وقابلة للتحقق.",
      },
      { property: "og:title", content: "حاسبة الزكاة الشاملة — معيار AAOIFI 35" },
      {
        property: "og:description",
        content:
          "احسب، دقّق، وأخرج زكاتك بثقة. أداة شاملة بـ 18 موضوعاً زكوياً، مستشار ذكي، وتدقيق شرعي رباعي.",
      },
      { property: "og:url", content: "/welcome" },
      {
        property: "og:image",
        content: OG_IMAGE,
      },
      {
        name: "twitter:image",
        content: OG_IMAGE,
      },
    ],
    links: [{ rel: "canonical", href: "/welcome" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "حاسبة الزكاة الشاملة",
          url: "/welcome",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          inLanguage: "ar",
          description: "حساب وتدقيق الزكاة وفق معيار AAOIFI 35",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: WelcomePage,
});

const FEATURES = [
  {
    icon: Calculator,
    title: "حاسبات شاملة",
    body: "18 موضوعاً زكوياً: نقد، ذهب، فضة، أسهم، صكوك، عملات رقمية، عروض تجارة، زروع، أنعام، عقار، تكافل، وقف، ركاز، إيجارات، رواتب، فطر، ESOPs، تأمين.",
  },
  {
    icon: ShieldCheck,
    title: "تدقيق شرعي رباعي",
    body: "Maker / Checker / Auditor / Reviewer مع سجل تدقيق غير قابل للتعديل وتوقيع رقمي على كل تقرير.",
  },
  {
    icon: FileCheck2,
    title: "تقارير قابلة للتحقق",
    body: "PDF موقّع رقمياً بمعيار ZATCA TLV + كود QR، يتيح للجهات الخيرية والمراجعين التحقق فوراً.",
  },
  {
    icon: Building2,
    title: "زكاة الشركات",
    body: "نموذج XBRL، استيراد ميزان مراجعة، تصنيف عروض تجارة، تسوية الزكاة والضريبة، نماذج قطاعية.",
  },
  {
    icon: Sparkles,
    title: "مستشار ذكي",
    body: "ذكاء اصطناعي مدرّب على معيار AAOIFI 35 وقرارات المجامع الفقهية، يجيب بالأدلة والمصادر.",
  },
  {
    icon: Scroll,
    title: "نصاب تاريخي",
    body: "قاعدة بيانات 100 سنة (1926–2025) لأسعار الذهب والفضة لتقدير زكاة الذمم المتراكمة.",
  },
  {
    icon: Wheat,
    title: "زكاة الفطر",
    body: "حاسبة فطر بالصاع النبوي وأسعار الأقوات المحلية بالعملات المتعددة.",
  },
  {
    icon: BarChart3,
    title: "لوحة أثر SROI",
    body: "مؤشرات الأثر الاجتماعي ومحاذاة أهداف التنمية المستدامة (SDGs) للمؤسسات الخيرية.",
  },
];

const STATS = [
  { v: "18", l: "موضوعاً زكوياً" },
  { v: "100", l: "سنة بيانات نصاب" },
  { v: "AAOIFI 35", l: "المعيار المرجعي" },
  { v: "4", l: "مستويات تدقيق" },
];

const AUDIENCES = [
  {
    icon: Users,
    title: "للأفراد",
    points: [
      "حساب زكاة المال والذهب",
      "تذكير بحول الزكاة",
      "تقرير PDF للأرشيف",
      "زكاة الفطر والرواتب",
    ],
  },
  {
    icon: Building2,
    title: "للشركات",
    points: [
      "نموذج صافي الموجودات",
      "استيراد ميزان المراجعة",
      "تسوية الزكاة والضريبة",
      "تقرير XBRL رسمي",
    ],
  },
  {
    icon: ShieldCheck,
    title: "للمؤسسات الخيرية",
    points: [
      "تدقيق Maker/Checker",
      "توثيقات شرعية موقّعة",
      "لوحة أثر اجتماعي SROI",
      "إدارة فريق متعدّد الأدوار",
    ],
  },
];

function WelcomePage() {
  return (
    <div dir="rtl" className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/70 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-gold">
              <Moon className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">حاسبة الزكاة</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              to="/governance"
              className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              الحوكمة
            </Link>
            <Link
              to="/organizations"
              className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              المؤسسات
            </Link>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/">
                ابدأ الحساب <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          className="absolute inset-0 bg-gradient-to-bl from-primary/10 via-transparent to-gold/5"
          aria-hidden
        />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="outline" className="gap-1.5 mx-auto">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              مبني على معيار AAOIFI 35 ومخرجات المجامع الفقهية
            </Badge>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight bg-gradient-to-l from-primary via-primary to-gold bg-clip-text text-transparent">
              منصّة الزكاة الأشمل للأفراد والشركات
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              احسب زكاتك بثقة على 18 موضوعاً شرعياً، دقّق سجلاتك برباعية المراجعة
              Maker/Checker/Auditor/Reviewer، وأصدر تقارير PDF موقّعة رقمياً قابلة للتحقق من أي طرف.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="gap-2">
                <Link to="/">
                  ابدأ مجاناً <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link to="/advisor">
                  <Sparkles className="h-4 w-4 text-gold" /> جرّب المستشار الذكي
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-3">
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3" /> بياناتك مشفّرة
              </span>
              <span className="inline-flex items-center gap-1">
                <Globe2 className="h-3 w-3" /> 8 عملات
              </span>
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> مصادر شرعية موثّقة
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-12">
            {STATS.map((s) => (
              <div
                key={s.l}
                className="text-center p-4 rounded-xl bg-card/60 border border-border/60"
              >
                <div className="text-2xl md:text-3xl font-extrabold text-primary">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">كل ما تحتاجه لإخراج زكاتك بثقة</h2>
          <p className="text-muted-foreground">
            منصّة واحدة تجمع الحاسبات والتدقيق والتقارير والمستشار الذكي.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {FEATURES.map((f) => (
            <Card
              key={f.title}
              className="border-border/60 hover:border-primary/40 transition-colors"
            >
              <CardContent className="pt-6 space-y-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Audiences */}
      <section className="bg-card/40 border-y border-border/60">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">صُمّمت لكل من يخرج الزكاة</h2>
            <p className="text-muted-foreground">
              من الفرد إلى الشركة إلى المؤسسة الخيرية — تجربة مخصّصة لكل دور.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {AUDIENCES.map((a) => (
              <Card key={a.title} className="shadow-soft">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-gold">
                      <a.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="font-bold text-lg">{a.title}</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {a.points.map((p) => (
                      <li key={p} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">◆</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <Card className="max-w-3xl mx-auto bg-gradient-to-bl from-primary/10 to-gold/5 border-primary/30">
          <CardContent className="pt-10 pb-10 text-center space-y-5">
            <h2 className="text-2xl md:text-3xl font-bold">ابدأ بحساب زكاتك خلال دقائق</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              مجاناً تماماً، بلا إعلانات، وبياناتك تبقى لك. تستطيع التسجيل لاحقاً لحفظ سجلّك ومتابعة
              حول زكاتك.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/">
                  افتح الحاسبة الآن <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/advisor">اسأل المستشار الشرعي</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/40">
        <div className="container mx-auto px-4 py-8 text-center text-xs text-muted-foreground space-y-2">
          <div className="flex items-center justify-center gap-2 font-bold text-foreground">
            <Moon className="h-4 w-4 text-primary" /> حاسبة الزكاة الشاملة
          </div>
          <p>تنبيه: المنصّة أداة استرشادية. للحالات الخاصة يُستحسن مراجعة عالم متخصّص.</p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link to="/legal/privacy" className="hover:text-primary">
              سياسة الخصوصية
            </Link>
            <Link to="/legal/terms" className="hover:text-primary">
              الشروط
            </Link>
            <Link to="/developers" className="hover:text-primary">
              للمطوّرين
            </Link>
          </div>
          <div>© {new Date().getFullYear()} حاسبة الزكاة</div>
        </div>
      </footer>
    </div>
  );
}
