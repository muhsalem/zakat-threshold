// تعريف الباقات المركزي — الأسعار بالـ USD (سعر T1)، يُحسب المحلي عبر PPP.
// استراتيجية التسعير (Freemium + إدارة زكاة على مدار العام):
//  • أفراد: Free (ذهب/فضة/نقود + زكاة فطر + توزيع) → One-Report ($19 — شامل كل البنود + أرشفة + إشعارات) → Family ($29/سنة) → Lifetime ($79).
//  • شركات (سنوي): Startup ($99) → Growth ($299) → Business ($999) → Enterprise (custom).
//  • محاسبون/مستشارون (سنوي حسب عدد العملاء): Solo ($299 حتى 50) → Firm ($999 حتى 250) → Unlimited ($1,999).
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
  Briefcase,
  BookOpen,
  Layers,
} from "lucide-react";

export type Audience = "individual" | "business" | "accountant";
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
  | "enterprise"
  | "accountant-solo"
  | "accountant-firm"
  | "accountant-unlimited";

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
  /** شريحة الأصول الزكوية أو حجم العملاء (لخطط الشركات/المحاسبين). */
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
  // ============ أفراد (Freemium + إدارة زكاة سنوية) ============
  {
    id: "free",
    audience: "individual",
    name: "مجاني",
    tagline: "حاسبات الأساسيات + زكاة الفطر + خطة التوزيع — مجاناً للأبد",
    usdPrice: 0,
    billing: "one_time",
    icon: Sparkles,
    features: [
      "حاسبة زكاة النقود والذهب والفضة",
      "حاسبة زكاة الفطر (طعاماً ونقداً)",
      "حاسبة خطة توزيع الزكاة على المصارف الثمانية",
      "تثبيت تاريخ حساب الزكاة (يوم الحول) في حسابك",
      "أسعار الذهب والفضة اليومية",
      "تذكير مبسّط بموعد الحول داخل التطبيق",
      "حفظ حتى 3 حسابات في أرشيفك",
    ],
    ctaTo: "/auth",
  },
  {
    id: "personal-one-time",
    audience: "individual",
    name: "التقرير الشامل",
    tagline: "تقرير زكوي واحد يشمل كل البنود مع إشعارات وأرشفة تلقائية",
    usdPrice: 19,
    billing: "one_time",
    icon: FileCheck2,
    highlight: true,
    badge: "الأكثر شمولاً",
    ribbon: "Early-Bird: خصم 30% قبل رمضان",
    features: [
      "حساب مفصّل لكل البنود الزكوية (نقود، ذهب، فضة، أسهم، عروض تجارة، عقارات، زروع، أنعام، ركاز، ESOP/RSU، أوقاف)",
      "تنبيهات زكوية ذكية أثناء التعبئة (نصاب، حَوْل، خصومات)",
      "احتساب زكاة السنوات السابقة الفائتة",
      "أرشفة تلقائية دائمة لتقاريرك في حسابك",
      "تقرير PDF رسمي + شيت Excel متعدد الأوراق",
      "إشعار بيوم الحول عبر البريد الإلكتروني والجوال (SMS)",
      "التحقق من التقرير واسترجاعه في حال فقده (Report Recovery)",
      "ختم شرعي إلكتروني وتوقيع رقمي",
      "دعم فني بريدي",
    ],
    ctaTo: "/auth",
  },
  {
    id: "family-annual",
    audience: "individual",
    name: "Family",
    tagline: "زكاة العائلة كلها في لوحة واحدة",
    usdPrice: 29,
    billing: "yearly",
    icon: UsersIcon,
    features: [
      "كل ما في التقرير الشامل",
      "حتى 5 أفراد من العائلة",
      "زكاة عائلية مجمّعة + توزيع على 8 مصارف",
      "خزنة مستندات عائلية مشتركة",
      "استشارة شرعية سنوية (30 دقيقة)",
    ],
    ctaTo: "/auth",
  },
  {
    id: "personal-lifetime",
    audience: "individual",
    name: "Lifetime",
    tagline: "دفعة واحدة — إدارة زكاتك مدى الحياة",
    usdPrice: 79,
    billing: "lifetime",
    icon: InfinityIcon,
    badge: "أفضل قيمة على المدى الطويل",
    ribbon: "بلا اشتراكات ولا تجديدات",
    features: [
      "كل ما في التقرير الشامل — مدى الحياة",
      "تقارير غير محدودة عبر السنوات",
      "تحديثات مجانية لكل الميزات القادمة",
      "أولوية في الدعم الفني",
      "شارة \"عضو مؤسِّس\" في حسابك",
      "ينتقل لورثتك — لا يُلغى بالوفاة",
    ],
    ctaTo: "/auth",
  },


  // ============ شركات (سنوي — إدارة زكاة الشركة طوال العام) ============
  {
    id: "startup",
    audience: "business",
    name: "شركة صغيرة",
    tagline: "للشركات الناشئة وصغار التجار",
    usdPrice: 99,
    billing: "yearly",
    assetTier: "أصول زكوية < 1 مليون USD",
    icon: Rocket,
    features: [
      "حساب زكاة الشركة على مدار السنة (AAOIFI-35)",
      "تحديث القوائم المالية ومراجعة المخزون",
      "متابعة الذمم المدينة والدائنة",
      "تقرير PDF معتمد بختم شرعي",
      "استيراد ميزان المراجعة (Excel/CSV)",
      "حتى 3 مستخدمين",
      "دعم بريدي خلال 48 ساعة",
    ],
    ctaTo: "/auth",
  },
  {
    id: "growth",
    audience: "business",
    name: "شركة متوسطة",
    tagline: "للشركات النامية التي تخطّت مرحلة البداية",
    usdPrice: 299,
    billing: "yearly",
    assetTier: "أصول زكوية 1M – 10M USD",
    icon: TrendingUp,
    highlight: true,
    badge: "الأكثر توازناً",
    features: [
      "كل ما في شركة صغيرة",
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
    name: "شركة كبيرة",
    tagline: "للشركات الكبرى والمجموعات",
    usdPrice: 999,
    billing: "yearly",
    assetTier: "أصول زكوية 10M – 100M USD",
    icon: Building2,
    ribbon: "خصم 20% عند الدفع لثلاث سنوات",
    features: [
      "كل ما في شركة متوسطة",
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
    assetTier: "أصول زكوية > 100M USD — تسعير حسب المقاعد",
    icon: Crown,
    features: [
      "كل ما في شركة كبيرة",
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

  // ============ محاسبون ومستشارون (سنوي حسب عدد العملاء) ============
  {
    id: "accountant-solo",
    audience: "accountant",
    name: "محاسب مستقل",
    tagline: "للمحاسب الفرد الذي يخدم عملاءه المباشرين",
    usdPrice: 299,
    billing: "yearly",
    assetTier: "حتى 50 عميلاً",
    icon: Briefcase,
    features: [
      "لوحة تحكم متعدّدة العملاء",
      "استيراد جماعي (Bulk Import) من Excel/CSV",
      "ربط دليل الحسابات (COA) بفئات الزكاة",
      "تقارير PDF جماعية بختم المكتب",
      "أرشيف موحّد لعملاء المكتب",
      "دعم بريدي خلال 24 ساعة",
    ],
    ctaTo: "/auth",
  },
  {
    id: "accountant-firm",
    audience: "accountant",
    name: "مكتب محاسبة",
    tagline: "للمكاتب المحاسبية والاستشارية المتوسطة",
    usdPrice: 999,
    billing: "yearly",
    assetTier: "حتى 250 عميلاً",
    icon: BookOpen,
    highlight: true,
    badge: "الأكثر طلباً بين المكاتب",
    features: [
      "كل ما في محاسب مستقل",
      "حتى 10 محاسبين ضمن المكتب بأدوار",
      "موصّلات ERP جماعية (Odoo/Zoho/SAP)",
      "قوالب زكوية قابلة للتخصيص لكل عميل",
      "لوحة KPIs للمكتب (تقدّم، مواعيد حَوْل)",
      "استشارة شرعية شهرية للمكتب",
      "دعم أولوية خلال 8 ساعات",
    ],
    ctaTo: "/auth",
  },
  {
    id: "accountant-unlimited",
    audience: "accountant",
    name: "غير محدود",
    tagline: "للمكاتب الكبرى وشركات الاستشارات المتخصّصة",
    usdPrice: 1999,
    billing: "yearly",
    assetTier: "عملاء غير محدودين",
    icon: Layers,
    ribbon: "White-Label + API متقدم",
    features: [
      "كل ما في مكتب محاسبة",
      "عدد عملاء غير محدود",
      "White-Label — شعار مكتبك بدلاً من نصاب",
      "API متقدم للتكامل مع أنظمة المكتب",
      "SSO + إدارة مقاعد متقدمة",
      "مدير حساب مخصّص + SLA",
      "استشارات شرعية غير محدودة",
    ],
    ctaTo: "/auth",
  },
];

export const INDIVIDUAL_PLANS = PLANS.filter((p) => p.audience === "individual");
export const BUSINESS_PLANS = PLANS.filter((p) => p.audience === "business");
export const ACCOUNTANT_PLANS = PLANS.filter((p) => p.audience === "accountant");

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
