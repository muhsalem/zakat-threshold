import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Building2, Bot, History, LayoutGrid } from "lucide-react";

const ITEMS = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/organizations", label: "الشركات", icon: Building2 },
  { to: "/advisor", label: "مستشار", icon: Bot },
  { to: "/history", label: "سجلاتي", icon: History },
  { to: "/welcome", label: "المزيد", icon: LayoutGrid },
] as const;

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="التنقّل الرئيسي"
      className="print:hidden sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.to;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                aria-label={it.label}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors ${
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
