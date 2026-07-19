import { supabase } from "@/integrations/supabase/client";

export type PlanId = "certified" | "vip_annual" | "startup" | "business";

export type PlanMeta = {
  id: PlanId;
  name: string;
  priceUSD: number;
  period: string;
  audience: "individual" | "company";
};

export const PLANS: PlanMeta[] = [
  { id: "certified", name: "معتمد", priceUSD: 19, period: "/ تقرير", audience: "individual" },
  { id: "vip_annual", name: "سنوي VIP", priceUSD: 79, period: "/ سنة", audience: "individual" },
  { id: "startup", name: "Startup", priceUSD: 149, period: "/ شهر", audience: "company" },
  { id: "business", name: "Business", priceUSD: 499, period: "/ شهر", audience: "company" },
];

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

  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { planId, returnPath, discount },
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
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("user_id", uid)
    .maybeSingle();
  return ((data as { plan?: string } | null)?.plan ?? "free") || "free";
}

