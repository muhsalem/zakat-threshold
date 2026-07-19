// Import zakat-fitr archive entries from Excel/CSV.
// Accepts flexible Arabic/English headers, tolerates missing optional cols.

import * as XLSX from "xlsx";

export type FitrImportRow = {
  year: number;
  peopleCount: number;
  stapleId: string;
  stapleLabel: string;
  kgPerSaa: number;
  pricePerKg: number;
  currency: string;
  totalKg: number;
  totalCash: number;
  savedAt: string;
};

const HEADER_MAP: Record<string, keyof FitrImportRow> = {
  year: "year", السنة: "year", العام: "year",
  people: "peopleCount", peoplecount: "peopleCount", count: "peopleCount",
  الافراد: "peopleCount", الأفراد: "peopleCount", عددالافراد: "peopleCount", عددالأفراد: "peopleCount",
  staple: "stapleLabel", stapleid: "stapleId", staplelabel: "stapleLabel",
  القوت: "stapleLabel", الطعام: "stapleLabel",
  kgpersaa: "kgPerSaa", kgساع: "kgPerSaa", كجمصاع: "kgPerSaa", كجمللصاع: "kgPerSaa",
  price: "pricePerKg", priceperkg: "pricePerKg", سعرالكجم: "pricePerKg", سعركجم: "pricePerKg", "سعر/كجم": "pricePerKg",
  currency: "currency", العملة: "currency",
  totalkg: "totalKg", الوزن: "totalKg", "الوزن(كجم)": "totalKg", إجماليالوزن: "totalKg",
  totalcash: "totalCash", total: "totalCash", القيمة: "totalCash", الاجمالي: "totalCash", الإجمالي: "totalCash",
  savedat: "savedAt", التاريخ: "savedAt",
};

function normHeader(h: string): string {
  return String(h).toLowerCase().replace(/[\s_\-.]+/g, "").trim();
}

function toNumber(v: unknown, def = 0): number {
  if (v == null || v === "") return def;
  const s = String(v).replace(/[,،\s]/g, "").replace(/[٠-٩]/g, (d) => "0123456789"[d.charCodeAt(0) - 0x0660]);
  const n = Number(s);
  return Number.isFinite(n) ? n : def;
}

export type ImportResult = {
  rows: FitrImportRow[];
  errors: { row: number; message: string }[];
};

export async function parseFitrFile(file: File): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { rows: [], errors: [{ row: 0, message: "الملف فارغ" }] };
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });

  const rows: FitrImportRow[] = [];
  const errors: { row: number; message: string }[] = [];

  raw.forEach((r, idx) => {
    const mapped: Partial<FitrImportRow> = {};
    for (const [k, v] of Object.entries(r)) {
      const field = HEADER_MAP[normHeader(k)];
      if (!field) continue;
      (mapped as Record<string, unknown>)[field] = v;
    }
    const year = toNumber(mapped.year, 0);
    if (!year || year < 1900 || year > 2200) {
      errors.push({ row: idx + 2, message: "السنة غير صالحة" });
      return;
    }
    const kgPerSaa = toNumber(mapped.kgPerSaa, 2.5) || 2.5;
    const peopleCount = Math.max(0, Math.round(toNumber(mapped.peopleCount, 0)));
    const pricePerKg = toNumber(mapped.pricePerKg, 0);
    const rawTotalKg = (mapped as Record<string, unknown>).totalKg;
    const rawTotalCash = (mapped as Record<string, unknown>).totalCash;
    const totalKg = rawTotalKg != null && rawTotalKg !== ""
      ? toNumber(rawTotalKg, 0) : peopleCount * kgPerSaa;
    const totalCash = rawTotalCash != null && rawTotalCash !== ""
      ? toNumber(rawTotalCash, 0) : totalKg * pricePerKg;

    rows.push({
      year,
      peopleCount,
      stapleId: String(mapped.stapleId ?? "wheat"),
      stapleLabel: String(mapped.stapleLabel ?? "قمح / دقيق"),
      kgPerSaa,
      pricePerKg,
      currency: String(mapped.currency ?? "USD").toUpperCase(),
      totalKg,
      totalCash,
      savedAt: mapped.savedAt ? String(mapped.savedAt) : new Date().toISOString(),
    });
  });

  return { rows, errors };
}

export function buildFitrTemplate(): Blob {
  const rows = [
    { year: 2024, peopleCount: 5, stapleId: "wheat", stapleLabel: "قمح / دقيق",
      kgPerSaa: 2.5, pricePerKg: 1.2, currency: "USD", totalKg: 12.5, totalCash: 15 },
    { year: 2025, peopleCount: 5, stapleId: "rice", stapleLabel: "أرز",
      kgPerSaa: 2.5, pricePerKg: 1.5, currency: "USD", totalKg: 12.5, totalCash: 18.75 },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "fitr");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
