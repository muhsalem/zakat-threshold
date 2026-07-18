// تعريف الباقات المركزي — الأسعار بالـ USD (سعر T1)، يُحسب المحلي عبر PPP.
// هيكل مُحسّن (توصيات خبير التسعير):
//  • Personal One-Time لسدّ الفجوة بين المجاني والاشتراك.
//  • Personal / Family بفوترة سنوية (الزكاة سنوية بطبيعتها).
//  • Growth كطبقة B2B وسيطة بين Startup و Business.
//  • Enterprise بسعر ابتدائي (anchor) لتسريع دورة البيع.
import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  FileCheck2,
  Star,
  Users as UsersIcon,
  Rocket,
  TrendingUp,
  Building2,
  Crown,
} from "lucide-react";

export type Audience = "individual" | "business";
export type BillingPeriod = "one_time" | "monthly" | "yearly" | "custom";

export type PlanId =
  | "free"
  | "personal-one-time"
  | "personal-annual"
  | "family-annual"
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
  /** نص مخصص للـ anchor في Enterprise (مثل "يبدأ من"). */
  priceAnchorLabel?: string;
  icon: LucideIcon;
  features: string[];
  highlight?: boolean;
  badge?: string;
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
    features: [
      "تقارير PDF غير محدودة بختم شرعي",
      "تنبيهات موعد الحول (7/1/0 يوم)",
      "أرشيف كامل للسنوات السابقة",
      "تصدير Excel/CSV",
      "دعم بريدي خلال 24 ساعة",
      "توفير ~17% مقارنة بالتقرير المفرد",
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

  // ============ شركات ============
  {
    id: "startup",
    audience: "business",
    name: "Startup",
    tagline: "للشركات الناشئة حتى 50 موظف",
    usdPrice: 149,
    billing: "monthly",
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
    usdPrice: 249,
    billing: "monthly",
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
    usdPrice: 499,
    billing: "monthly",
    icon: Building2,
    highlight: true,
    badge: "الأكثر طلباً",
    features: [
      "كل ما في Growth",
      "زكاة المجموعة الكاملة (Group Consolidation)",
      "موصّلات ERP: QuickBooks / Xero / Odoo / SAP",
      "تسويات ضريبية متقدمة",
      "حتى 25 مستخدم بأدوار (RBAC)",
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
    tagline: "للبنوك الإسلامية والصناديق الوقفية",
    usdPrice: 2500,
    billing: "custom",
    priceAnchorLabel: "يبدأ من",
    icon: Crown,
    features: [
      "كل ما في Business",
      "SSO (SAML/OIDC) + SCIM",
      "هيئة شرعية مخصّصة",
      "استضافة سيادية (On-Prem / VPC)",
      "SLA 99.99% + دعم 24/7",
      "تكامل ERP مخصّص (SAP S/4HANA, Oracle)",
      "SOC 2 Type II, ISO 27001",
      "مستخدمون غير محدودين",
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
    case "custom":
      return "حسب الاتفاق";
  }
}
