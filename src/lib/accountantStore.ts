// متجر بسيط لبوابة المحاسب — يعتمد localStorage. للاستخدام الإنتاجي يُربط بجداول Lovable Cloud.
import { ZAKAT_RATE } from "@/lib/zakat";

export type ClientKind = "individual" | "company" | "institution";
export type ClientStatus = "new" | "in_progress" | "review" | "completed" | "archived";
export type Madhab = "hanafi" | "maliki" | "shafii" | "hanbali" | "mixed";

export type ZakatBreakdown = {
  cash: number;         // نقد وأرصدة
  gold: number;         // ذهب/فضة (بالقيمة)
  investments: number;  // أسهم/صناديق/عقارات تجارية
  inventory: number;    // بضاعة/عروض تجارة (للشركات)
  receivables: number;  // ديون مستحقة للعميل
  debts: number;        // ديون على العميل (تُطرح)
};

export type HistoryEntry = {
  at: string;
  action: string;
  by?: string;
  amount?: number;
};

export type Client = {
  id: string;
  name: string;
  kind: ClientKind;
  currency: string;
  country: string;            // SA, EG, AE, KW, ...
  madhab: Madhab;
  fiscalYear: number;         // 2025, 2026
  status: ClientStatus;
  hawlDate: string;           // ISO
  nisab: number;
  breakdown: ZakatBreakdown;
  lastCalcAt?: string;        // ISO
  lastCalcAmount?: number;
  notes?: string;
  history: HistoryEntry[];
  email?: string;
  createdVia?: "manual" | "intake";
};

const KEY = "accountant_clients_v2";

export function wealthOf(c: Client): number {
  const b = c.breakdown;
  return Math.max(0, b.cash + b.gold + b.investments + b.inventory + b.receivables - b.debts);
}

export function zakatOf(c: Client): number {
  const w = wealthOf(c);
  return w >= c.nisab ? w * ZAKAT_RATE : 0;
}

export type ComplianceIssue = { level: "error" | "warn" | "ok"; code: string; message: string };

export function complianceCheck(c: Client): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const b = c.breakdown;
  if (b.cash === 0 && b.gold === 0 && b.investments === 0 && b.inventory === 0) {
    issues.push({ level: "error", code: "empty", message: "لم تُدخل أي أصول زكوية" });
  }
  if (c.kind !== "individual" && b.inventory === 0) {
    issues.push({ level: "warn", code: "no_inventory", message: "لا توجد عروض تجارة/مخزون للشركة" });
  }
  if (b.cash === 0) issues.push({ level: "warn", code: "no_cash", message: "لم يُدخل النقد والأرصدة البنكية" });
  if (b.gold === 0 && c.kind === "individual") issues.push({ level: "warn", code: "no_gold", message: "لم يُدخل الذهب والفضة" });
  if (b.investments === 0) issues.push({ level: "warn", code: "no_inv", message: "لم تُدخل الأسهم/الاستثمارات" });
  if (b.debts === 0) issues.push({ level: "warn", code: "no_debts", message: "لم يتم التحقق من الديون المستحقة" });
  if (!c.hawlDate) issues.push({ level: "error", code: "no_hawl", message: "تاريخ الحول غير محدد" });
  if (c.nisab <= 0) issues.push({ level: "error", code: "no_nisab", message: "قيمة النصاب غير محددة" });
  if (issues.length === 0) issues.push({ level: "ok", code: "ready", message: "البيانات جاهزة للتقرير" });
  return issues;
}

export function complianceScore(c: Client): number {
  const issues = complianceCheck(c);
  const errors = issues.filter((i) => i.level === "error").length;
  const warns = issues.filter((i) => i.level === "warn").length;
  return Math.max(0, 100 - errors * 30 - warns * 10);
}

function emptyBreakdown(): ZakatBreakdown {
  return { cash: 0, gold: 0, investments: 0, inventory: 0, receivables: 0, debts: 0 };
}

const SEED: Client[] = [
  {
    id: "c1", name: "أحمد الغامدي", kind: "individual", currency: "SAR", country: "SA",
    madhab: "hanbali", fiscalYear: 2026, status: "in_progress", hawlDate: "2026-08-14",
    nisab: 24000, createdVia: "manual",
    breakdown: { cash: 65000, gold: 40000, investments: 25000, inventory: 0, receivables: 5000, debts: 7000 },
    history: [{ at: new Date().toISOString(), action: "أنشأ العميل" }],
  },
  {
    id: "c2", name: "شركة الرواسي التجارية", kind: "company", currency: "SAR", country: "SA",
    madhab: "mixed", fiscalYear: 2026, status: "review", hawlDate: "2026-07-30",
    nisab: 24000, createdVia: "manual",
    breakdown: { cash: 1200000, gold: 0, investments: 800000, inventory: 3000000, receivables: 450000, debts: 630000 },
    history: [{ at: new Date().toISOString(), action: "استيراد ميزان مراجعة" }],
    lastCalcAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    lastCalcAmount: 120000,
  },
  {
    id: "c3", name: "منى العتيبي", kind: "individual", currency: "SAR", country: "SA",
    madhab: "shafii", fiscalYear: 2026, status: "new", hawlDate: "2026-09-02",
    nisab: 24000, breakdown: emptyBreakdown(), history: [], createdVia: "intake",
  },
  {
    id: "c4", name: "مؤسسة نور الصناعية", kind: "institution", currency: "SAR", country: "AE",
    madhab: "maliki", fiscalYear: 2026, status: "completed", hawlDate: "2025-10-11",
    nisab: 24000, createdVia: "manual",
    breakdown: { cash: 320000, gold: 0, investments: 400000, inventory: 250000, receivables: 15000, debts: 20000 },
    history: [
      { at: new Date(Date.now() - 30 * 86400000).toISOString(), action: "أنشأ العميل" },
      { at: new Date(Date.now() - 2 * 86400000).toISOString(), action: "احتساب الزكاة", amount: 24125 },
    ],
    lastCalcAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    lastCalcAmount: 24125,
  },
];

export function loadClients(): Client[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED;
    return JSON.parse(raw) as Client[];
  } catch { return SEED; }
}

export function saveClients(list: Client[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function upsertClient(c: Client) {
  const list = loadClients();
  const idx = list.findIndex((x) => x.id === c.id);
  if (idx >= 0) list[idx] = c; else list.push(c);
  saveClients(list);
}

export function newClientFromIntake(payload: {
  name: string; email: string; kind: ClientKind; country: string; madhab: Madhab;
  breakdown: Partial<ZakatBreakdown>; hawlDate?: string; notes?: string;
}): Client {
  return {
    id: crypto.randomUUID(),
    name: payload.name,
    email: payload.email,
    kind: payload.kind,
    currency: "SAR",
    country: payload.country,
    madhab: payload.madhab,
    fiscalYear: new Date().getFullYear(),
    status: "new",
    hawlDate: payload.hawlDate || new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    nisab: 24000,
    breakdown: { ...emptyBreakdown(), ...payload.breakdown },
    notes: payload.notes,
    createdVia: "intake",
    history: [{ at: new Date().toISOString(), action: "استلام بيانات من العميل عبر النافذة التسويقية" }],
  };
}

export const COUNTRY_LABELS: Record<string, string> = {
  SA: "السعودية", AE: "الإمارات", KW: "الكويت", QA: "قطر", BH: "البحرين", OM: "عُمان",
  EG: "مصر", JO: "الأردن", MA: "المغرب", TR: "تركيا", ID: "إندونيسيا", MY: "ماليزيا",
};

export const MADHAB_LABELS: Record<Madhab, string> = {
  hanafi: "حنفي", maliki: "مالكي", shafii: "شافعي", hanbali: "حنبلي", mixed: "مختلط/موازن",
};

export const STATUS_LABELS: Record<ClientStatus, string> = {
  new: "جديد", in_progress: "قيد الإعداد", review: "قيد المراجعة", completed: "مكتمل", archived: "مؤرشف",
};

export const KIND_LABELS: Record<ClientKind, string> = {
  individual: "فرد", company: "شركة", institution: "مؤسسة",
};
