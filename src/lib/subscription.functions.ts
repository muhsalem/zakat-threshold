/**
 * الكتابة الذاتية على user_subscriptions تمر من هنا فقط.
 *
 * كانت صفحة الاشتراك تكتب مباشرة من المتصفح على user_subscriptions (سياسة
 * FOR ALL بشرط ملكية الصف فقط)، فكان المستخدم يستطيع تعديل صفّه:
 *   update user_subscriptions set plan_id='enterprise', amount=0, status='active'
 * الآن RLS تمنحه SELECT فقط (migration 20260810090000)، وما يبقى هنا هو
 * الإجراءات الذاتية المشروعة — الإلغاء عند نهاية الفترة والاستئناف — ولا تلمس
 * أبداً plan_id أو amount أو billing_period.
 *
 * نطاق الأثر بدقة: بوابة الميزات تقرأ `profiles.plan` (payments.ts:73)، لا هذا
 * الجدول. فالثغرة لم تكن تمنح وصولاً فعلياً لميزات مدفوعة، بل شارة خطة مضلِّلة
 * ومبلغ `amount` مزوَّراً تبني منه صفحة التأكيد فاتورة PDF. جدير بالإغلاق، لكنه
 * ليس تصعيد صلاحيات.
 *
 * من يكتب الخطة إذن: stripe-webhook وحده عبر service_role — يضبط `profiles.plan`
 * (بوابة الميزات) ويكتب صف user_subscriptions للعرض ودورة الحياة. قيم الصف
 * تأتي من جلسة Stripe نفسها لا من كتالوج التطبيق، لأن payments.ts وplans.ts
 * يتعارضان في سعر نفس المعرّف. لا تُشتق صلاحية من هذا الجدول إطلاقاً.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const intentSchema = z.object({ intent: z.enum(["cancel", "resume"]) });

export const setSubscriptionCancelState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => intentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // نقرأ الصف بعميل المستخدم أولاً: RLS تضمن أنه صفّه هو، فلا نثق بمعرّف مُرسَل
    const { data: row, error: readErr } = await context.supabase
      .from("user_subscriptions")
      .select("id, renews_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (readErr) throw new Error("subscription_read_failed");
    if (!row) throw new Error("no_active_subscription");

    // الحقول المسموح تغييرها محصورة هنا صراحةً — لا plan_id ولا amount إطلاقاً
    const patch =
      data.intent === "cancel"
        ? {
            cancel_at_period_end: true,
            canceled_at: new Date().toISOString(),
            // يبقى نشطاً حتى نهاية الفترة المدفوعة إن وُجدت
            status: row.renews_at ? "active" : "canceled",
          }
        : {
            cancel_at_period_end: false,
            canceled_at: null,
            status: "active",
          };

    const { error } = await supabaseAdmin
      .from("user_subscriptions")
      .update(patch)
      .eq("id", row.id)
      .eq("user_id", context.userId);
    if (error) throw new Error("subscription_update_failed");

    return { ok: true as const };
  });
