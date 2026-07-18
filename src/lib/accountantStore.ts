// متجر بوابة المحاسب — يعتمد Lovable Cloud (Supabase) مع RLS يقيّد كل محاسب على عملائه فقط.
import { supabase } from "@/integrations/supabase/client";
import { ZAKAT_RATE } from "@/lib/zakat";

export type ClientKind = "individual" | "company" | "institution";
export type ClientStatus = "new" | "in_progress" | "review" | "completed" | "archived";
export type Madhab = "hanafi" | "maliki" | "shafii" | "hanbali" | "mixed";

export type ZakatBreakdown = {
  cash: number;
  gold: number;
  investments: number;
  inventory: number;
  receivables: number;
  debts: number;
};

export type HistoryEntry = {
  at: string;
  action: string;
  by?: string;
  amount?: number;
};

export type Client = {
  id: string;
  ownerId: string;
  name: string;
  kind: ClientKind;
  currency: string;
  country: string;
  madhab: Madhab;
  fiscalYear: number;
  status: ClientStatus;
  hawlDate: string;
  nisab: number;
  breakdown: ZakatBreakdown;
  lastCalcAt?: string;
  lastCalcAmount?: number;
  notes?: string;
  history: HistoryEntry[];
  email?: string;
  createdVia?: "manual" | "intake";
  intakeDetails?: Record<string, unknown> | null;
};

function emptyBreakdown(): ZakatBreakdown {
  return { cash: 0, gold: 0, investments: 0, inventory: 0, receivables: 0, debts: 0 };
}

function normalizeBreakdown(input: unknown): ZakatBreakdown {
  const b = (input ?? {}) as Partial<ZakatBreakdown>;
  return {
    cash: Number(b.cash) || 0,
    gold: Number(b.gold) || 0,
    investments: Number(b.investments) || 0,
    inventory: Number(b.inventory) || 0,
    receivables: Number(b.receivables) || 0,
    debts: Number(b.debts) || 0,
  };
}

type ClientRow = {
  id: string;
  owner_id: string;
  name: string;
  email: string | null;
  kind: string;
  currency: string;
  country: string;
  madhab: string;
  fiscal_year: number;
  status: string;
  hawl_date: string | null;
  nisab: number | string;
  breakdown: unknown;
  notes: string | null;
  created_via: string;
  last_calc_at: string | null;
  last_calc_amount: number | string | null;
};

type HistoryRow = {
  id: string;
  client_id: string;
  action: string;
  by_name: string | null;
  amount: number | string | null;
  created_at: string;
};

function rowToClient(r: ClientRow, history: HistoryEntry[] = []): Client {
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    email: r.email ?? undefined,
    kind: (r.kind as ClientKind) || "individual",
    currency: r.currency || "SAR",
    country: r.country || "SA",
    madhab: (r.madhab as Madhab) || "mixed",
    fiscalYear: r.fiscal_year,
    status: (r.status as ClientStatus) || "new",
    hawlDate: r.hawl_date ?? "",
    nisab: Number(r.nisab) || 0,
    breakdown: normalizeBreakdown(r.breakdown),
    notes: r.notes ?? undefined,
    createdVia: (r.created_via as "manual" | "intake") || "manual",
    lastCalcAt: r.last_calc_at ?? undefined,
    lastCalcAmount: r.last_calc_amount != null ? Number(r.last_calc_amount) : undefined,
    history,
  };
}

// ============ Derived / pure helpers ============
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
    issues.push({
      level: "warn",
      code: "no_inventory",
      message: "لا توجد عروض تجارة/مخزون للشركة",
    });
  }
  if (b.cash === 0)
    issues.push({ level: "warn", code: "no_cash", message: "لم يُدخل النقد والأرصدة البنكية" });
  if (b.gold === 0 && c.kind === "individual")
    issues.push({ level: "warn", code: "no_gold", message: "لم يُدخل الذهب والفضة" });
  if (b.investments === 0)
    issues.push({ level: "warn", code: "no_inv", message: "لم تُدخل الأسهم/الاستثمارات" });
  if (b.debts === 0)
    issues.push({ level: "warn", code: "no_debts", message: "لم يتم التحقق من الديون المستحقة" });
  if (!c.hawlDate)
    issues.push({ level: "error", code: "no_hawl", message: "تاريخ الحول غير محدد" });
  if (c.nisab <= 0)
    issues.push({ level: "error", code: "no_nisab", message: "قيمة النصاب غير محددة" });
  if (issues.length === 0)
    issues.push({ level: "ok", code: "ready", message: "البيانات جاهزة للتقرير" });
  return issues;
}

export function complianceScore(c: Client): number {
  const issues = complianceCheck(c);
  const errors = issues.filter((i) => i.level === "error").length;
  const warns = issues.filter((i) => i.level === "warn").length;
  return Math.max(0, 100 - errors * 30 - warns * 10);
}

// ============ Data access (Supabase) ============
async function getOwnerId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchClients(): Promise<Client[]> {
  const { data: rows, error } = await supabase
    .from("accountant_clients")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const list = (rows ?? []) as ClientRow[];
  if (list.length === 0) return [];
  const ids = list.map((r) => r.id);
  const { data: hist } = await supabase
    .from("accountant_client_history")
    .select("*")
    .in("client_id", ids)
    .order("created_at", { ascending: true });
  const byClient = new Map<string, HistoryEntry[]>();
  ((hist ?? []) as HistoryRow[]).forEach((h) => {
    const arr = byClient.get(h.client_id) ?? [];
    arr.push({
      at: h.created_at,
      action: h.action,
      by: h.by_name ?? undefined,
      amount: h.amount != null ? Number(h.amount) : undefined,
    });
    byClient.set(h.client_id, arr);
  });
  return list.map((r) => rowToClient(r, byClient.get(r.id) ?? []));
}

export async function fetchClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("accountant_clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: hist } = await supabase
    .from("accountant_client_history")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: true });
  const history: HistoryEntry[] = ((hist ?? []) as HistoryRow[]).map((h) => ({
    at: h.created_at,
    action: h.action,
    by: h.by_name ?? undefined,
    amount: h.amount != null ? Number(h.amount) : undefined,
  }));
  return rowToClient(data as ClientRow, history);
}

export type ClientPatch = Partial<Omit<Client, "id" | "ownerId" | "history">>;

function patchToRow(p: ClientPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.name !== undefined) out.name = p.name;
  if (p.email !== undefined) out.email = p.email;
  if (p.kind !== undefined) out.kind = p.kind;
  if (p.currency !== undefined) out.currency = p.currency;
  if (p.country !== undefined) out.country = p.country;
  if (p.madhab !== undefined) out.madhab = p.madhab;
  if (p.fiscalYear !== undefined) out.fiscal_year = p.fiscalYear;
  if (p.status !== undefined) out.status = p.status;
  if (p.hawlDate !== undefined) out.hawl_date = p.hawlDate || null;
  if (p.nisab !== undefined) out.nisab = p.nisab;
  if (p.breakdown !== undefined) out.breakdown = p.breakdown;
  if (p.notes !== undefined) out.notes = p.notes;
  if (p.createdVia !== undefined) out.created_via = p.createdVia;
  if (p.lastCalcAt !== undefined) out.last_calc_at = p.lastCalcAt || null;
  if (p.lastCalcAmount !== undefined) out.last_calc_amount = p.lastCalcAmount ?? null;
  return out;
}

export async function updateClient(id: string, patch: ClientPatch): Promise<void> {
  const row = patchToRow(patch) as never;
  const { error } = await supabase.from("accountant_clients").update(row).eq("id", id);
  if (error) throw error;
}

export async function createClient(input: {
  name: string;
  kind: ClientKind;
  country: string;
  madhab: Madhab;
  currency?: string;
  fiscalYear?: number;
  hawlDate?: string;
  nisab?: number;
  breakdown?: Partial<ZakatBreakdown>;
  email?: string;
  notes?: string;
  createdVia?: "manual" | "intake";
  status?: ClientStatus;
}): Promise<Client> {
  const ownerId = await getOwnerId();
  if (!ownerId) throw new Error("يجب تسجيل الدخول أولاً");
  const row = {
    owner_id: ownerId,
    name: input.name,
    email: input.email ?? null,
    kind: input.kind,
    currency: input.currency ?? "SAR",
    country: input.country,
    madhab: input.madhab,
    fiscal_year: input.fiscalYear ?? new Date().getFullYear(),
    status: input.status ?? "new",
    hawl_date: input.hawlDate ?? new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    nisab: input.nisab ?? 24000,
    breakdown: { ...emptyBreakdown(), ...(input.breakdown ?? {}) },
    notes: input.notes ?? null,
    created_via: input.createdVia ?? "manual",
  };
  const { data, error } = await supabase
    .from("accountant_clients")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  await addHistory(data.id, {
    at: new Date().toISOString(),
    action:
      input.createdVia === "intake"
        ? "استلام بيانات من العميل عبر النافذة التسويقية"
        : "أنشأ العميل يدوياً",
  });
  return rowToClient(data as ClientRow, []);
}

export async function deleteClients(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from("accountant_clients").delete().in("id", ids);
  if (error) throw error;
}

export async function addHistory(
  clientId: string,
  entry: Omit<HistoryEntry, "at"> & { at?: string },
): Promise<void> {
  const ownerId = await getOwnerId();
  if (!ownerId) return;
  const { error } = await supabase.from("accountant_client_history").insert({
    client_id: clientId,
    owner_id: ownerId,
    action: entry.action,
    by_name: entry.by ?? null,
    amount: entry.amount ?? null,
  });
  if (error) throw error;
}

// ============ Labels ============
export const COUNTRY_LABELS: Record<string, string> = {
  SA: "السعودية",
  AE: "الإمارات",
  KW: "الكويت",
  QA: "قطر",
  BH: "البحرين",
  OM: "عُمان",
  EG: "مصر",
  JO: "الأردن",
  MA: "المغرب",
  TR: "تركيا",
  ID: "إندونيسيا",
  MY: "ماليزيا",
};

export const MADHAB_LABELS: Record<Madhab, string> = {
  hanafi: "حنفي",
  maliki: "مالكي",
  shafii: "شافعي",
  hanbali: "حنبلي",
  mixed: "مختلط/موازن",
};

export const STATUS_LABELS: Record<ClientStatus, string> = {
  new: "جديد",
  in_progress: "قيد الإعداد",
  review: "قيد المراجعة",
  completed: "مكتمل",
  archived: "مؤرشف",
};

export const KIND_LABELS: Record<ClientKind, string> = {
  individual: "فرد",
  company: "شركة",
  institution: "مؤسسة",
};
