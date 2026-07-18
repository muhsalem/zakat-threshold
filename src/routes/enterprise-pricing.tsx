import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Mail, Sparkles } from "lucide-react";
import { BUSINESS_PLANS } from "@/lib/geo/plans";
import { PriceTag } from "@/components/pricing/PriceTag";
import { CountrySwitcher } from "@/components/pricing/CountrySwitcher";
import { useGeoPricing } from "@/hooks/useGeoPricing";

export const Route = createFileRoute("/enterprise-pricing")({
  head: () => ({
    meta: [
      { title: "خطط المؤسسات والتسعير — نِصاب" },
      {
        name: "description",
        content:
          "خطط مؤسسية بأسعار محلية حسب دولتك — Startup, Business, Enterprise مع ERP وSSO ودعم شرعي مخصّص.",
      },
      { property: "og:title", content: "خطط المؤسسات والتسعير — نِصاب" },
      {
        property: "og:description",
        content: "حلول زكاة مؤسسية بتسعير عادل عالمياً (PPP).",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnterprisePricing,
});

type Val = boolean | string;
const COMPARE: { label: string; startup: Val; business: Val; enterprise: Val }[] = [
  { label: "حساب زكاة الأفراد", startup: true, business: true, enterprise: true },
  { label: "حساب زكاة الشركات (AAOIFI-35)", startup: true, business: true, enterprise: true },
  { label: "زكاة المجموعة والشركاء", startup: false, business: true, enterprise: true },
  { label: "تكامل ERP", startup: "—", business: "أساسي", enterprise: "مخصّص" },
  { label: "SSO / SAML / SCIM", startup: false, business: false, enterprise: true },
  { label: "هيئة شرعية مخصّصة", startup: false, business: "استشارات", enterprise: true },
  { label: "SLA", startup: "99.5%", business: "99.9%", enterprise: "99.99%" },
  { label: "الدعم", startup: "بريد", business: "أولوية 8س", enterprise: "24/7 مخصّص" },
  { label: "المستخدمون", startup: "3", business: "25", enterprise: "غير محدود" },
];

function Cell({ v }: { v: Val }) {
  if (v === true) return <Check className="h-4 w-4 text-primary mx-auto" />;
  if (v === false) return <span className="text-muted-foreground text-xs">—</span>;
  return <span className="text-xs">{v}</span>;
}

function EnterprisePricing() {
  const { code, info } = useGeoPricing();

  return (
    <div className="container max-w-6xl py-10 space-y-10" dir="rtl">
      <header className="text-center space-y-4">
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3.5 w-3.5" /> خطط المؤسسات
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold">تسعير مصمَّم للنمو المؤسسي</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          حلول زكاة كاملة للشركات والبنوك الإسلامية والصناديق الوقفية — بأسعار
          محلية معتمدة على منطقة{" "}
          <span className="font-semibold">
            {info.flag} {info.nameAr}
          </span>
          .
        </p>
        <div className="flex justify-center pt-2">
          <CountrySwitcher />
        </div>
      </header>

      <section className="grid md:grid-cols-3 gap-5">
        {BUSINESS_PLANS.map((t) => {
          const Icon = t.icon;
          return (
            <Card
              key={t.id}
              className={t.highlight ? "border-primary shadow-lg relative flex flex-col" : "flex flex-col"}
            >
              {t.badge && <Badge className="absolute -top-3 right-4">{t.badge}</Badge>}
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle>{t.name}</CardTitle>
                </div>
                <PriceTag
                  usdPrice={t.usdPrice}
                  countryCode={code}
                  billing={t.billing}
                  anchorLabel={t.priceAnchorLabel}
                />

                <p className="text-sm text-muted-foreground">{t.tagline}</p>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <ul className="space-y-2 text-sm flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {t.ctaTo ? (
                  <Link to={t.ctaTo}>
                    <Button className="w-full" variant={t.highlight ? "default" : "outline"}>
                      ابدأ {t.name}
                    </Button>
                  </Link>
                ) : (
                  <a href={t.ctaHref}>
                    <Button className="w-full gap-1.5" variant="outline">
                      <Mail className="h-4 w-4" /> اتصل بالمبيعات
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">مقارنة تفصيلية</h2>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-end p-3">الميزة</th>
                <th className="p-3">Startup</th>
                <th className="p-3 bg-primary/5">Business</th>
                <th className="p-3">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.label} className="border-t">
                  <td className="p-3 text-end font-medium">{r.label}</td>
                  <td className="p-3 text-center">
                    <Cell v={r.startup} />
                  </td>
                  <td className="p-3 text-center bg-primary/5">
                    <Cell v={r.business} />
                  </td>
                  <td className="p-3 text-center">
                    <Cell v={r.enterprise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-muted/30 rounded-lg p-6 text-center space-y-3">
        <h2 className="text-xl font-bold">هل تحتاج حلاً مخصّصاً؟</h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          فريقنا يصمّم عقود مؤسسية للبنوك الإسلامية وصناديق الأوقاف والمجموعات
          متعددة الجنسيات — تشمل الاستضافة السيادية والتدقيق الشرعي.
        </p>
        <a href="mailto:enterprise@nisab.app">
          <Button className="gap-1.5">
            <Mail className="h-4 w-4" /> تحدّث مع المبيعات
          </Button>
        </a>
      </section>
    </div>
  );
}
