import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, User, LayoutDashboard, MoreVertical } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      <div className="mx-auto grid h-full w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:px-4">
        {/* بداية السطر (يمين في RTL): التنقل والبحث */}
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="shrink-0" />
          <CommandPalette />
        </div>

        <div aria-hidden="true" />

        {/* نهاية السطر: التفضيلات ثم الحساب */}
        <div className="flex shrink-0 items-center gap-2">
          {/* سطح المكتب: عناصر ظاهرة */}
          <div className="hidden items-center gap-0.5 sm:flex">
            <LanguageToggle />
            <FontSizeToggle />
            <ThemeToggle />
          </div>

          <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

          <div className="hidden shrink-0 items-center gap-2 sm:flex">
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
                    <span className="hidden md:inline">لوحتي</span>
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
                  <span className="hidden md:inline">خروج</span>
                </Button>
              </>
            )}
          </div>

          {/* الموبايل: زر دخول مختصر + قائمة منسدلة تجمع التفضيلات والحساب */}
          {!loading && !user && (
            <Button asChild size="icon" className="h-8 w-8 sm:hidden" aria-label="دخول / تسجيل">
              <Link to="/auth">
                <LogIn className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:hidden"
                aria-label="خيارات وتفضيلات"
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>التفضيلات</DropdownMenuLabel>
              <div className="flex items-center justify-around px-1 pb-1">
                <LanguageToggle />
                <FontSizeToggle />
                <ThemeToggle />
              </div>
              {!loading && user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                    <span dir="ltr">{user.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <LayoutDashboard className="me-2 h-4 w-4" aria-hidden="true" />
                      لوحتي
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void signOut()}>
                    <LogOut className="me-2 h-4 w-4" aria-hidden="true" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

