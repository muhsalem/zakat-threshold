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
  { id: "certified",  name: "معتمد",      priceUSD: 19,  period: "/ تقرير", audience: "individual" },
  { id: "vip_annual", name: "سنوي VIP",   priceUSD: 79,  period: "/ سنة",   audience: "individual" },
  { id: "startup",    name: "Startup",    priceUSD: 149, period: "/ شهر",   audience: "company"    },
  { id: "business",   name: "Business",   priceUSD: 499, period: "/ شهر",   audience: "company"    },
];

/**
 * يفتح جلسة Stripe Checkout في نفس النافذة.
 * يعيد { ok: true } إذا تمّ التوجيه، أو { ok: false, error } إذا فشل.
 */
export async function startCheckout(planId: PlanId, returnPath = "/"): Promise<{ ok: boolean; error?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return { ok: false, error: "يجب تسجيل الدخول أولاً" };

  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: {
      planId,
      userId: user.id,
      email: user.email ?? "",
      returnPath,
    },
  });

  if (error || !data?.url) {
    return { ok: false, error: error?.message ?? "فشل إنشاء جلسة الدفع" };
  }

  window.location.href = data.url;
  return { ok: true };
}

/** تحقق من حالة الدفع بعد العودة من Stripe */
export async function verifyCheckoutSession(sessionId: string): Promise<"paid" | "pending" | "error"> {
  const { data, error } = await supabase
    .from("payments")
    .select("status")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (error || !data) return "error";
  return data.status === "paid" ? "paid" : "pending";
}

/** خطة المستخدم الحالية */
export async function getUserPlan(): Promise<string> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return "free";

  const { data } = await supabase
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!data) return "free";
  if (data.plan_expires_at && new Date(data.plan_expires_at) < new Date()) return "free";
  return data.plan ?? "free";
}
