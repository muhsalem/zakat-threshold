import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "jeweler" | "ambassador" | "volunteer";

/** Current session plus the roles granted to the signed-in account. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let generation = 0;

    const loadRoles = async (user: User | null) => {
      const current = ++generation;
      if (alive) {
        setRoles([]);
        setLoading(true);
      }
      if (!user) {
        if (alive) setLoading(false);
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (alive && current === generation) {
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      void loadRoles(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(next);
      void loadRoles(next?.user ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    isAdmin: roles.includes("admin"),
    signOut: () => supabase.auth.signOut(),
  };
}
