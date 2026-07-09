import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, User, LayoutDashboard } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function TopBar() {
  const { user, loading } = useAuth();

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="print:hidden sticky top-0 z-30 flex h-12 items-center justify-between gap-2 border-b bg-background/90 backdrop-blur px-2">
      {/* يسار: زر السايدبار + الدخول */}
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        {!loading && !user && (
          <Button asChild size="sm" variant="default" className="h-8 gap-1.5">
            <Link to="/auth">
              <LogIn className="h-3.5 w-3.5" /> دخول / تسجيل
            </Link>
          </Button>
        )}
        {!loading && user && (
          <>
            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
              <Link to="/dashboard">
                <LayoutDashboard className="h-3.5 w-3.5" /> لوحتي
              </Link>
            </Button>
            <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5" /> خروج
            </Button>
          </>
        )}
      </div>

      {/* يمين: اسم/شعار مصغّر */}
      <div className="flex items-center gap-2 text-xs">
        {user && (
          <span className="hidden sm:inline-flex items-center gap-1 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span dir="ltr" className="truncate max-w-[160px]">
              {user.email}
            </span>
          </span>
        )}
      </div>
    </header>
  );
}
