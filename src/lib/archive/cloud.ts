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
    writeLocal(kind, readLocal(kind).filter((e) => e.id !== id));
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
 * One-shot migration: push any localStorage rows for `kind` into the cloud
 * for the signed-in user, then clear the local cache. Safe to call multiple
 * times — upsert de-duplicates on (user_id, kind, year, currency).
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

export function isAuthedArchive(): Promise<boolean> {
  return getUserId().then((u) => !!u);
}
