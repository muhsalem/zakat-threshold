/**
 * استلام طلبات الزوّار غير المسجَّلين إلى جدول intake_queue.
 *
 * الجدول وسياساته وفهارسه أُنشئت في 20260707000002_intake_queue.sql
 * ونصّت الهجرة صراحةً: "الكتابة من service_role فقط (via Edge Function أو
 * Server Function)". لكن تلك الدالة لم تُكتب قط، فظل النموذج العام يحفظ
 * الطلب في localStorage الخاص بالزائر — ولا يقرأ ذلك المفتاح أي شيء في
 * المستودع، والمحاسب على جهاز آخر أصلاً. هذا الملف يصل السلك المقطوع.
 *
 * لا مصادقة هنا بحكم الغرض: الزائر غير مسجَّل. لذلك التحقق كله خادمي —
 * مصيدة العميل وفحص التوقيت في client-intake.tsx يتجاوزهما من يرسل إلى
 * الدالة مباشرة، فلا يُعوَّل عليهما.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { INTAKE_STATUSES, type IntakeQueueRow, type IntakeStatus } from "@/lib/intakeQueueMapping";

// حدود الحقول مطابقة لـintakeSchema في الواجهة، ومكرَّرة عمداً: تلك تحمي
// تجربة المستخدم، وهذه تحمي قاعدة البيانات.
export const intakeInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  kind: z.enum(["individual", "company", "institution"]).default("individual"),
  country: z.string().trim().length(2).default("SA"),
  madhab: z.string().trim().max(32).default("mixed"),
  hawlDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().max(2000).optional(),
  breakdown: z.record(z.string(), z.unknown()).default({}),
  // مصيدة: أي قيمة تعني آلة. تُفحص خادمياً لا في المتصفح وحده.
  hp: z.string().max(0).optional(),
});

/** حجم الحمولة المقبولة — يمنع إغراق الجدول بـbreakdown ضخم. */
const MAX_BREAKDOWN_BYTES = 64 * 1024;

export const submitPublicIntake = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => intakeInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    // نقطة كتابة مجهولة الهوية — بلا حدّ معدّل يُغرَق الجدول بلا كلفة على
    // المُرسِل. خمسة طلبات في الساعة لكل عنوان: أكرم من حاجة زائر صادق
    // (يرسل مرة) وأضيق من أن تُجدي آلة.
    const rl = await rateLimit(getRequest(), {
      key: "public-intake",
      limit: 5,
      windowMs: 60 * 60_000,
    });
    if (!rl.ok) throw new Error("rate_limited");

    const breakdown = JSON.parse(JSON.stringify(data.breakdown ?? {}));
    if (JSON.stringify(breakdown).length > MAX_BREAKDOWN_BYTES) {
      throw new Error("breakdown_too_large");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: saved, error } = await (supabaseAdmin.from("intake_queue" as never) as any)
      .insert({
        name: data.name,
        email: data.email,
        kind: data.kind,
        country: data.country,
        madhab: data.madhab,
        hawl_date: data.hawlDate ?? null,
        notes: data.notes ?? null,
        breakdown,
        created_via: "public_intake",
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw new Error((error as { message: string }).message);
    return { id: (saved as { id: string }).id };
  });

// ─────────────────────────────────────────────────────────────────────────
// جانب المحاسب: قراءة الطابور وإسناده وختمه. كلها بجلسة المستخدم (RLS
// طبقة ثانية) مع فحص دور صريح — سياسة الهجرة تسمح لـaccountant وadmin.
// ─────────────────────────────────────────────────────────────────────────

async function isAccountantOrAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["accountant", "admin"])
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

const idSchema = z.object({ id: z.string().uuid() });
// غير اختياري عمداً: .optional() يُدخل undefined في نوع data فيضيع الاستدلال
// عند TanStack وتصير نتيجة الاستدعاء unknown في المكوّن. الغياب يُعالَج قبل parse.
const listSchema = z.object({
  status: z.enum(INTAKE_STATUSES).optional(),
  offset: z.number().int().min(0).optional(),
});
const completeSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid().optional(),
});

export const listIntakeQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<{ rows: IntakeQueueRow[]; hasMore: boolean }> => {
    if (!(await isAccountantOrAdmin(context.supabase, context.userId))) {
      throw new Error("accountant_role_required");
    }
    const PAGE = 25;
    const offset = data.offset ?? 0;
    let q = (context.supabase.from("intake_queue" as never) as any)
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error((error as { message: string }).message);
    const list = (rows ?? []) as IntakeQueueRow[];
    return { rows: list, hasMore: list.length === PAGE };
  });

/** إسناد طلب لهذا المحاسب — شرط أن يكون لا يزال pending كي لا يتصادم اثنان. */
export const assignIntakeItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (!(await isAccountantOrAdmin(context.supabase, context.userId))) {
      throw new Error("accountant_role_required");
    }
    const { data: updated, error } = await (context.supabase.from("intake_queue" as never) as any)
      .update({ status: "assigned" satisfies IntakeStatus, assigned_to: context.userId })
      .eq("id", data.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) throw new Error((error as { message: string }).message);
    if (!updated) throw new Error("تعذّر الإسناد — ربما أسنده محاسب آخر للتو");
    return { ok: true };
  });

/**
 * ختم طلب بعد استيراده كعميل — للمحاسب المُسنَد إليه وحده.
 * clientId اختياري للتوثيق في notes؛ لا عمود مخصّص له في الجدول.
 */
export const completeIntakeItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => completeSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (!(await isAccountantOrAdmin(context.supabase, context.userId))) {
      throw new Error("accountant_role_required");
    }
    const { data: updated, error } = await (context.supabase.from("intake_queue" as never) as any)
      .update({ status: "done" satisfies IntakeStatus })
      .eq("id", data.id)
      .eq("assigned_to", context.userId)
      .eq("status", "assigned")
      .select("id")
      .maybeSingle();
    if (error) throw new Error((error as { message: string }).message);
    if (!updated) throw new Error("الطلب ليس مُسنَداً إليك أو سبق ختمه");
    return { ok: true };
  });
