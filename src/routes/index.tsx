import { lazy, Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NisabHistory } from "@/components/zakat/NisabHistory";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FontSizeToggle } from "@/components/FontSizeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Users, Building2, Scroll, Moon, ShieldCheck, FileText, Wheat, History, LogIn, LogOut, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import LanguageToggle from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";

// Code-splitting للتبويبات الثقيلة لتقليل حجم الـ bundle الأولي
const IndividualTab = lazy(() => import("@/components/zakat/IndividualTab").then((m) => ({ default: m.IndividualTab })));
const CompanyTab = lazy(() => import("@/components/zakat/CompanyTab").then((m) => ({ default: m.CompanyTab })));
const FitrCalculator = lazy(() => import("@/components/zakat/FitrCalculator").then((m) => ({ default: m.FitrCalculator })));


function TabFallback() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin ml-2" /> جارٍ التحميل...
    </div>
  );
}


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
  const { t, lang } = useI18n();
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-gold">
              <Moon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">{t("app.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("app.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <LanguageToggle />
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
            <b>{t("disclaimer.title")}</b> {t("disclaimer.body")}
          </p>
        </div>

        <section className="mb-8 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-l from-primary via-primary to-gold bg-clip-text text-transparent">
            {t("hero.title")}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("hero.body")}
          </p>
        </section>

        <Tabs defaultValue="individual" className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
          <TabsList dir={lang === "ar" ? "rtl" : "ltr"} className="grid w-full max-w-5xl mx-auto h-auto gap-1 grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="individual" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4" /> {t("tabs.individual")}
            </TabsTrigger>
            <TabsTrigger id="tab-company" value="company" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4" /> {t("tabs.company")}
            </TabsTrigger>
            <TabsTrigger value="fitr" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Wheat className="h-3.5 w-3.5 md:h-4 md:w-4" /> {t("tabs.fitr")}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Scroll className="h-3.5 w-3.5 md:h-4 md:w-4" /> {t("tabs.history")}
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" /> {t("tabs.advanced")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual"><Suspense fallback={<TabFallback />}><IndividualTab /></Suspense></TabsContent>
          <TabsContent value="company"><Suspense fallback={<TabFallback />}><CompanyTab /></Suspense></TabsContent>
          <TabsContent value="fitr" className="max-w-6xl mx-auto"><Suspense fallback={<TabFallback />}><FitrCalculator /></Suspense></TabsContent>
          <TabsContent value="history" className="max-w-4xl mx-auto"><NisabHistory /></TabsContent>
          <TabsContent value="advanced" className="max-w-5xl mx-auto"><Suspense fallback={<TabFallback />}><AdvancedToolsHub /></Suspense></TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border/60 mt-16 bg-card/40">
        <div className="container mx-auto px-4 py-8 grid md:grid-cols-3 gap-6 text-xs text-muted-foreground">
          <div>
            <div className="flex items-center gap-2 font-bold text-foreground mb-2">
              <Moon className="h-4 w-4 text-primary" /> {t("footer.brand")}
            </div>
            <p className="leading-relaxed">{t("footer.about")}</p>
          </div>
          <div>
            <div className="font-bold text-foreground mb-2">{t("footer.legal")}</div>
            <ul className="space-y-1.5">
              <li><Link to="/legal/privacy" className="hover:text-primary inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {t("footer.privacy")}</Link></li>
              <li><Link to="/legal/terms" className="hover:text-primary inline-flex items-center gap-1"><FileText className="h-3 w-3" /> {t("footer.terms")}</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-foreground mb-2">{t("footer.disclaimer")}</div>
            <p className="leading-relaxed">{t("footer.disclaimerBody")}</p>
          </div>
        </div>
        <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t("footer.brand")}
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
