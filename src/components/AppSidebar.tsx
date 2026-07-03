import { useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Search, Home, Calculator, BookOpen, ShieldCheck, Bell, HelpCircle, Sparkles, LayoutDashboard } from "lucide-react";
import { searchEntries } from "@/lib/searchIndex";
import { useAuth, type AccountType } from "@/hooks/useAuth";

type NavItem = { title: string; url: string; icon: any; audience: Array<AccountType | "all"> };

const NAV: NavItem[] = [
  { title: "الرئيسية", url: "/", icon: Home, audience: ["all"] },
  { title: "لوحتي", url: "/dashboard", icon: LayoutDashboard, audience: ["all"] },
  { title: "المستشار الذكي", url: "/advisor", icon: Sparkles, audience: ["all"] },
  { title: "السجل", url: "/history", icon: BookOpen, audience: ["all"] },
  { title: "التحقق من تقرير", url: "/verify", icon: ShieldCheck, audience: ["all"] },
  { title: "الإشعارات", url: "/analytics", icon: Bell, audience: ["all"] },
  { title: "الأسئلة الشائعة", url: "/faq", icon: HelpCircle, audience: ["all"] },
];

type CalcItem = { title: string; url: string; audience: Array<AccountType | "all"> };

const CALCS: CalcItem[] = [
  { title: "زكاة الذهب والفضة", url: "/zakat-gold", audience: ["individual"] },
  { title: "زكاة الزروع", url: "/crops", audience: ["individual"] },
  { title: "زكاة الشركات", url: "/zakat-company", audience: ["company"] },
  { title: "زكاة المؤسسات", url: "/enterprise", audience: ["institution"] },
];

function isVisible(audience: Array<AccountType | "all">, type: AccountType | null) {
  if (audience.includes("all")) return true;
  if (!type) return false;
  return audience.includes(type);
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { accountType, isAccountant } = useAuth();
  const [q, setQ] = useState("");
  const results = useMemo(() => searchEntries(q), [q]);
  const isActive = (p: string) => currentPath === p;

  // Accountants see everything (full calculator access).
  const navItems = isAccountant ? NAV : NAV.filter((i) => isVisible(i.audience, accountType));
  const calcItems = isAccountant ? CALCS : CALCS.filter((i) => isVisible(i.audience, accountType));


  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarContent>
        {!collapsed && (
          <div className="p-2">
            <div className="relative">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث في المنصة…"
                className="pr-8 h-9 text-sm"
                dir="rtl"
                aria-label="بحث"
              />
            </div>
            {q && (
              <div className="mt-2 rounded-md border bg-card">
                {results.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">لا نتائج مطابقة</div>
                ) : (
                  <ul className="max-h-72 overflow-auto text-sm">
                    {results.map((r) => (
                      <li key={r.to}>
                        <Link
                          to={r.to}
                          onClick={() => setQ("")}
                          className="block px-2 py-1.5 hover:bg-muted rounded-sm"
                        >
                          <div className="font-medium text-xs">{r.title}</div>
                          <div className="text-[10px] text-muted-foreground" dir="ltr">{r.to}</div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>التنقّل</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {calcItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {accountType === "company" ? "حاسبات الشركات" : accountType === "institution" ? "حاسبات المؤسسات" : "حاسبات الأفراد"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {calcItems.map((i) => (
                  <SidebarMenuItem key={i.url}>
                    <SidebarMenuButton asChild isActive={isActive(i.url)}>
                      <Link to={i.url} className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        {!collapsed && <span>{i.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
