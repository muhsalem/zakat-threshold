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
} from "lucide-react";
import type { AccountType } from "@/hooks/useAuth";

export type SidebarRole = AccountType | "guest" | "accountant";

export type NavItem = {
  title: string;
  url: string;
  icon: any;
  audience: Array<AccountType | "all">;
};

export type CalcItem = {
  title: string;
  url: string;
  audience: Array<AccountType | "all">;
};

export type ProItem = { title: string; url: string; icon: any };

export const NAV: NavItem[] = [
  { title: "الرئيسية", url: "/", icon: Home, audience: ["all"] },
  { title: "لوحتي", url: "/dashboard", icon: LayoutDashboard, audience: ["all"] },
  { title: "المستشار الذكي", url: "/advisor", icon: Sparkles, audience: ["all"] },
  { title: "السجل", url: "/history", icon: BookOpen, audience: ["all"] },
  { title: "الإشعارات", url: "/analytics", icon: Bell, audience: ["all"] },
  { title: "اشتراكي", url: "/subscription", icon: Sparkles, audience: ["all"] },
  { title: "الإعدادات", url: "/settings", icon: Settings, audience: ["all"] },
];

export const CALCS: CalcItem[] = [
  { title: "زكاة الفطر", url: "/zakat-fitr", audience: ["individual"] },
  { title: "زكاة الشركات", url: "/zakat-company", audience: ["company"] },
  { title: "زكاة المؤسسات", url: "/enterprise", audience: ["institution"] },
  { title: "خطة توزيع الزكاة", url: "/distribution-plan", audience: ["individual"] },
];

export const PRO_TOOLS: ProItem[] = [
  { title: "الحاسبة الشاملة", url: "/client-intake", icon: Calculator },
  { title: "معالجة عملاء دفعة", url: "/bulk-clients", icon: Users },
];

export const PRO_RECORDS: ProItem[] = [
  { title: "السجل", url: "/history", icon: BookOpen },
  { title: "سجل تقارير PDF", url: "/reports-history", icon: Files },
  { title: "قوالب تقارير PDF", url: "/pdf-templates", icon: FileText },
  { title: "ربط دليل الحسابات", url: "/coa-mapping", icon: MapPin },
];

export const PRO_REFERENCES: ProItem[] = [
  { title: "الأنصبة", url: "/nisab-audit", icon: Landmark },
  { title: "سجل الأسعار", url: "/prices-history", icon: LineChart },
  { title: "تدقيق سحب الأسعار", url: "/prices-audit", icon: ShieldCheck },
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
