import { createFileRoute, Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndividualTab } from "@/components/zakat/IndividualTab";
import { CompanyTab } from "@/components/zakat/CompanyTab";
import { NisabHistory } from "@/components/zakat/NisabHistory";
import { FitrCalculator } from "@/components/zakat/FitrCalculator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FontSizeToggle } from "@/components/FontSizeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Users, Building2, Scroll, Moon, ShieldCheck, FileText, Wheat, History, LogIn, LogOut, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:url", content: "/" },
    ],
    links: [
      { rel: "canonical", href: "/" },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "حاسبة الزكاة الشاملة",
        description: "أداة شاملة لحساب زكاة الأفراد والشركات وفق المعايير الشرعية الدولية (AAOIFI 35)",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: "ar",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      }),
    }],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-gold">
              <Moon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">حاسبة الزكاة</h1>
              <p className="text-xs text-muted-foreground">نموذج شامل لكل الأوعية وفق المعايير الشرعية</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <FontSizeToggle />
            <ThemeToggle />
            <HeaderAuth />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">

        <div role="note" className="mb-6 max-w-4xl mx-auto rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground/90 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p>
            <b>إخلاء مسؤولية شرعي:</b> هذه الحاسبة <b>استرشادية</b> ومبنية على المعايير الفقهية المعتمدة (AAOIFI، المجامع الفقهية، بيت الزكاة الكويتي).
            للحالات الخاصة والفتاوى الملزمة، يُرجى مراجعة <b>دار الإفتاء</b> أو <b>عالم/مفتٍ معتمد</b> في بلدك.
          </p>
        </div>

        <section className="mb-8 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-l from-primary via-primary to-gold bg-clip-text text-transparent">
            احسب زكاتك بدقة وفق المنهج الشرعي
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            نموذج شامل لكل الأوعية: نقد وأوراق مالية وتجارية ورقمية وعقار وزروع وأنعام وركاز، مع مطابقة الوعاء الضريبي.
          </p>
        </section>

        <Tabs defaultValue="individual" className="space-y-6" dir="rtl">
          <TabsList dir="rtl" className="grid w-full max-w-4xl mx-auto h-auto gap-1 grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="individual" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4" /> الأفراد
            </TabsTrigger>
            <TabsTrigger id="tab-company" value="company" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4" /> الشركات
            </TabsTrigger>
            <TabsTrigger value="fitr" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Wheat className="h-3.5 w-3.5 md:h-4 md:w-4" /> زكاة الفطر
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Scroll className="h-3.5 w-3.5 md:h-4 md:w-4" /> الأنصبة
            </TabsTrigger>
          </TabsList>

          {/* تبويب "المبتدئ" مؤجل حتى مرحلة نشر الحاسبة — سيُتاح مجانًا لاحقًا */}
          <TabsContent value="individual"><IndividualTab /></TabsContent>
          <TabsContent value="company"><CompanyTab /></TabsContent>
          <TabsContent value="fitr" className="max-w-6xl mx-auto"><FitrCalculator /></TabsContent>
          <TabsContent value="history" className="max-w-4xl mx-auto"><NisabHistory /></TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border/60 mt-16 bg-card/40">
        <div className="container mx-auto px-4 py-8 grid md:grid-cols-3 gap-6 text-xs text-muted-foreground">
          <div>
            <div className="flex items-center gap-2 font-bold text-foreground mb-2">
              <Moon className="h-4 w-4 text-primary" /> حاسبة الزكاة الشاملة
            </div>
            <p className="leading-relaxed">
              أداة استرشادية فقهية‑محاسبية وفق المعايير الشرعية الدولية (AAOIFI رقم 35)
              وفتاوى المجامع الفقهية وبيت الزكاة الكويتي.
            </p>
          </div>
          <div>
            <div className="font-bold text-foreground mb-2">روابط قانونية</div>
            <ul className="space-y-1.5">
              <li><Link to="/legal/privacy" className="hover:text-primary inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> سياسة الخصوصية</Link></li>
              <li><Link to="/legal/terms" className="hover:text-primary inline-flex items-center gap-1"><FileText className="h-3 w-3" /> شروط الاستخدام وإخلاء المسؤولية</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-foreground mb-2">إخلاء مسؤولية</div>
            <p className="leading-relaxed">
              نتائج هذه الحاسبة <b>استرشادية</b> وليست فتوى ملزمة ولا تقريراً حكومياً معتمداً.
              للحالات الخاصة يُرجى مراجعة عالم/مفتٍ معتمد أو هيئة الفتوى المحلية.
            </p>
          </div>
        </div>
        <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} منصة حاسبة الزكاة الشاملة — جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
}

function HeaderAuth() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/history"><Button variant="outline" size="sm" className="gap-1.5"><History className="h-4 w-4" /> <span className="hidden sm:inline">السجل</span></Button></Link>
        <Link to="/audit"><Button variant="outline" size="sm" className="gap-1.5"><ShieldCheck className="h-4 w-4" /> <span className="hidden sm:inline">التدقيق</span></Button></Link>
        <Link to="/security"><Button variant="outline" size="sm" className="gap-1.5"><Lock className="h-4 w-4" /> <span className="hidden sm:inline">الأمان</span></Button></Link>
        <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="gap-1.5">
          <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">خروج</span>
        </Button>
      </div>
    );
  }
  return (
    <Link to="/auth"><Button variant="outline" size="sm" className="gap-1.5"><LogIn className="h-4 w-4" /> دخول</Button></Link>
  );
}
