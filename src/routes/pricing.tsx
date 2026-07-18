import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, Mail, Sparkles, Info } from "lucide-react";
import { INDIVIDUAL_PLANS, BUSINESS_PLANS, type Plan } from "@/lib/geo/plans";
import { PriceTag } from "@/components/pricing/PriceTag";
import { CountrySwitcher } from "@/components/pricing/CountrySwitcher";
import { useGeoPricing } from "@/hooks/useGeoPricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "الاشتراكات والخطط — نِصاب | تسعير عادل حسب دولتك" },
      {
        name: "description",
        content:
          "اشتراكات وخطط نِصاب للأفراد والشركات بأسعار محلية تراعي القوة الشرائية لبلدك — من مصر والخليج إلى العالم.",
      },
      { property: "og:title", content: "الاشتراكات والخطط — نِصاب" },
      { property: "og:description", content: "تسعير عادل عالمياً (PPP) — أفراد وشركات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

function PlanCard({ plan, countryCode }: { plan: Plan; countryCode: string | null }) {
  const Icon = plan.icon;
  return (
    <Card
      className={
        plan.highlight
          ? "border-primary shadow-lg relative flex flex-col"
          : "flex flex-col"
      }
    >
      {plan.badge && (
        <Badge className="absolute -top-3 right-4">{plan.badge}</Badge>
      )}
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle>{plan.name}</CardTitle>
        </div>
        <PriceTag
          usdPrice={plan.usdPrice}
          countryCode={countryCode}
          billing={plan.billing}
          anchorLabel={plan.priceAnchorLabel}
        />

        <p className="text-sm text-muted-foreground">{plan.tagline}</p>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        <ul className="space-y-2 text-sm flex-1">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-2">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {plan.ctaTo ? (
          <Link to={plan.ctaTo}>
            <Button
              className="w-full"
              variant={plan.highlight ? "default" : "outline"}
            >
              {plan.usdPrice === 0 ? "ابدأ مجاناً" : `اختر ${plan.name}`}
            </Button>
          </Link>
        ) : (
          <a href={plan.ctaHref}>
            <Button className="w-full gap-1.5" variant="outline">
              <Mail className="h-4 w-4" /> تواصل مع المبيعات
            </Button>
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function PricingPage() {
  const { code, info } = useGeoPricing();
  const [tab, setTab] = useState<"individual" | "business">("individual");

  return (
    <div className="container max-w-6xl py-10 space-y-8" dir="rtl">
      <header className="text-center space-y-4">
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3.5 w-3.5" /> تسعير عادل عالمياً
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold">
          أسعار مصمَّمة لبلدك
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          نطبّق مبدأ <b>Purchasing Power Parity</b> — كل منطقة تدفع بحسب قوتها
          الشرائية. عرضك الحالي مبني على{" "}
          <span className="font-semibold">
            {info.flag} {info.nameAr}
          </span>
          .
        </p>
        <div className="flex justify-center pt-2">
          <CountrySwitcher />
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "individual" | "business")}>
        <TabsList className="mx-auto grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="individual">للأفراد</TabsTrigger>
          <TabsTrigger value="business">للشركات</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="mt-6">
          <div className="grid md:grid-cols-3 gap-5">
            {INDIVIDUAL_PLANS.map((p) => (
              <PlanCard key={p.id} plan={p} countryCode={code} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="business" className="mt-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-5">
            {BUSINESS_PLANS.map((p) => (
              <PlanCard key={p.id} plan={p} countryCode={code} />
            ))}
          </div>
          <div className="text-center">
            <Link to="/enterprise-pricing" className="text-sm text-primary hover:underline">
              عرض المقارنة التفصيلية للشركات ←
            </Link>
          </div>
        </TabsContent>
      </Tabs>

      <section className="bg-muted/30 rounded-lg p-6 space-y-3 border">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold">كيف نحدّد أسعار الاشتراكات؟</p>
            <p className="text-muted-foreground leading-relaxed">
              نصنّف الدول إلى 4 مناطق مستوحاة من البنك الدولي — دول عالية الدخل
              (T1) تدفع السعر الكامل، دول متوسطة الدخل الأعلى (T2) 60%، دول
              متوسطة الدخل الأدنى (T3) 35%، والدول منخفضة الدخل (T4) 20% فقط.
              الفوترة الفعلية تتم بالدولار الأمريكي، لكن السعر المعروض بعملة
              بلدك تقريبياً لسهولة الفهم.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
