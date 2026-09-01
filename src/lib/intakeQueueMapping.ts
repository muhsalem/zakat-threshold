/**
 * تحويل صف intake_queue إلى مدخلات createClient في accountantStore.
 *
 * منفصل عن دوال الخادم والمكوّن عمداً: لا يستورد React ولا Supabase، فيُختبر
 * كدالة نقية. الصف يأتي من قاعدة البيانات لكن مصدره الأصلي زائر مجهول
 * (submitPublicIntake)، فلا نثق بنوعه ولا بمذهبه ولا بتاريخه — كل قيمة
 * تُفحص وتُرجَع إلى افتراضي آمن إن خرجت عن المسموح.
 */
import type { ClientKind, Madhab, ZakatBreakdown } from "@/lib/accountantStore";

export const INTAKE_STATUSES = ["pending", "assigned", "done"] as const;
export type IntakeStatus = (typeof INTAKE_STATUSES)[number];

export interface IntakeQueueRow {
  id: string;
  name: string;
  email: string | null;
  kind: string;
  country: string;
  madhab: string;
  hawl_date: string | null;
  // any لا unknown: فاحص التسلسل في TanStack Start يرفض unknown ("Type may
  // not be serializable") ويقبل any — العُرف نفسه في ReviewQueueItem.payload.
  // الحرّاس في intakeRowToClientInput لا تثق بالمحتوى على أي حال.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  breakdown: Record<string, any> | null;
  notes: string | null;
  created_via: string | null;
  status: IntakeStatus;
  assigned_to: string | null;
  created_at: string;
}

const KINDS: readonly ClientKind[] = ["individual", "company", "institution"];
const MADHABS: readonly Madhab[] = ["hanafi", "maliki", "shafii", "hanbali", "mixed"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** يُبقي الحقول الرقمية المنتهية فقط — أي شيء آخر في breakdown يُسقَط. */
function numericOnly(v: unknown): Partial<ZakatBreakdown> {
  if (!isRecord(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === "number" && Number.isFinite(val)) out[k] = val;
  }
  return out as Partial<ZakatBreakdown>;
}

export interface IntakeClientInput {
  name: string;
  kind: ClientKind;
  country: string;
  madhab: Madhab;
  hawlDate?: string;
  breakdown?: Partial<ZakatBreakdown>;
  email?: string;
  notes?: string;
  createdVia: "intake";
  intakeDetails: Record<string, unknown> | null;
}

export function intakeRowToClientInput(row: IntakeQueueRow): IntakeClientInput {
  // submitPublicIntake يخزّن payload النموذج كاملاً في عمود breakdown:
  // { breakdown: <المجمَّع>, intakeDetails: <كل حقول النموذج>, ... }
  const stored = isRecord(row.breakdown) ? row.breakdown : {};
  const kind = (KINDS as readonly string[]).includes(row.kind)
    ? (row.kind as ClientKind)
    : "individual";
  const madhab = (MADHABS as readonly string[]).includes(row.madhab)
    ? (row.madhab as Madhab)
    : "mixed";
  const hawlDate = row.hawl_date && DATE_RE.test(row.hawl_date) ? row.hawl_date : undefined;
  const country = /^[A-Z]{2}$/.test(row.country ?? "") ? row.country : "SA";

  return {
    name: row.name,
    kind,
    country,
    madhab,
    hawlDate,
    breakdown: numericOnly(stored.breakdown),
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    createdVia: "intake",
    intakeDetails: isRecord(stored.intakeDetails) ? stored.intakeDetails : null,
  };
}
