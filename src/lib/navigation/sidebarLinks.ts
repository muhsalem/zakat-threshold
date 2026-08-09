import {
  Home,
  Calculator,
  BookOpen,
  Bell,
  Sparkles,
  LayoutDashboard,
  Settings,
  MapPin,
  Users,
  LineChart,
  Landmark,
  ShieldCheck,
  FileText,
  Files,
  ListChecks,
} from "lucide-react";
import type { AccountType } from "@/hooks/useAuth";
import type { Key as I18nKey } from "@/lib/i18n";

export type SidebarRole = AccountType | "guest" | "accountant";

export type NavItem = {
  title: string;
  titleKey: I18nKey;
  url: string;
  icon: any;
  audience: Array<AccountType | "all">;
};

export type CalcItem = {
  title: string;
  titleKey: I18nKey;
  url: string;
  audience: Array<AccountType | "all">;
};

export type ProItem = { title: string; titleKey: I18nKey; url: string; icon: any };

export const NAV: NavItem[] = [
  { title: "الرئيسية", titleKey: "nav.home", url: "/", icon: Home, audience: ["all"] },
  {
    title: "لوحتي",
    titleKey: "nav.dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    audience: ["all"],
  },
  {
    title: "المستشار الذكي",
    titleKey: "nav.advisor",
    url: "/advisor",
    icon: Sparkles,
    audience: ["all"],
  },
  {
    title: "السجل",
    titleKey: "nav.history",
    url: "/history",
    icon: BookOpen,
    audience: ["all"],
  },
  {
    title: "الإشعارات",
    titleKey: "nav.notifications",
    url: "/analytics",
    icon: Bell,
    audience: ["all"],
  },
  {
    title: "اشتراكي",
    titleKey: "nav.subscription",
    url: "/subscription",
    icon: Sparkles,
    audience: ["all"],
  },
  {
    title: "الإعدادات",
    titleKey: "nav.settings",
    url: "/settings",
    icon: Settings,
    audience: ["all"],
  },
];

export const CALCS: CalcItem[] = [
  { title: "زكاة الفطر", titleKey: "calc.fitr", url: "/zakat-fitr", audience: ["individual"] },
  {
    title: "زكاة الشركات",
    titleKey: "calc.company",
    url: "/zakat-company",
    audience: ["company"],
  },
  {
    title: "زكاة المؤسسات",
    titleKey: "calc.enterprise",
    url: "/enterprise",
    audience: ["institution"],
  },
  {
    title: "خطة توزيع الزكاة",
    titleKey: "calc.distribution",
    url: "/distribution-plan",
    audience: ["individual"],
  },
];

export const PRO_TOOLS: ProItem[] = [
  { title: "الحاسبة الشاملة", titleKey: "pro.intake", url: "/client-intake", icon: Calculator },
  {
    title: "معالجة عملاء دفعة",
    titleKey: "pro.bulkClients",
    url: "/bulk-clients",
    icon: Users,
  },
];

export const PRO_RECORDS: ProItem[] = [
  { title: "السجل", titleKey: "nav.history", url: "/history", icon: BookOpen },
  { title: "مركز المراجعات", titleKey: "pro.reviews", url: "/reviews", icon: ListChecks },
  {
    title: "المراجعة الشرعية",
    titleKey: "pro.shariaReview",
    url: "/sharia-review",
    icon: ShieldCheck,
  },
  {
    title: "سجل تقارير PDF",
    titleKey: "pro.reportsHistory",
    url: "/reports-history",
    icon: Files,
  },
  {
    title: "قوالب تقارير PDF",
    titleKey: "pro.pdfTemplates",
    url: "/pdf-templates",
    icon: FileText,
  },
  {
    title: "ربط دليل الحسابات",
    titleKey: "pro.coaMapping",
    url: "/coa-mapping",
    icon: MapPin,
  },
];

export const PRO_REFERENCES: ProItem[] = [
  { title: "الأنصبة", titleKey: "pro.nisabAudit", url: "/nisab-audit", icon: Landmark },
  {
    title: "سجل الأسعار",
    titleKey: "pro.pricesHistory",
    url: "/prices-history",
    icon: LineChart,
  },
  {
    title: "تدقيق سحب الأسعار",
    titleKey: "pro.pricesAudit",
    url: "/prices-audit",
    icon: ShieldCheck,
  },
];

export function isVisible(audience: Array<AccountType | "all">, type: AccountType | null) {
  if (audience.includes("all")) return true;
  if (!type) return false;
  return audience.includes(type);
}

/**
 * Returns the flat list of {url, group} pairs that will actually render
 * in the sidebar for a given role. Used both by the component and by
 * the duplicate-detection test.
 */
export function getSidebarLinksForRole(role: SidebarRole): Array<{
  url: string;
  title: string;
  group: string;
}> {
  const isAccountant = role === "accountant" || role === "admin";
  const accountType: AccountType | null =
    role === "guest" ? null : role === "accountant" ? "individual" : (role as AccountType);

  const navItems = isAccountant
    ? NAV.filter((i) => i.url !== "/history" && i.url !== "/subscription")
    : NAV.filter((i) => isVisible(i.audience, accountType));

  const calcItems = isAccountant ? CALCS : CALCS.filter((i) => isVisible(i.audience, accountType));

  const out: Array<{ url: string; title: string; group: string }> = [];
  for (const i of navItems) out.push({ url: i.url, title: i.title, group: "nav" });
  for (const i of calcItems) out.push({ url: i.url, title: i.title, group: "calcs" });
  if (isAccountant) {
    for (const i of PRO_TOOLS) out.push({ url: i.url, title: i.title, group: "pro_tools" });
    for (const i of PRO_RECORDS) out.push({ url: i.url, title: i.title, group: "pro_records" });
    for (const i of PRO_REFERENCES)
      out.push({ url: i.url, title: i.title, group: "pro_references" });
  }
  return out;
}

/**
 * Returns duplicated URLs (present more than once across all rendered
 * sidebar groups) for a given role. Empty array = healthy.
 */
export function findDuplicateSidebarLinks(role: SidebarRole): string[] {
  const links = getSidebarLinksForRole(role);
  const counts = new Map<string, number>();
  for (const l of links) counts.set(l.url, (counts.get(l.url) ?? 0) + 1);
  return [...counts.entries()].filter(([, n]) => n > 1).map(([url]) => url);
}
