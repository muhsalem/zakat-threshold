import { lazy, Suspense, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NisabHistory } from "@/components/zakat/NisabHistory";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FontSizeToggle } from "@/components/FontSizeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Users, Building2, Scroll, Moon, ShieldCheck, Wheat, History, LogIn, LogOut, Lock, Loader2, Award, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import LanguageToggle from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";

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

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "الحاسبة التفاعلية — نِصاب" },
      { name: "description", content: "احسب زكاتك مباشرة: الأفراد، الشركات، زكاة الفطر، وسجل النصاب التاريخي." },
      { property: "og:title", content: "الحاسبة التفاعلية — نِصاب" },
      { property: "og:description", content: "أدوات حساب فورية للأفراد والشركات وزكاة الفطر." },
    ],
  }),
  component: CalculatorPage,
});

function CalculatorPage() {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<"individual" | "company" | "fitr" | null>(null);
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-gold">
              <Moon className="h-5 w-5 text-primary-foreground" />
            </Link>
            <div>
              <h1 className="text-xl font-bold leading-tight">{t("app.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("app.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/" className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline px-2">
              <Home className="h-4 w-4" /> الرئيسية
            </Link>
            <Link to="/showcase" className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline px-2">
              <Award className="h-4 w-4" /> عرض الجائزة
            </Link>
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
          <p><b>{t("disclaimer.title")}</b> {t("disclaimer.body")}</p>
        </div>

        <section className="mb-8 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-l from-primary via-primary to-gold bg-clip-text text-transparent">
            {t("hero.title")}
          </h2>
          <p className="text-muted-foreground leading-relaxed">{t("hero.body")}</p>
        </section>

        {!mode ? (
          <section className="max-w-5xl mx-auto" dir={lang === "ar" ? "rtl" : "ltr"}>
            <div className="text-center mb-6">
              <h3 className="text-xl md:text-2xl font-bold mb-2">ابدأ باختيار نوع الحساب</h3>
              <p className="text-sm text-muted-foreground">اختَر المسار الذي يناسبك لعرض الأسئلة الخاصة به فقط.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <ModeCard color="from-primary/15 to-primary/5 border-primary/30" icon={<Users className="h-6 w-6 text-primary" />}
                title={t("tabs.individual")} desc="زكاة المال والذهب والفضة والراتب والاستثمارات للأفراد." onClick={() => setMode("individual")} />
              <ModeCard color="from-emerald-500/15 to-emerald-500/5 border-emerald-500/30" icon={<Building2 className="h-6 w-6 text-emerald-600" />}
                title={t("tabs.company")} desc="زكاة عروض التجارة والمخزون والذمم للشركات والمؤسسات." onClick={() => setMode("company")} />
              <ModeCard color="from-gold/20 to-gold/5 border-gold/40" icon={<Wheat className="h-6 w-6 text-gold" />}
                title={t("tabs.fitr")} desc="حساب زكاة الفطر لأفراد الأسرة قبيل عيد الفطر." onClick={() => setMode("fitr")} />
            </div>
            <div className="mt-8 max-w-4xl mx-auto">
              <div className="text-xs text-muted-foreground text-center mb-2">سجل النصاب التاريخي (مرجعي)</div>
              <NisabHistory />
            </div>
          </section>
        ) : (
          <div className="max-w-6xl mx-auto space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
            <button onClick={() => setMode(null)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ArrowRight className="h-4 w-4" /> تغيير نوع الحساب
            </button>
            <Suspense fallback={<TabFallback />}>
              {mode === "individual" && <IndividualTab />}
              {mode === "company" && <CompanyTab />}
              {mode === "fitr" && <FitrCalculator />}
            </Suspense>
          </div>
        )}
      </main>
    </div>
  );
}

function ModeCard({ color, icon, title, desc, onClick }: { color: string; icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`text-right group rounded-xl border-2 bg-gradient-to-br ${color} p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="h-11 w-11 rounded-lg bg-background/70 flex items-center justify-center shadow-sm">{icon}</div>
        <h4 className="font-bold text-lg">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      <div className="mt-3 text-xs font-semibold text-primary group-hover:underline">ابدأ الحساب ←</div>
    </button>
  );
}

function HeaderAuth() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/history"><Button variant="outline" size="sm" className="gap-1.5"><History className="h-4 w-4" /> <span className="hidden sm:inline">السجل</span></Button></Link>
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
