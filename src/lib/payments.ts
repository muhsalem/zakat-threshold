import { supabase } from "@/integrations/supabase/client";

/**
 * معرّفات الخطط القابلة للشراء عبر Stripe — تطابق مفاتيح PLANS في
 * supabase/functions/create-checkout، وكل معرّف مربوط بـ STRIPE_PRICE_* .
 *
 * كتالوج الأسعار الوحيد هو src/lib/geo/plans.ts. كان هنا سابقاً مصفوفة
 * PLANS ثانية تعرّف startup بـ$149 شهرياً وbusiness بـ$499 شهرياً، بينما
 * كتالوج العرض يعرّف نفس المعرّفين بـ$99 و$999 سنوياً — رقمان متعارضان
 * لنفس المعرّف. حُذفت لأنها لم تكن مستوردة في أي مكان (بيانات ميتة)، فبقي
 * مصدر واحد ولم يتغيّر أي سعر معروض.
 */
export type PlanId = "certified" | "vip_annual" | "startup" | "business";

import type { DiscountOptions } from "@/lib/pricing/discounts";

/** يفتح جلسة Checkout في نفس النافذة. */
export async function startCheckout(
  planId: PlanId,
  returnPath = "/checkout-result",
  discount?: DiscountOptions,
): Promise<{ ok: boolean; error?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return { ok: false, error: "يجب تسجيل الدخول أولاً" };

  // مفتاح تكرار (idempotency key) — يُولَّد مرة واحدة لكل ضغطة دفع، ويُمرَّر
  // لـ Stripe كي لا تُنشئ جلسات/قسائم مكرَّرة لو أعاد المتصفح/الشبكة الطلب
  // تلقائياً (انقطاع اتصال، إعادة محاولة fetch) دون علم المستخدم.
  const idempotencyKey = crypto.randomUUID();

  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { planId, returnPath, discount, idempotencyKey },
  });

  if (error || !data?.url) {
    return { ok: false, error: error?.message ?? "فشل إنشاء جلسة الدفع" };
  }

  window.location.href = data.url as string;
  return { ok: true };
}

/** يتحقّق من حالة جلسة Checkout مقابل جدول `payments` الذي يُحدّثه webhook Stripe. */
export async function verifyCheckoutSession(
  sessionId: string,
): Promise<"paid" | "pending" | "error"> {
  if (!sessionId) return "error";
  const { data, error } = await supabase
    .from("payments")
    .select("status")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (error) return "error";
  if (!data) return "pending"; // webhook لم يصل بعد
  const s = String(data.status ?? "").toLowerCase();
  if (s === "paid" || s === "active" || s === "succeeded") return "paid";
  if (s === "failed" || s === "canceled" || s === "cancelled") return "error";
  return "pending";
}

/** خطة المستخدم الحالية من جدول `profiles`. */
export async function getUserPlan(): Promise<string> {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) return "free";
  const { data } = await supabase.from("profiles").select("plan").eq("user_id", uid).maybeSingle();
  return ((data as { plan?: string } | null)?.plan ?? "free") || "free";
}
