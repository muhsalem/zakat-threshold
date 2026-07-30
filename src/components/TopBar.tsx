import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, User, LayoutDashboard } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CommandPalette } from "@/components/CommandPalette";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FontSizeToggle } from "@/components/FontSizeToggle";
import LanguageToggle from "@/components/LanguageToggle";

export function TopBar() {
  const { user, loading } = useAuth();

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="print:hidden sticky top-0 z-40 h-14 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-full w-full items-center gap-2 px-3 sm:px-4">
        {/* بداية السطر (يمين في RTL): التنقل والبحث */}
        <SidebarTrigger className="shrink-0" />
        <div className="hidden sm:block">
          <CommandPalette />
        </div>

        <div className="flex-1" />

        {/* نهاية السطر: التفضيلات ثم الحساب */}
        <div className="flex shrink-0 items-center gap-0.5">
          <LanguageToggle />
          <FontSizeToggle />
          <ThemeToggle />
        </div>

        <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

        <div className="flex shrink-0 items-center gap-2">
          {!loading && !user && (
            <Button asChild size="sm" className="h-8 gap-1.5">
              <Link to="/auth">
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">دخول / تسجيل</span>
              </Link>
            </Button>
          )}
          {!loading && user && (
            <>
              <span className="hidden items-center gap-1 text-xs text-muted-foreground lg:inline-flex">
                <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span dir="ltr" className="max-w-[160px] truncate">
                  {user.email}
                </span>
              </span>
              <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
                <Link to="/dashboard">
                  <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">لوحتي</span>
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5"
                onClick={signOut}
                aria-label="تسجيل الخروج"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">خروج</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
