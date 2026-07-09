import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FontSizeToggle } from "@/components/FontSizeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Moon,
  ShieldCheck,
  Sparkles,
  Users,
  Building2,
  Briefcase,
  Calculator,
  FileCheck2,
  Mail,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Star,
  Globe2,
  LogIn,
  LogOut,
  Award,
  BookOpen,
  Cpu,
  Lock,
  Database,
  LineChart,
  Landmark,
  HandCoins,
  Scale,
  Zap,
  PhoneCall,
  FileText,
} from "lucide-react";
// removed home-page calculator import (calculator moved into accountant dashboard)
import nisabLogo from "@/assets/nisab-logo.png.asset.json";
import { PayButton } from "@/components/PayButton";
import type { PlanId } from "@/lib/payments";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "نِصاب — منصة زكاة شرعية معتمدة للأفراد والشركات" },
      {
        name: "description",
        content:
          "منصة نِصاب: احسب زكاتك بدقة شرعية، أرسل بياناتك لمحاسب معتمد، واستلم تقريراً رسمياً خلال يومي عمل. خطط تسعير مرنة للأفراد والشركات والمؤسسات.",
      },
      { property: "og:title", content: "نِصاب — منصة زكاة شرعية معتمدة" },
      {
        property: "og:description",
        content: "أدوات حساب + محاسبون معتمدون + تقارير رسمية خلال يومَي عمل. للأفراد والشركات.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app/og-image.jpg" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "نِصاب — منصة الزكاة",
          description: "منصة زكاة معتمدة للأفراد والشركات والمؤسسات وفق معايير AAOIFI 35.",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          inLanguage: "ar",
          offers: [
            { "@type": "Offer", name: "الفرد — أساسي", price: "0", priceCurrency: "USD" },
            { "@type": "Offer", name: "الفرد — معتمد", price: "19", priceCurrency: "USD" },
            { "@type": "Offer", name: "الشركات — Startup", price: "149", priceCurrency: "USD" },
            { "@type": "Offer", name: "الشركات — Enterprise", price: "499", priceCurrency: "USD" },
          ],
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <ForWhom />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}

/* ---------------- Header ---------------- */

function SiteHeader() {
  return (
    <header className="border-b border-border/60 bg-card/70 backdrop-blur sticky top-0 z-30">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={nisabLogo.url}
            alt="نِصاب — حاسبة الزكاة"
            className="h-12 w-12 rounded-xl object-contain bg-white shadow-md"
          />
          <div className="leading-tight">
            <div className="font-bold">نِصاب</div>
            <div className="text-[10px] text-muted-foreground">Zakat Platform</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <a href="#features" className="hover:text-primary">
            المميزات
          </a>
          <a href="#how" className="hover:text-primary">
            كيف تعمل
          </a>
          <a href="#pricing" className="hover:text-primary">
            الأسعار
          </a>
          <a href="#faq" className="hover:text-primary">
            الأسئلة
          </a>
        </nav>
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <FontSizeToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}



/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 -z-10 bg-gradient-to-bl from-primary/10 via-background to-gold/5" />
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl -z-10" />
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-gold/20 blur-3xl -z-10" />

      <div className="container mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <Badge variant="outline" className="gap-1.5 border-primary/40 bg-primary/5 text-primary">
            <Sparkles className="h-3.5 w-3.5" /> منصة الزكاة الأولى المعتمدة شرعياً ومحاسبياً
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.15]">
            احسب زكاتك بدقة —
            <span className="block bg-gradient-to-l from-primary via-primary to-gold bg-clip-text text-transparent">
              واستلم تقريراً رسمياً خلال يومَي عمل
            </span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
            نجمع بين حاسبة ذكية مبنية على معايير <b>AAOIFI 35</b> و
            <b>الاتحاد الدولي لعلماء المسلمين</b>، وبين شبكة محاسبين معتمدين يراجعون بياناتك ويرسلون
            التقرير النهائي إلى بريدك.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/client-intake">
              <Button size="lg" className="gap-2 text-base h-12 px-6">
                <Users className="h-5 w-5" /> ابدأ كفرد — مجاناً
              </Button>
            </Link>
            <Link to="/client-intake">
              <Button size="lg" variant="outline" className="gap-2 text-base h-12 px-6">
                <Building2 className="h-5 w-5" /> ابدأ كشركة / مؤسسة
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> بيانات مشفّرة
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4 text-primary" /> تقرير خلال يومَي عمل
            </span>
            <span className="inline-flex items-center gap-1">
              <FileCheck2 className="h-4 w-4 text-gold" /> اعتماد محاسب مرخّص
            </span>
          </div>
        </div>

        {/* Right visual: workflow preview card */}
        <div className="relative">
          <div className="rounded-2xl border bg-card/80 backdrop-blur shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> تقرير الزكاة السنوي
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 border-0">جاهز للإرسال</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatMini label="إجمالي الأصول" value="128,400" />
              <StatMini label="الالتزامات" value="12,600" />
              <StatMini label="الوعاء الزكوي" value="115,800" tone="primary" />
              <StatMini label="زكاة مستحقة" value="2,895" tone="gold" />
            </div>
            <div className="border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>معتمد من محاسب قانوني مرخّص — CPA</span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> مطابق AAOIFI 35
              </span>
            </div>
          </div>
          <div className="absolute -bottom-6 -right-6 rounded-xl border bg-card px-4 py-3 shadow-lg hidden md:flex items-center gap-2 text-xs">
            <Mail className="h-4 w-4 text-primary" /> يصلك على بريدك خلال 48 ساعة
          </div>
        </div>
      </div>
    </section>
  );
}

function StatMini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary" | "gold";
}) {
  const cls =
    tone === "primary" ? "text-primary" : tone === "gold" ? "text-gold" : "text-foreground";
  return (
    <div className="rounded-lg border bg-background/50 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${cls}`} dir="ltr">
        {value}
      </div>
    </div>
  );
}

/* ---------------- Trust ---------------- */

function TrustBar() {
  const items = [
    "AAOIFI 35",
    "الاتحاد الدولي لعلماء المسلمين",
    "هيئة الزكاة والضريبة (السعودية)",
    "IFRS متوافق",
    "GDPR",
    "ISO 27001 روحاً",
  ];
  return (
    <section className="border-y bg-muted/30" dir="rtl">
      <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground/70">مرجعيات وتوافق:</span>
        {items.map((i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {i}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Features ---------------- */

function Features() {
  const features = [
    {
      icon: Scale,
      title: "دقة شرعية مطلقة",
      desc: "محرك فتوى يقارن 5 مذاهب و15+ هيئة شرعية، مع مراجع لكل حكم.",
    },
    {
      icon: Cpu,
      title: "أدوات ذكية 40+",
      desc: "زكاة الذهب، الأسهم، العقار، الصكوك، التكافل، الأصول الرقمية، والزروع والأنعام.",
    },
    {
      icon: Briefcase,
      title: "شبكة محاسبين معتمدين",
      desc: "مراجعة بشرية من محاسبين قانونيين مرخّصين قبل إصدار التقرير.",
    },
    {
      icon: Clock,
      title: "تقرير خلال 48 ساعة",
      desc: "التزام زمني موثّق: تقرير معتمد يصل بريدك خلال يومَي عمل من الإرسال.",
    },
    {
      icon: Database,
      title: "ربط ERP مباشر",
      desc: "Odoo، SAP، Zoho: استيراد ميزان المراجعة تلقائياً بدون إدخال يدوي.",
    },
    {
      icon: Lock,
      title: "أمان بنكي",
      desc: "تشفير AES-256، RLS على كل صف، ولا مشاركة بيانات مع طرف ثالث.",
    },
    {
      icon: LineChart,
      title: "تحليلات وامتثال",
      desc: "لوحات KPI، تنبيهات حَوْل، مقارنة سنوات، وتحقق من اكتمال البيانات.",
    },
    {
      icon: Globe2,
      title: "متعدد الدول والعملات",
      desc: "أسعار ذهب وفضة حية، أنصبة محلية، وتقارير بلغات وعملات متعددة.",
    },
    {
      icon: HandCoins,
      title: "توزيع المصارف الثمانية",
      desc: "أداة توزيع الزكاة على المستحقين مع سجل تبرعات قابل للتدقيق.",
    },
  ];
  return (
    <section id="features" className="container mx-auto px-4 py-20" dir="rtl">
      <SectionHeader
        eyebrow="لماذا نِصاب"
        title="كل ما تحتاجه لحساب زكاتك في مكان واحد"
        subtitle="من الحسبة السريعة إلى التقرير المعتمد — منظومة متكاملة تجمع الشريعة والمحاسبة والتقنية."
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <Card
              key={f.title}
              className="group hover:border-primary/50 hover:shadow-lg transition-all"
            >
              <CardContent className="p-6 space-y-3">
                <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-lg">{f.title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
      <div className="text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</div>
      <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
      {subtitle && <p className="text-muted-foreground leading-relaxed">{subtitle}</p>}
    </div>
  );
}

/* ---------------- How it works ---------------- */

function HowItWorks() {
  const steps = [
    {
      n: 1,
      icon: LogIn,
      title: "سجّل الدخول واختر نوعك",
      desc: "فرد أو شركة أو مؤسسة — نُخصّص النموذج حسب اختيارك.",
    },
    {
      n: 2,
      icon: Calculator,
      title: "املأ نموذج البيانات المالية",
      desc: "نقد، ذهب، استثمارات، مخزون، ذمم، والتزامات — بواجهة عربية سهلة.",
    },
    {
      n: 3,
      icon: Mail,
      title: "تصل بياناتك للمحاسب",
      desc: "يستلم المحاسب المعتمد ملفك مباشرة، ويراجعه وفق المعايير الشرعية.",
    },
    {
      n: 4,
      icon: FileCheck2,
      title: "تقرير رسمي على بريدك",
      desc: "خلال يومَي عمل يصلك تقرير PDF مختوم برقم مرجعي قابل للتحقق.",
    },
  ];
  return (
    <section id="how" className="bg-muted/30 border-y" dir="rtl">
      <div className="container mx-auto px-4 py-20">
        <SectionHeader
          eyebrow="كيف تعمل المنصة"
          title="أربع خطوات — من الإدخال إلى التقرير المعتمد"
          subtitle="نفس الرحلة للأفراد والشركات، مع اختلاف حقول البيانات والأتعاب."
        />
        <div className="grid md:grid-cols-4 gap-4">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="relative rounded-xl border bg-card p-6 space-y-3">
                <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md">
                  {s.n}
                </div>
                <Icon className="h-8 w-8 text-primary" />
                <div className="font-semibold">{s.title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- For whom ---------------- */

function ForWhom() {
  return (
    <section className="container mx-auto px-4 py-20" dir="rtl">
      <SectionHeader eyebrow="لمن هذه المنصة" title="حل مخصّص لكل فئة" />
      <div className="grid md:grid-cols-3 gap-4">
        <AudienceCard
          icon={<Users className="h-6 w-6" />}
          title="للأفراد"
          points={[
            "زكاة المال والذهب والاستثمارات",
            "تذكير حَوْلي تلقائي",
            "تقرير معتمد للجهات الرسمية",
            "احتساب زكاة الفطر",
          ]}
          ctaLabel="ابدأ حسابي الشخصي"
          ctaTo="/client-intake"
        />
        <AudienceCard
          icon={<Building2 className="h-6 w-6" />}
          title="للشركات"
          points={[
            "زكاة عروض التجارة والمخزون",
            "استيراد ميزان المراجعة",
            "زكاة الأسهم والاستثمارات",
            "توزيع على الشركاء",
          ]}
          ctaLabel="ابدأ حساب الشركة"
          ctaTo="/client-intake"
          highlight
        />
        <AudienceCard
          icon={<Landmark className="h-6 w-6" />}
          title="للمؤسسات والأوقاف"
          points={[
            "زكاة الصكوك والتكافل",
            "تقارير امتثال ESG",
            "ربط ERP مؤسسي",
            "لوحة إدارة متعددة الفروع",
          ]}
          ctaLabel="تواصل مع المبيعات"
          ctaTo="/enterprise"
        />
      </div>
    </section>
  );
}

function AudienceCard({
  icon,
  title,
  points,
  ctaLabel,
  ctaTo,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  points: string[];
  ctaLabel: string;
  ctaTo: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`transition hover:shadow-xl ${highlight ? "border-primary/60 bg-primary/5 relative overflow-hidden" : ""}`}
    >
      {highlight && (
        <div className="absolute top-3 left-3">
          <Badge className="bg-primary text-primary-foreground border-0">الأكثر طلباً</Badge>
        </div>
      )}
      <CardHeader>
        <div
          className={`h-12 w-12 rounded-xl flex items-center justify-center ${highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}
        >
          {icon}
        </div>
        <CardTitle className="mt-3 text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <Link to={ctaTo}>
          <Button variant={highlight ? "default" : "outline"} className="w-full gap-1.5">
            {ctaLabel} <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/* ---------------- Pricing ---------------- */

// أسعار صرف تقريبية مقابل الدولار (تُحدَّث دورياً)
const CURRENCIES: Record<
  string,
  { code: string; symbol: string; rate: number; label: string; round: number }
> = {
  USD: { code: "USD", symbol: "$", rate: 1, label: "دولار أمريكي", round: 1 },
  SAR: { code: "SAR", symbol: "ر.س", rate: 3.75, label: "ريال سعودي", round: 5 },
  AED: { code: "AED", symbol: "د.إ", rate: 3.67, label: "درهم إماراتي", round: 5 },
  QAR: { code: "QAR", symbol: "ر.ق", rate: 3.64, label: "ريال قطري", round: 5 },
  KWD: { code: "KWD", symbol: "د.ك", rate: 0.307, label: "دينار كويتي", round: 1 },
  BHD: { code: "BHD", symbol: "د.ب", rate: 0.376, label: "دينار بحريني", round: 1 },
  OMR: { code: "OMR", symbol: "ر.ع", rate: 0.385, label: "ريال عُماني", round: 1 },
  EGP: { code: "EGP", symbol: "ج.م", rate: 48, label: "جنيه مصري", round: 10 },
  JOD: { code: "JOD", symbol: "د.أ", rate: 0.709, label: "دينار أردني", round: 1 },
  MAD: { code: "MAD", symbol: "د.م", rate: 10, label: "درهم مغربي", round: 5 },
  TND: { code: "TND", symbol: "د.ت", rate: 3.15, label: "دينار تونسي", round: 1 },
  DZD: { code: "DZD", symbol: "د.ج", rate: 134, label: "دينار جزائري", round: 50 },
  TRY: { code: "TRY", symbol: "₺", rate: 34, label: "ليرة تركية", round: 10 },
  MYR: { code: "MYR", symbol: "RM", rate: 4.7, label: "رينغيت ماليزي", round: 1 },
  IDR: { code: "IDR", symbol: "Rp", rate: 15800, label: "روبية إندونيسية", round: 5000 },
  PKR: { code: "PKR", symbol: "₨", rate: 278, label: "روبية باكستانية", round: 50 },
  GBP: { code: "GBP", symbol: "£", rate: 0.78, label: "جنيه إسترليني", round: 1 },
  EUR: { code: "EUR", symbol: "€", rate: 0.92, label: "يورو", round: 1 },
};

const COUNTRY_TO_CCY: Record<string, string> = {
  SA: "SAR",
  AE: "AED",
  QA: "QAR",
  KW: "KWD",
  BH: "BHD",
  OM: "OMR",
  EG: "EGP",
  JO: "JOD",
  MA: "MAD",
  TN: "TND",
  DZ: "DZD",
  TR: "TRY",
  MY: "MYR",
  ID: "IDR",
  PK: "PKR",
  GB: "GBP",
  UK: "GBP",
  IE: "EUR",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  BE: "EUR",
  US: "USD",
};

function detectCurrency(): string {
  if (typeof navigator === "undefined") return "USD";
  const langs = [navigator.language, ...(navigator.languages ?? [])];
  for (const l of langs) {
    const cc = l.split("-")[1]?.toUpperCase();
    if (cc && COUNTRY_TO_CCY[cc]) return COUNTRY_TO_CCY[cc];
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Riyadh")) return "SAR";
    if (tz.includes("Dubai")) return "AED";
    if (tz.includes("Cairo")) return "EGP";
    if (tz.includes("Kuwait")) return "KWD";
    if (tz.includes("Qatar")) return "QAR";
    if (tz.includes("Bahrain")) return "BHD";
    if (tz.includes("Muscat")) return "OMR";
    if (tz.includes("Amman")) return "JOD";
    if (tz.includes("Istanbul")) return "TRY";
    if (tz.includes("Casablanca")) return "MAD";
    if (tz.includes("Kuala_Lumpur")) return "MYR";
    if (tz.includes("Jakarta")) return "IDR";
    if (tz.includes("Karachi")) return "PKR";
    if (tz.includes("London")) return "GBP";
  } catch {}
  return "USD";
}

function formatPrice(usd: number, ccyCode: string): string {
  const c = CURRENCIES[ccyCode] ?? CURRENCIES.USD;
  const raw = usd * c.rate;
  const rounded = Math.max(c.round, Math.round(raw / c.round) * c.round);
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(rounded);
  return c.code === "USD" ? `$${formatted}` : `${formatted} ${c.symbol}`;
}

function Pricing() {
  const [ccy, setCcy] = useState<string>("USD");
  useEffect(() => {
    setCcy(detectCurrency());
  }, []);
  const current = CURRENCIES[ccy] ?? CURRENCIES.USD;

  return (
    <section id="pricing" className="bg-muted/30 border-y" dir="rtl">
      <div className="container mx-auto px-4 py-20">
        <SectionHeader
          eyebrow="خطط الأسعار"
          title="ادفع مقابل ما تحتاجه فقط"
          subtitle="أسعار شفافة بلا رسوم خفية. جميع الخطط تشمل التحديثات ودعم عربي."
        />

        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-xs text-muted-foreground">العملة:</span>
          <select
            value={ccy}
            onChange={(e) => setCcy(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
            aria-label="اختر عملة العرض"
          >
            {Object.values(CURRENCIES).map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} ({c.code})
              </option>
            ))}
          </select>
          {ccy !== "USD" && (
            <span className="text-[11px] text-muted-foreground">
              (تحويل تقريبي من الدولار — 1$ ≈ {current.rate} {current.symbol})
            </span>
          )}
        </div>

        <div className="mb-10">
          <div className="text-center mb-6">
            <Badge variant="outline" className="text-sm py-1.5 px-3">
              <Users className="h-4 w-4 ml-1" /> خطط الأفراد
            </Badge>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <PriceCard
              name="مجاني"
              priceUSD={0}
              ccy={ccy}
              period="دائماً"
              tagline="للتسجيل وبدء رحلة الحساب"
              cta="ابدأ الآن"
              to="/client-intake"
              features={[
                "تسجيل البيانات ورفع المستندات",
                "زكاة الفطر والذهب والفضة",
                "سجل النصاب التاريخي",
                "تقرير PDF غير معتمد",
              ]}
            />
            <PriceCard
              name="معتمد"
              priceUSD={19}
              ccy={ccy}
              period="/ تقرير"
              tagline="تقرير رسمي بمراجعة محاسب"
              highlight
              badge="الأكثر شعبية"
              cta="اطلب تقريري"
              to="/client-intake"
              planId="certified"
              features={[
                "كل ميزات المجاني",
                "مراجعة محاسب معتمد",
                "تقرير PDF مختوم + رقم تحقق",
                "إرسال على البريد خلال يومَي عمل",
                "استشارة شرعية مكتوبة",
              ]}
            />
            <PriceCard
              name="سنوي VIP"
              priceUSD={79}
              ccy={ccy}
              period="/ سنة"
              tagline="متابعة كاملة على مدار الحول"
              cta="اشترك سنوياً"
              to="/client-intake"
              planId="vip_annual"
              features={[
                "4 تقارير معتمدة سنوياً",
                "تذكير حَوْلي بالبريد والواتساب",
                "أرشيف تقارير مؤمّن",
                "أولوية دعم مباشر",
                "استشارات شرعية غير محدودة",
              ]}
            />
          </div>
        </div>

        <div>
          <div className="text-center mb-6">
            <Badge variant="outline" className="text-sm py-1.5 px-3">
              <Building2 className="h-4 w-4 ml-1" /> خطط الشركات والمؤسسات
            </Badge>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <PriceCard
              name="Startup"
              priceUSD={149}
              ccy={ccy}
              period="/ شهر"
              tagline="للشركات الناشئة وSMEs"
              cta="ابدأ اشتراك الشركة"
              to="/client-intake"
              planId="startup"
              features={[
                "حساب زكوي شهري/سنوي",
                "حتى 100 قيد محاسبي",
                "استيراد Excel و CSV",
                "تقرير معتمد ربع سنوي",
                "دعم بريدي (48 ساعة)",
              ]}
            />
            <PriceCard
              name="Business"
              priceUSD={499}
              ccy={ccy}
              period="/ شهر"
              tagline="للشركات متوسطة الحجم"
              highlight
              badge="الأكثر توازناً"
              cta="اطلب تجربة"
              to="/client-intake"
              planId="business"
              features={[
                "قيود غير محدودة",
                "ربط ERP (Odoo / Zoho / SAP)",
                "تقارير شهرية معتمدة",
                "لوحة تحكم مالية كاملة",
                "محاسب مخصّص لحسابك",
                "توزيع المصارف الثمانية",
              ]}
            />
            <PriceCard
              name="Enterprise"
              priceUSD={-1}
              ccy={ccy}
              period="/ سنوياً"
              tagline="للمؤسسات والأوقاف الكبرى"
              cta="تواصل مع المبيعات"
              to="/enterprise"
              features={[
                "SLA زمن استجابة ساعة",
                "SSO / SAML وأمان مؤسسي",
                "ربط ERP مؤسسي مخصّص",
                "فروع ومستخدمين غير محدودين",
                "تقارير IFRS + ESG + AAOIFI",
                "مدير حساب + مستشار شرعي",
              ]}
            />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          الأسعار مرجعها الدولار وتُعرض بعملتك المحلية بالتحويل التقريبي • الفوترة الفعلية تشمل
          ضريبة القيمة المضافة حيثما تنطبق
        </p>
      </div>
    </section>
  );
}

function PriceCard({
  name,
  priceUSD,
  ccy,
  period,
  tagline,
  features,
  cta,
  to,
  highlight,
  badge,
  planId,
}: {
  name: string;
  priceUSD: number;
  ccy: string;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  to: string;
  highlight?: boolean;
  badge?: string;
  planId?: PlanId;
}) {
  const priceLabel =
    priceUSD < 0 ? "مخصّص" : priceUSD === 0 ? "مجاناً" : formatPrice(priceUSD, ccy);
  return (
    <Card
      className={`relative ${highlight ? "border-primary border-2 shadow-xl scale-[1.02] bg-card" : ""}`}
    >
      {badge && (
        <div className="absolute -top-3 right-1/2 translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground border-0 shadow-md">{badge}</Badge>
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="text-sm font-semibold text-muted-foreground">{name}</div>
        <div className="flex items-baseline gap-1 mt-1 flex-wrap">
          <span className={`text-4xl font-bold ${highlight ? "text-primary" : ""}`}>
            {priceLabel}
          </span>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
        {priceUSD > 0 && ccy !== "USD" && (
          <div className="text-[11px] text-muted-foreground pt-0.5">≈ ${priceUSD} USD</div>
        )}
        <p className="text-xs text-muted-foreground pt-1">{tagline}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {planId ? (
          <PayButton
            planId={planId}
            label={cta}
            returnPath="/checkout-result"
            variant={highlight ? "default" : "outline"}
            className="w-full"
          />
        ) : (
          <Link to={to}>
            <Button variant={highlight ? "default" : "outline"} className="w-full">
              {cta}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- FAQ ---------------- */

function FAQ() {
  const qas = [
    {
      q: "كم يستغرق استلام التقرير المعتمد؟",
      a: "خلال يومَي عمل كحد أقصى من لحظة إرسال بياناتك، ويصلك على بريدك بصيغة PDF مختوم.",
    },
    {
      q: "هل بياناتي المالية آمنة؟",
      a: "نعم — نستخدم تشفير AES-256، وسياسات RLS على كل صف، ولا نُشارك بياناتك مع أي طرف ثالث.",
    },
    {
      q: "هل يمكنني تجربة الحاسبة قبل الدفع؟",
      a: "بالتأكيد. الحاسبة الذاتية مجانية بالكامل، وتدفع فقط عند طلب تقرير معتمد من محاسب.",
    },
    {
      q: "ما المعايير الشرعية المعتمدة؟",
      a: "AAOIFI 35، الاتحاد الدولي لعلماء المسلمين، وهيئات الفتوى الرسمية في السعودية ومصر والإمارات.",
    },
    {
      q: "هل تدعمون الشركات متعددة الفروع؟",
      a: "نعم — خطة Enterprise تدعم فروعاً ومستخدمين غير محدودين مع لوحة إدارة مركزية.",
    },
    {
      q: "هل يمكنني الدفع بعملة محلية؟",
      a: "نعم، ندعم SAR وAED وEGP وTRY وMYR وUSD، مع فوترة رسمية بضريبة القيمة المضافة.",
    },
  ];
  return (
    <section id="faq" className="container mx-auto px-4 py-20" dir="rtl">
      <SectionHeader eyebrow="أسئلة شائعة" title="ربما يدور في ذهنك…" />
      <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
        {qas.map((qa) => (
          <div key={qa.q} className="rounded-xl border bg-card p-5">
            <div className="font-semibold mb-2 flex items-start gap-2">
              <BookOpen className="h-4 w-4 text-primary mt-1 shrink-0" /> {qa.q}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pr-6">{qa.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */

function FinalCTA() {
  return (
    <section className="container mx-auto px-4 py-20" dir="rtl">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-bl from-primary via-primary to-primary/80 text-primary-foreground p-10 md:p-16 text-center">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative space-y-5 max-w-2xl mx-auto">
          <Zap className="h-10 w-10 mx-auto" />
          <h2 className="text-3xl md:text-4xl font-bold">ابدأ رحلة زكاتك اليوم</h2>
          <p className="text-primary-foreground/90 text-lg">
            سواء كنت فرداً يريد حساب زكاته السنوية أو شركة بحاجة لتقرير معتمد — نحن معك خطوة بخطوة.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/client-intake">
              <Button size="lg" variant="secondary" className="gap-2 text-base h-12 px-6">
                <Users className="h-5 w-5" /> ابدأ كفرد
              </Button>
            </Link>
            <Link to="/client-intake">
              <Button size="lg" variant="secondary" className="gap-2 text-base h-12 px-6">
                <Building2 className="h-5 w-5" /> ابدأ كشركة
              </Button>
            </Link>
            <Link to="/enterprise">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base h-12 px-6 bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <PhoneCall className="h-5 w-5" /> تواصل مع المبيعات
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */

function SiteFooter() {
  return (
    <footer className="border-t bg-card/40" dir="rtl">
      <div className="container mx-auto px-4 py-12 grid md:grid-cols-4 gap-8 text-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <Moon className="h-4 w-4 text-primary" /> نِصاب
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            منصة الزكاة الأولى المعتمدة شرعياً ومحاسبياً للأفراد والشركات والمؤسسات.
          </p>
          <div className="flex items-center gap-1 text-xs text-gold">
            <Star className="h-3.5 w-3.5 fill-current" />
            <Star className="h-3.5 w-3.5 fill-current" />
            <Star className="h-3.5 w-3.5 fill-current" />
            <Star className="h-3.5 w-3.5 fill-current" />
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="text-muted-foreground mr-1">4.9/5 من 2,300+ مستخدم</span>
          </div>
        </div>
        <FooterCol
          title="المنتج"
          links={[
            ["الأسعار", "#pricing"],
            ["كيف تعمل", "#how"],
            ["للمؤسسات", "/enterprise"],
          ]}
        />
        <FooterCol
          title="الحساب"
          links={[
            ["تسجيل الدخول / إنشاء حساب", "/auth"],
            ["نافذة العميل", "/client-intake"],
            ["السجل", "/history"],
          ]}
        />
        <FooterCol
          title="قانوني"
          links={[
            ["الخصوصية", "/legal/privacy"],
            ["الشروط", "/legal/terms"],
            ["الأمان", "/security"],
            ["الأسئلة الشائعة", "/faq"],
          ]}
        />
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Award className="h-3.5 w-3.5 text-gold" />© {new Date().getFullYear()} نِصاب — جميع الحقوق
        محفوظة
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="font-bold mb-3">{title}</div>
      <ul className="space-y-2 text-xs text-muted-foreground">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("#") ? (
              <a href={href} className="hover:text-primary">
                {label}
              </a>
            ) : (
              <Link to={href} className="hover:text-primary">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
