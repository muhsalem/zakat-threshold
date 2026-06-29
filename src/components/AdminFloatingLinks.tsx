import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

/** زر عائم لا يظهر إلا للمدراء والمدقّقين. */
export function AdminFloatingLinks() {
  const { isAdmin, isModerator, loading } = useUserRole();
  if (loading || (!isAdmin && !isModerator)) return null;

  return (
    <>
      {isAdmin && (
        <Link
          to="/admin"
          aria-label="لوحة الإدارة"
          className="print:hidden fixed bottom-40 left-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/95 backdrop-blur px-3.5 py-2 text-xs font-semibold text-primary shadow-lg hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Shield className="h-3.5 w-3.5" />
          الإدارة
        </Link>
      )}
      <Link
        to="/audit-review"
        aria-label="مراجعة اعتماد الزكاة"
        className="print:hidden fixed bottom-52 left-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-card/95 backdrop-blur px-3.5 py-2 text-xs font-semibold text-primary shadow-lg hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        المراجعة
      </Link>
    </>
  );
}
