import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AuditEntry {
  id: string;
  action: string;
  fingerprint: string | null;
  sharia_refs: string[] | null;
  created_at: string;
}

/**
 * Fetches the current user's Sharia audit log entries.
 * Returns an empty array when no user is logged in or no entries exist.
 */
export function useAuditEntries(enabled: boolean = true, limit: number = 50) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !user) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("sharia_audit_log")
      .select("id,action,fingerprint,sharia_refs,created_at")
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (cancelled) return;
        setEntries((data as AuditEntry[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, user, limit]);

  return { entries, loading };
}
