export type ZakatStatus = "fully_paid" | "partially_paid" | "due" | "exempt";

export type ZakatYearRecord = {
  id: string;
  yearLabel: string; // e.g. "1446 هـ" or "2024 م"
  yearType: "hijri" | "gregorian";
  yearNumber: number; // 1446, 2024, etc.
  country: string;
  city?: string;
  currency: string;
  nisabStandard: "silver" | "gold";
  nisabThreshold: number;
  netWealth: number;
  zakatRate: number; // 0.025 (Hijri) or 0.02577 (Gregorian)
  zakatDue: number;
  zakatPaid: number;
  status: ZakatStatus;
  paidDate?: string | undefined;
  recipientChannels?: string; // e.g. "منصة إحسان", "فقراء ومساكين الأقارب", "بيت الزكاة"
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "nisab_zakat_multi_year_ledger_v1";

/**
 * Earlier builds seeded every visitor with two made-up example years. They are removed
 * on read so nobody keeps invented figures as their own record.
 */
const isLegacySample = (record: { id?: string }) => String(record?.id ?? "").startsWith("sample-");

/** The ledger lives only in this browser; nothing is sent to or shared by the server. */
export function getLocalLedger(): ZakatYearRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const kept = (parsed as ZakatYearRecord[]).filter((record) => !isLegacySample(record));
    if (kept.length !== parsed.length) saveLocalLedger(kept);
    return kept;
  } catch {
    return [];
  }
}

export function saveLocalLedger(records: ZakatYearRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error("Failed to save ledger to localStorage", err);
  }
}

export function upsertLedgerRecord(record: ZakatYearRecord): ZakatYearRecord[] {
  const current = getLocalLedger();
  const index = current.findIndex((r) => r.id === record.id);
  const now = new Date().toISOString();
  let updated: ZakatYearRecord[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...record, updatedAt: now };
  } else {
    updated = [{ ...record, createdAt: record.createdAt || now, updatedAt: now }, ...current];
  }
  // Sort descending by year number
  updated.sort((a, b) => b.yearNumber - a.yearNumber);
  saveLocalLedger(updated);
  return updated;
}

export function deleteLedgerRecord(id: string): ZakatYearRecord[] {
  const current = getLocalLedger();
  const updated = current.filter((r) => r.id !== id);
  saveLocalLedger(updated);
  return updated;
}

export type LedgerStats = {
  totalRecords: number;
  totalZakatDue: number;
  totalZakatPaid: number;
  remainingDue: number;
  fullyPaidYearsCount: number;
  dueYearsCount: number;
};

export function calculateLedgerStats(records: ZakatYearRecord[]): LedgerStats {
  let totalZakatDue = 0;
  let totalZakatPaid = 0;
  let fullyPaidYearsCount = 0;
  let dueYearsCount = 0;

  for (const r of records) {
    totalZakatDue += r.zakatDue || 0;
    totalZakatPaid += r.zakatPaid || 0;
    if (r.status === "fully_paid") {
      fullyPaidYearsCount++;
    } else if (r.status === "due" || r.status === "partially_paid") {
      dueYearsCount++;
    }
  }

  return {
    totalRecords: records.length,
    totalZakatDue,
    totalZakatPaid,
    remainingDue: Math.max(0, totalZakatDue - totalZakatPaid),
    fullyPaidYearsCount,
    dueYearsCount,
  };
}
