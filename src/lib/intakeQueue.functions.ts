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
import { z } from "zod";

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
