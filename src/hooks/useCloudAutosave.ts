import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cloud autosave for wizards. Debounced upsert into `zakat_drafts` when the
 * user is authenticated. Uses a single auto-saved row per (user, wizard_kind),
 * identified by title = "__autosave__". Silent — never throws.
 */
const AUTOSAVE_TITLE = "__autosave__";

export function useCloudAutosave<T>(
  wizardKind: "individual" | "company" | "institution",
  snapshot: T,
  step: number,
  opts?: { debounceMs?: number; enabled?: boolean },
) {
  const debounceMs = opts?.debounceMs ?? 2500;
  const enabled = opts?.enabled ?? true;
  const [cloudSavedAt, setCloudSavedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "offline">("idle");
  const idRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const armedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect user and load/create the autosave row
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        setStatus("offline");
        return;
      }
      userIdRef.current = uid;
      const { data: row } = await supabase
        .from("zakat_drafts")
        .select("id, updated_at")
        .eq("user_id", uid)
        .eq("wizard_kind", wizardKind)
        .eq("title", AUTOSAVE_TITLE)
        .maybeSingle();
      if (cancelled) return;
      if (row) {
        idRef.current = row.id;
        setCloudSavedAt(row.updated_at as string);
      }
      // Arm after a short delay to skip initial-state churn
      setTimeout(() => {
        armedRef.current = true;
      }, 400);
    })();
    return () => {
      cancelled = true;
    };
  }, [wizardKind, enabled]);

  // Debounced upsert
  useEffect(() => {
    if (!enabled || !armedRef.current || !userIdRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        const uid = userIdRef.current!;
        if (idRef.current) {
          const { error } = await supabase
            .from("zakat_drafts")
            .update({ snapshot: snapshot as any, step })
            .eq("id", idRef.current);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("zakat_drafts")
            .insert({
              user_id: uid,
              wizard_kind: wizardKind,
              title: AUTOSAVE_TITLE,
              step,
              snapshot: snapshot as any,
            })
            .select("id")
            .single();
          if (error) throw error;
          idRef.current = data.id;
        }
        setCloudSavedAt(new Date().toISOString());
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [snapshot, step, wizardKind, debounceMs, enabled]);

  return { cloudSavedAt, status };
}
