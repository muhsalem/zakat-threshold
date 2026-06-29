import { createFileRoute, Link } from "@tanstack/react-router";
import { GroupConsolidation } from "@/components/zakat/GroupConsolidation";
import { PartnerDistribution } from "@/components/zakat/PartnerDistribution";
import { SukukSection } from "@/components/zakat/SukukSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Building2, Users, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/group-zakat")({
  head: () => ({
    meta: [
      { title: "زكاة المجموعات والشركاء والصكوك | حاسبة الزكاة" },
      { name: "description", content: "أدوات احتساب الزكاة الموحّدة للمجموعات القابضة والتابعة، وتوزيعها على الشركاء، وزكاة الصكوك الإسلامية وفق AAOIFI." },
      { property: "og:title", content: "زكاة المجموعات والشركاء والصكوك" },
      { property: "og:description", content: "Consolidated Zakat، توزيع الشركاء، وزكاة الصكوك وفق AAOIFI." },
    ],
    links: [{ rel: "canonical", href: "/group-zakat" }],
  }),
  component: GroupZakatPage,
});

function GroupZakatPage() {
  return (
    <div className="min-h-screen container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">زكاة المجموعات والشركاء والصكوك</h1>
        <Link to="/"><Button variant="outline" size="sm" className="gap-1.5"><ArrowRight className="h-4 w-4" /> العودة</Button></Link>
      </div>

      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        ثلاث أدوات متقدمة للمؤسسات: <b>توحيد زكاة المجموعة</b> (قابضة + تابعات)،
        <b> توزيع الزكاة على الشركاء</b> بنسب ملكيتهم، و<b>زكاة الصكوك الإسلامية</b> بأنواعها
        وفق المعيار الشرعي AAOIFI رقم 17 و FAS 9.
      </p>

      <Tabs defaultValue="group" dir="rtl" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="group" className="gap-1.5 text-xs md:text-sm"><Building2 className="h-3.5 w-3.5" /> توحيد المجموعة</TabsTrigger>
          <TabsTrigger value="partners" className="gap-1.5 text-xs md:text-sm"><Users className="h-3.5 w-3.5" /> توزيع الشركاء</TabsTrigger>
          <TabsTrigger value="sukuk" className="gap-1.5 text-xs md:text-sm"><Coins className="h-3.5 w-3.5" /> الصكوك</TabsTrigger>
        </TabsList>
        <TabsContent value="group"><GroupConsolidation /></TabsContent>
        <TabsContent value="partners"><PartnerDistribution /></TabsContent>
        <TabsContent value="sukuk"><SukukSection /></TabsContent>
      </Tabs>
    </div>
  );
}
