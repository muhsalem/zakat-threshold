import { useEffect, useRef, useState } from "react";

/**
 * Autosave hook for multi-step wizards.
 * - Persists a serializable snapshot to localStorage (debounced).
 * - On mount, exposes any previously saved draft so the wizard can offer "استئناف".
 * - Provides restore() to apply the draft and clear() to remove it (call after final save).
 *
 * Storage shape: { at: ISOString, step: number, data: T }
 */
export type SavedDraft<T> = { at: string; step: number; data: T };

export function useWizardAutosave<T>(
  key: string,
  snapshot: T,
  step: number,
  opts?: { debounceMs?: number; ttlDays?: number },
) {
  const debounceMs = opts?.debounceMs ?? 800;
  const ttlMs = (opts?.ttlDays ?? 30) * 24 * 60 * 60 * 1000;

  const [savedDraft, setSavedDraft] = useState<SavedDraft<T> | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const armedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedDraft<T>;
        if (parsed?.at && Date.now() - new Date(parsed.at).getTime() < ttlMs) {
          setSavedDraft(parsed);
        } else {
          window.localStorage.removeItem(key);
        }
      }
    } catch {
      /* ignore */
    }
    // Delay arming so the initial state doesn't overwrite the saved draft
    // before the user has a chance to click "استئناف".
    const t = setTimeout(() => { armedRef.current = true; }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Debounced save on snapshot change
  useEffect(() => {
    if (!armedRef.current || typeof window === "undefined") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const payload: SavedDraft<T> = { at: new Date().toISOString(), step, data: snapshot };
        window.localStorage.setItem(key, JSON.stringify(payload));
        setSavedAt(payload.at);
      } catch {
        /* quota / serialization errors are non-fatal */
      }
    }, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [key, snapshot, step, debounceMs]);

  const clear = () => {
    try { window.localStorage.removeItem(key); } catch { /* noop */ }
    setSavedDraft(null);
    setSavedAt(null);
  };

  const dismissDraft = () => setSavedDraft(null);

  return { savedDraft, savedAt, clear, dismissDraft };
}
