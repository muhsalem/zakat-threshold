// تعريف الباقات المركزي — الأسعار بالـ USD (سعر T1)، يُحسب المحلي عبر PPP.
import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Star,
  Users as UsersIcon,
  Rocket,
  Building2,
  Crown,
} from "lucide-react";

export type Audience = "individual" | "business";

export type PlanId =
  | "free"
  | "personal-pro"
  | "family"
  | "startup"
  | "business"
  | "enterprise";

export type Plan = {
  id: PlanId;
  audience: Audience;
  name: string;
  tagline: string;
  usdMonthly: number | null; // null = حسب الطلب
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
    usdMonthly: 0,
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
    id: "personal-pro",
    audience: "individual",
    name: "Personal Pro",
    tagline: "للفرد الذي يريد توثيقاً رسمياً وتنبيهات الحول",
    usdMonthly: 9.99,
    icon: Star,
    highlight: true,
    badge: "الأكثر شعبية",
    features: [
      "كل ما في الباقة المجانية",
      "تقرير PDF رسمي بختم شرعي إلكتروني",
      "أرشيف كامل للسنوات السابقة",
      "تنبيهات موعد الحول (7 و1 و0 يوم)",
      "تصدير Excel/CSV",
      "دعم بريدي خلال 24 ساعة",
    ],
    ctaTo: "/auth",
  },
  {
    id: "family",
    audience: "individual",
    name: "Family",
    tagline: "للعائلات — زكاة مجمّعة لكل أفراد الأسرة",
    usdMonthly: 19.99,
    icon: UsersIcon,
    features: [
      "كل ما في Personal Pro",
      "حتى 5 أفراد من العائلة",
      "زكاة العائلة المجمّعة",
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
    usdMonthly: 149,
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
    id: "business",
    audience: "business",
    name: "Business",
    tagline: "للشركات المتوسطة والمجموعات",
    usdMonthly: 499,
    icon: Building2,
    highlight: true,
    badge: "الأكثر طلباً",
    features: [
      "كل ما في Startup",
      "زكاة المجموعة (Group Consolidation)",
      "موصّلات ERP: QuickBooks / Xero / Odoo / SAP",
      "تسويات ضريبية (Tax-Zakat Reconciliation)",
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
    usdMonthly: null,
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
