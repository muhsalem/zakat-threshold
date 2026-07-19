// Cloud-backed report archive.
// Uses the browser Supabase client with RLS so each user only sees their own rows.
// Falls back to localStorage when the user is not signed in.

import { supabase } from "@/integrations/supabase/client";

export type ArchiveKind = "fitr" | string;

export type ArchiveRow<T = Record<string, unknown>> = {
  id: string;
  kind: ArchiveKind;
  year: number | null;
  currency: string | null;
  payload: T;
  created_at: string;
  updated_at: string;
};

export type ArchiveEntryInput<T = Record<string, unknown>> = {
  year: number | null;
  currency: string | null;
  payload: T;
};

const LOCAL_PREFIX = "report-archive-v1:";
const lkey = (kind: ArchiveKind) => `${LOCAL_PREFIX}${kind}`;

function readLocal<T>(kind: ArchiveKind): ArchiveRow<T>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(lkey(kind));
    return raw ? (JSON.parse(raw) as ArchiveRow<T>[]) : [];
  } catch {
    return [];
  }
}
function writeLocal<T>(kind: ArchiveKind, list: ArchiveRow<T>[]) {
  try {
    window.localStorage.setItem(lkey(kind), JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listArchive<T>(kind: ArchiveKind): Promise<ArchiveRow<T>[]> {
  const uid = await getUserId();
  if (!uid) return readLocal<T>(kind);
  const { data, error } = await supabase
    .from("user_report_archive")
    .select("id, kind, year, currency, payload, created_at, updated_at")
    .eq("kind", kind)
    .order("year", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ArchiveRow<T>[];
}

export async function saveArchiveEntry<T extends Record<string, unknown>>(
  kind: ArchiveKind,
  entry: ArchiveEntryInput<T>,
): Promise<ArchiveRow<T>> {
  const uid = await getUserId();
  if (!uid) {
    const list = readLocal<T>(kind);
    const now = new Date().toISOString();
    const id = `local-${kind}-${entry.year ?? "na"}-${entry.currency ?? "na"}`;
    const row: ArchiveRow<T> = {
      id,
      kind,
      year: entry.year,
      currency: entry.currency,
      payload: entry.payload,
      created_at: now,
      updated_at: now,
    };
    const next = [row, ...list.filter((e) => e.id !== id)];
    writeLocal(kind, next);
    return row;
  }
  const { data, error } = await supabase
    .from("user_report_archive")
    .upsert(
      {
        user_id: uid,
        kind,
        year: entry.year,
        currency: entry.currency,
        payload: entry.payload as never,
      },
      { onConflict: "user_id,kind,year,currency" },
    )
    .select("id, kind, year, currency, payload, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as unknown as ArchiveRow<T>;
}

export async function deleteArchiveEntry(kind: ArchiveKind, id: string): Promise<void> {
  const uid = await getUserId();
  if (!uid) {
    writeLocal(
      kind,
      readLocal(kind).filter((e) => e.id !== id),
    );
    return;
  }
  const { error } = await supabase.from("user_report_archive").delete().eq("id", id);
  if (error) throw error;
}

export async function clearArchive(kind: ArchiveKind): Promise<void> {
  const uid = await getUserId();
  if (!uid) {
    writeLocal(kind, []);
    return;
  }
  const { error } = await supabase
    .from("user_report_archive")
    .delete()
    .eq("kind", kind)
    .eq("user_id", uid);
  if (error) throw error;
}

/**
 * Legacy one-shot migration kept for callers that want silent behavior.
 * New flow is: previewMigration -> user confirms -> commitMigration.
 */
export async function migrateLocalToCloud(kind: ArchiveKind): Promise<number> {
  const uid = await getUserId();
  if (!uid) return 0;
  const local = readLocal(kind);
  if (!local.length) return 0;
  const rows = local.map((e) => ({
    user_id: uid,
    kind,
    year: e.year,
    currency: e.currency,
    payload: e.payload as never,
  }));
  const { error } = await supabase
    .from("user_report_archive")
    .upsert(rows, { onConflict: "user_id,kind,year,currency" });
  if (error) throw error;
  writeLocal(kind, []);
  return rows.length;
}

/** Archive kinds that participate in the sign-in migration flow. */
export const MIGRATABLE_KINDS: ArchiveKind[] = ["fitr"];

/** Session flag to avoid re-showing the confirmation dialog after dismiss. */
const DISMISS_KEY = "archive-migration-dismissed-v1";
export function isMigrationDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
export function setMigrationDismissed(v: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (v) window.sessionStorage.setItem(DISMISS_KEY, "1");
    else window.sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

export type MigrationItem = {
  kind: ArchiveKind;
  year: number | null;
  currency: string | null;
  payload: Record<string, unknown>;
  status: "new" | "duplicate";
};

export type MigrationPreview = {
  items: MigrationItem[];
  totalLocal: number;
  newCount: number;
  duplicateCount: number;
};

export function listLocal<T = Record<string, unknown>>(kind: ArchiveKind): ArchiveRow<T>[] {
  return readLocal<T>(kind);
}

export function discardLocal(kind: ArchiveKind) {
  writeLocal(kind, []);
}

export async function previewMigration(
  kinds: ArchiveKind[] = MIGRATABLE_KINDS,
): Promise<MigrationPreview> {
  const uid = await getUserId();
  const items: MigrationItem[] = [];
  if (!uid) return { items, totalLocal: 0, newCount: 0, duplicateCount: 0 };

  for (const kind of kinds) {
    const local = readLocal(kind);
    if (!local.length) continue;
    const { data, error } = await supabase
      .from("user_report_archive")
      .select("year, currency")
      .eq("kind", kind);
    if (error) throw error;
    const existing = new Set((data ?? []).map((r) => `${r.year ?? "na"}|${r.currency ?? "na"}`));
    for (const row of local) {
      const key = `${row.year ?? "na"}|${row.currency ?? "na"}`;
      items.push({
        kind,
        year: row.year,
        currency: row.currency,
        payload: row.payload as Record<string, unknown>,
        status: existing.has(key) ? "duplicate" : "new",
      });
    }
  }
  const newCount = items.filter((i) => i.status === "new").length;
  return {
    items,
    totalLocal: items.length,
    newCount,
    duplicateCount: items.length - newCount,
  };
}

export type MigrationStrategy = "skip-duplicates" | "overwrite";

export async function commitMigration(
  strategy: MigrationStrategy,
  kinds: ArchiveKind[] = MIGRATABLE_KINDS,
): Promise<{ uploaded: number; skipped: number }> {
  const uid = await getUserId();
  if (!uid) return { uploaded: 0, skipped: 0 };
  const preview = await previewMigration(kinds);
  const chosen =
    strategy === "overwrite" ? preview.items : preview.items.filter((i) => i.status === "new");
  if (chosen.length) {
    const rows = chosen.map((i) => ({
      user_id: uid,
      kind: i.kind,
      year: i.year,
      currency: i.currency,
      payload: i.payload as never,
    }));
    const { error } = await supabase
      .from("user_report_archive")
      .upsert(rows, { onConflict: "user_id,kind,year,currency" });
    if (error) throw error;
  }
  for (const kind of kinds) writeLocal(kind, []);
  setMigrationDismissed(true);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("archive:migrated", { detail: { kinds } }));
  }
  return {
    uploaded: chosen.length,
    skipped: preview.totalLocal - chosen.length,
  };
}

export function isAuthedArchive(): Promise<boolean> {
  return getUserId().then((u) => !!u);
}
