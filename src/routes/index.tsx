import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndividualTab } from "@/components/zakat/IndividualTab";
import { CompanyTab } from "@/components/zakat/CompanyTab";
import { NisabHistory } from "@/components/zakat/NisabHistory";
import { SectoralModels } from "@/components/zakat/SectoralModels";
import { Users, Building2, Scroll, Moon, FileSpreadsheet } from "lucide-react";

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
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            حساب فوري — لا تُحفظ بياناتك
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
            مع نموذج مخصص لزكاة الشركات بطرق المحاسبة المعتمدة، والتدقيق والامتثال والحوكمة الشرعية.
          </p>
        </section>

        <Tabs defaultValue="individual" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl mx-auto h-auto">
            <TabsTrigger value="individual" className="gap-2 text-sm py-2.5">
              <Users className="h-4 w-4" /> الأفراد
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2 text-sm py-2.5">
              <Building2 className="h-4 w-4" /> حساب زكاة الشركات
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 text-sm py-2.5">
              <Scroll className="h-4 w-4" /> النصاب اليوم
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual"><IndividualTab /></TabsContent>
          <TabsContent value="company">
            <Tabs defaultValue="main" className="space-y-4">
              <TabsList className="grid grid-cols-2 w-full max-w-xl mx-auto h-auto">
                <TabsTrigger value="main" className="gap-2 text-sm py-2.5">
                  <Building2 className="h-4 w-4" /> النموذج الرئيسي
                </TabsTrigger>
                <TabsTrigger value="sectoral" className="gap-2 text-sm py-2.5">
                  <FileSpreadsheet className="h-4 w-4" /> نماذج محاسبية قطاعية
                </TabsTrigger>
              </TabsList>
              <TabsContent value="main"><CompanyTab /></TabsContent>
              <TabsContent value="sectoral"><SectoralModels /></TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="history" className="max-w-4xl mx-auto"><NisabHistory /></TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border/60 mt-16 py-6 text-center text-xs text-muted-foreground">
        <p>هذه الحاسبة أداة إرشادية. للحالات الخاصة يُرجى مراجعة عالم/مفتٍ معتمد أو هيئة الفتوى المحلية.</p>
      </footer>
    </div>
  );
}
