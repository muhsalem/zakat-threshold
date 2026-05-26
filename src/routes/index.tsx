import { createFileRoute, Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndividualTab } from "@/components/zakat/IndividualTab";
import { CompanyTab } from "@/components/zakat/CompanyTab";
import { NisabHistory } from "@/components/zakat/NisabHistory";
import { FitrCalculator } from "@/components/zakat/FitrCalculator";
import { BeginnerWizard } from "@/components/zakat/BeginnerWizard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Users, Building2, Scroll, Moon, ShieldCheck, FileText, Wheat, History, LogIn, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/")({
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
              <p className="text-xs text-muted-foreground">للأفراد والشركات — وفق الضوابط الشرعية</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <HeaderAuth />
          </div>
        </div>

      </header>

      <main className="container mx-auto px-4 py-8">

        <section className="mb-8 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-l from-primary via-primary to-gold bg-clip-text text-transparent">
            احسب زكاتك بدقة وفق المنهج الشرعي
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            نموذج شامل لزكاة الذهب والفضة والنقود والأسهم والأوراق التجارية وعروض التجارة والزروع والأنعام،
            مع زكاة الفطر، والركاز والمعادن والثروات المستحدثة، ونموذج مخصص للشركات.
          </p>
        </section>

        <Tabs defaultValue="individual" className="space-y-6">
          <TabsList dir="rtl" className="grid grid-cols-3 md:grid-cols-5 w-full max-w-4xl mx-auto h-auto gap-1">

            <TabsTrigger value="wizard" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" /> المبتدئ
            </TabsTrigger>
            <TabsTrigger value="individual" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4" /> الأفراد
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4" /> الشركات
            </TabsTrigger>
            <TabsTrigger value="fitr" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Wheat className="h-3.5 w-3.5 md:h-4 md:w-4" /> زكاة الفطر
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs md:text-sm py-2.5">
              <Scroll className="h-3.5 w-3.5 md:h-4 md:w-4" /> الأنصبة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wizard"><BeginnerWizard /></TabsContent>
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
        <Link to="/history"><Button variant="outline" size="sm" className="gap-1.5"><History className="h-4 w-4" /> <span className="hidden sm:inline">سجل الزكاة</span></Button></Link>
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


