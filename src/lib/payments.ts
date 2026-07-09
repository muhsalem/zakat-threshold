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

/** يفتح جلسة Checkout في نفس النافذة. */
export async function startCheckout(planId: PlanId, returnPath = "/checkout-result"): Promise<{ ok: boolean; error?: string }> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return { ok: false, error: "يجب تسجيل الدخول أولاً" };

  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { planId, userId: user.id, email: user.email ?? "", returnPath },
  });

  if (error || !data?.url) {
    return { ok: false, error: error?.message ?? "فشل إنشاء جلسة الدفع" };
  }

  window.location.href = data.url as string;
  return { ok: true };
}

/** تحقق من حالة الدفع بعد العودة (stub — لا يوجد جدول payments بعد) */
export async function verifyCheckoutSession(_sessionId: string): Promise<"paid" | "pending" | "error"> {
  return "pending";
}

/** خطة المستخدم الحالية (stub — يُضاف لاحقاً بعد إنشاء أعمدة plan) */
export async function getUserPlan(): Promise<string> {
  return "free";
}
