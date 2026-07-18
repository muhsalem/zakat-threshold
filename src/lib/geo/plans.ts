// تعريف الباقات المركزي — الأسعار بالـ USD (سعر T1)، يُحسب المحلي عبر PPP.
// الهيكل النهائي (استراتيجية تسعير خبير — الزكاة سنوية بطبيعتها):
//  • أفراد: Free → One-Report ($19) → Personal ($29/سنة) → Family ($79/سنة) → Lifetime ($149).
//  • شركات (سنوي + تدرج حسب حجم الأصول الزكوية):
//      Startup ($149) < 1M | Growth ($499) 1M-10M | Business ($1,499) 10M-100M | Enterprise (يبدأ $2,500).
import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  FileCheck2,
  Star,
  Users as UsersIcon,
  Infinity as InfinityIcon,
  Rocket,
  TrendingUp,
  Building2,
  Crown,
} from "lucide-react";

export type Audience = "individual" | "business";
export type BillingPeriod = "one_time" | "monthly" | "yearly" | "lifetime" | "custom";

export type PlanId =
  | "free"
  | "personal-one-time"
  | "personal-annual"
  | "family-annual"
  | "personal-lifetime"
  | "startup"
  | "growth"
  | "business"
  | "enterprise";

export type Plan = {
  id: PlanId;
  audience: Audience;
  name: string;
  tagline: string;
  /** السعر المرجعي بالدولار الأمريكي (T1). null = حسب الطلب. */
  usdPrice: number | null;
  /** طريقة الفوترة — تُستخدم في العرض والحسابات. */
  billing: BillingPeriod;
  /** نص مخصص للـ anchor (مثل "يبدأ من"). */
  priceAnchorLabel?: string;
  /** شريحة الأصول الزكوية المستهدفة (لخطط الشركات). */
  assetTier?: string;
  icon: LucideIcon;
  features: string[];
  highlight?: boolean;
  badge?: string;
  /** شارة ثانوية (Early-Bird / ضمان يوم الحول ...). */
  ribbon?: string;
  ctaTo?: "/auth";
  ctaHref?: string;
};

export const PLANS: Plan[] = [
  // ============ أفراد ============
  {
    id: "free",
    audience: "individual",
    name: "مجاني",
    tagline: "ابدأ فوراً — للاستخدام الشخصي البسيط",
    usdPrice: 0,
    billing: "one_time",
    icon: Sparkles,
    features: [
      "حاسبة زكاة كاملة (نقد، ذهب، فضة، أسهم)",
      "حفظ حتى 3 حسابات",
      "أسعار المعادن اليومية",
      "دليل الفتاوى الأساسي",
    ],
    ctaTo: "/auth",
  },
  {
    id: "personal-one-time",
    audience: "individual",
    name: "تقرير واحد",
    tagline: "ادفع مرّة واحدة — احصل على تقرير معتمد فوراً",
    usdPrice: 19,
    billing: "one_time",
    icon: FileCheck2,
    badge: "الأنسب لمن يزكّي مرة/سنة",
    features: [
      "تقرير PDF رسمي بختم شرعي إلكتروني",
      "صالح مدى الحياة — بلا اشتراك",
      "أرشفة تلقائية في حسابك",
      "تصدير Excel/CSV",
    ],
    ctaTo: "/auth",
  },
  {
    id: "personal-annual",
    audience: "individual",
    name: "Personal",
    tagline: "للفرد الذي يريد توثيقاً رسمياً وتنبيهات الحول",
    usdPrice: 29,
    billing: "yearly",
    icon: Star,
    highlight: true,
    badge: "الأكثر شعبية",
    ribbon: "Early-Bird: خصم 30% قبل رمضان",
    features: [
      "تقارير PDF غير محدودة بختم شرعي",
      "تنبيهات موعد الحول (30/14/7/3/1/0 يوم)",
      "أرشيف كامل للسنوات السابقة",
      "تصدير Excel/CSV",
      "دعم بريدي خلال 24 ساعة",
      "ضمان يوم الحول: إن لم تُصدر تقريرك في موعده — سنة قادمة مجاناً",
    ],
    ctaTo: "/auth",
  },
  {
    id: "family-annual",
    audience: "individual",
    name: "Family",
    tagline: "للعائلات — زكاة مجمّعة لكل أفراد الأسرة",
    usdPrice: 79,
    billing: "yearly",
    icon: UsersIcon,
    features: [
      "كل ما في Personal",
      "حتى 5 أفراد من العائلة",
      "زكاة العائلة المجمّعة + توزيع على 8 مصارف",
      "خزنة مستندات عائلية مشتركة",
      "استشارة شرعية سنوية (30 دقيقة)",
      "لوحة تحكم عائلية موحّدة",
    ],
    ctaTo: "/auth",
  },
  {
    id: "personal-lifetime",
    audience: "individual",
    name: "Lifetime",
    tagline: "دفعة واحدة — تغطي كل زكواتك القادمة مدى الحياة",
    usdPrice: 149,
    billing: "lifetime",
    icon: InfinityIcon,
    badge: "قمّة سُلّم الالتزام",
    ribbon: "أفضل قيمة على المدى الطويل",
    features: [
      "كل ما في Personal — مدى الحياة",
      "بلا اشتراكات ولا تجديدات",
      "تحديثات مجانية لكل الميزات القادمة",
      "أولوية في الدعم الفني",
      "شارة \"عضو مؤسِّس\" في حسابك",
      "ينتقل لورثتك — لا يُلغى بوفاة صاحب الحساب",
    ],
    ctaTo: "/auth",
  },

  // ============ شركات (سنوي + تدرج حسب حجم الأصول الزكوية) ============
  {
    id: "startup",
    audience: "business",
    name: "Startup",
    tagline: "للشركات الناشئة وصغار التجار",
    usdPrice: 149,
    billing: "yearly",
    assetTier: "أصول زكوية < 1 مليون USD",
    icon: Rocket,
    features: [
      "حساب زكاة الشركة (AAOIFI-35)",
      "تقرير PDF معتمد بختم شرعي",
      "استيراد ميزان المراجعة (Excel/CSV)",
      "حتى 3 مستخدمين",
      "دعم بريدي خلال 48 ساعة",
      "أرشيف السنوات السابقة",
    ],
    ctaTo: "/auth",
  },
  {
    id: "growth",
    audience: "business",
    name: "Growth",
    tagline: "للشركات النامية التي تخطّت مرحلة البداية",
    usdPrice: 499,
    billing: "yearly",
    assetTier: "أصول زكوية 1M – 10M USD",
    icon: TrendingUp,
    badge: "جديد",
    features: [
      "كل ما في Startup",
      "حتى 10 مستخدمين بأدوار",
      "زكاة المجموعة الأساسية (شركة أم + فرعين)",
      "تسويات ضريبية أولية (Tax-Zakat)",
      "استشارة شرعية (ساعة/شهر)",
      "دعم أولوية خلال 24 ساعة",
      "API أساسي (2K req/day)",
    ],
    ctaTo: "/auth",
  },
  {
    id: "business",
    audience: "business",
    name: "Business",
    tagline: "للشركات المتوسطة والمجموعات",
    usdPrice: 1499,
    billing: "yearly",
    assetTier: "أصول زكوية 10M – 100M USD",
    icon: Building2,
    highlight: true,
    badge: "الأكثر طلباً",
    ribbon: "خصم 20% عند الدفع لثلاث سنوات",
    features: [
      "كل ما في Growth",
      "زكاة المجموعة الكاملة (Group Consolidation)",
      "موصّلات ERP: QuickBooks / Xero / Odoo / SAP",
      "ربط دليل الحسابات (COA Mapping)",
      "تسويات ضريبية متقدمة",
      "حتى 25 مستخدم بأدوار (RBAC) + فصل مهام (SoD)",
      "استشارة شرعية (ساعتان/شهر)",
      "دعم أولوية خلال 8 ساعات",
      "API مؤسسي (10K req/day)",
    ],
    ctaTo: "/auth",
  },
  {
    id: "enterprise",
    audience: "business",
    name: "Enterprise",
    tagline: "للبنوك الإسلامية والصناديق الوقفية والمجموعات الكبرى",
    usdPrice: 2500,
    billing: "custom",
    priceAnchorLabel: "يبدأ من",
    assetTier: "أصول زكوية > 100M USD — تسعير حسب حجم الأصول والمقاعد",
    icon: Crown,
    features: [
      "كل ما في Business",
      "SSO (SAML/OIDC) + SCIM",
      "هيئة شرعية مخصّصة",
      "استضافة سيادية (On-Prem / VPC)",
      "SLA 99.99% + دعم 24/7",
      "تكامل ERP مخصّص (SAP S/4HANA, Oracle)",
      "SOC 2 Type II, ISO 27001",
      "مستخدمون غير محدودين + تسعير per-seat",
    ],
    ctaHref: "mailto:enterprise@nisab.app?subject=Enterprise%20Plan",
  },
];

export const INDIVIDUAL_PLANS = PLANS.filter((p) => p.audience === "individual");
export const BUSINESS_PLANS = PLANS.filter((p) => p.audience === "business");

/** نص الفترة المعروض بجانب السعر. */
export function billingPeriodLabel(billing: BillingPeriod): string {
  switch (billing) {
    case "one_time":
      return "دفعة واحدة";
    case "monthly":
      return "/ شهر";
    case "yearly":
      return "/ سنة";
    case "lifetime":
      return "مدى الحياة";
    case "custom":
      return "حسب الاتفاق";
  }
}

// ============ إضافات (Add-ons) — تُباع بجانب أي خطة ============
export type AddOn = {
  id: string;
  name: string;
  usdPrice: number;
  billing: "one_time" | "yearly";
  description: string;
};

export const ADDONS: AddOn[] = [
  {
    id: "sharia-review",
    name: "مراجعة شرعية بشرية",
    usdPrice: 49,
    billing: "one_time",
    description: "مراجعة تقريرك من قِبل مستشار شرعي معتمد قبل الاعتماد النهائي.",
  },
  {
    id: "fatwa-seal",
    name: "ختم دار إفتاء معتمد",
    usdPrice: 99,
    billing: "one_time",
    description: "ختم رسمي من دار إفتاء شريكة يُضاف إلى PDF التقرير.",
  },
  {
    id: "distribution-consult",
    name: "استشارة توزيع على المصارف الثمانية",
    usdPrice: 29,
    billing: "one_time",
    description: "جلسة 30 دقيقة لتحديد الأنسب من المصارف حسب حالتك.",
  },
  {
    id: "multi-year-prepay",
    name: "دفع مسبق 3 سنوات",
    usdPrice: 0, // خصم يُحسب على الخطة نفسها
    billing: "yearly",
    description: "احصل على 3 سنوات بسعر 2.5 — قفل السعر ضد أي زيادات مستقبلية.",
  },
];
