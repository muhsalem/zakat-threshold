// Edge Function: إنشاء جلسة Stripe Checkout
// المتغيرات المطلوبة في Supabase Dashboard:
//   STRIPE_SECRET_KEY  — مفتاح Stripe السري
//   SITE_URL           — رابط الموقع
//   SUPABASE_URL / SUPABASE_ANON_KEY — للتحقق من JWT المستخدم

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PlanId = "certified" | "vip_annual" | "startup" | "business";

const PLANS: Record<PlanId, { priceId: string; mode: "payment" | "subscription" }> = {
  certified: { priceId: Deno.env.get("STRIPE_PRICE_CERTIFIED") ?? "", mode: "payment" },
  vip_annual: { priceId: Deno.env.get("STRIPE_PRICE_VIP_ANNUAL") ?? "", mode: "subscription" },
  startup: { priceId: Deno.env.get("STRIPE_PRICE_STARTUP") ?? "", mode: "subscription" },
  business: { priceId: Deno.env.get("STRIPE_PRICE_BUSINESS") ?? "", mode: "subscription" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1) التحقق من هوية المستخدم عبر JWT — لا نقبل userId/email من العميل
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.slice(7);
    const supaUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supaAnon =
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const supabase = createClient(supaUrl, supaAnon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user?.id || !userData.user.email) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const email = userData.user.email;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2024-06-20",
    });

    const {
      planId,
      returnPath = "/",
      discount,
    } = (await req.json()) as {
      planId: PlanId;
      returnPath?: string;
      discount?: { earlyBird?: boolean; prepayYears?: 1 | 3 };
    };

    if (!planId || !PLANS[planId]) {
      return new Response(JSON.stringify({ error: "planId غير صالح" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // منع open-redirect: نقبل مسارات نسبية فقط
    const safeReturn =
      typeof returnPath === "string" && returnPath.startsWith("/") && !returnPath.startsWith("//")
        ? returnPath
        : "/";

    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:8080";
    const plan = PLANS[planId];

    if (!plan.priceId) {
      return new Response(
        JSON.stringify({
          error: `لم يتم إعداد Stripe Price ID للخطة (${planId}).`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============ تطبيق الخصومات ============
    // القواعد (متطابقة مع src/lib/pricing/discounts.ts):
    //   • Early-Bird: 30% على أول فاتورة، للخطط السنوية فقط.
    //   • Prepay 3 سنوات: 20% إضافي على كامل المبلغ، للاشتراكات السنوية فقط.
    const yearlyPlans = new Set(["vip_annual", "startup", "business"]);
    const isYearly = yearlyPlans.has(planId);
    const wantsEarlyBird = !!discount?.earlyBird && isYearly;
    const wantsPrepay3 = discount?.prepayYears === 3 && isYearly;

    // مبنى الجلسة — نبدأ من الحالة الافتراضية ثم نُعدِّلها حسب الخصومات.
    // deno-lint-ignore no-explicit-any
    const sessionParams: any = {
      mode: plan.mode,
      payment_method_types: ["card"],
      customer_email: email,
      metadata: { userId, planId },
      success_url: `${siteUrl}${safeReturn}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}${safeReturn}?checkout=cancelled`,
      locale: "ar",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      tax_id_collection: { enabled: true },
    };

    if (wantsPrepay3) {
      // الدفع لثلاث سنوات مقدماً = تحويل الاشتراك إلى دفعة واحدة (payment mode).
      // نجلب السعر الأصلي من Stripe لنعرف unit_amount والعملة.
      const stripePrice = await stripe.prices.retrieve(plan.priceId);
      const unitAmount = stripePrice.unit_amount ?? 0;
      const currency = stripePrice.currency;
      // 3 سنوات × 80% = 2.4× السعر السنوي.
      const eb = wantsEarlyBird ? 0.3 : 0;
      // Early-Bird على السنة الأولى فقط:
      //   total = (1 - EB) * price + 2 * price ثم × (1 - 0.20)
      const totalMinorUnits = Math.round(((1 - eb) * unitAmount + 2 * unitAmount) * 0.8);
      sessionParams.mode = "payment";
      sessionParams.line_items = [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: totalMinorUnits,
            product_data: {
              name: `اشتراك 3 سنوات مسبقاً — ${planId}${wantsEarlyBird ? " (Early-Bird)" : ""}`,
              metadata: { planId, prepayYears: "3", earlyBird: String(wantsEarlyBird) },
            },
          },
        },
      ];
      sessionParams.metadata.prepayYears = "3";
      if (wantsEarlyBird) sessionParams.metadata.earlyBird = "true";
    } else {
      // الحالة الاعتيادية — نستخدم Price المعرَّف مسبقاً في Stripe.
      sessionParams.line_items = [{ price: plan.priceId, quantity: 1 }];

      if (wantsEarlyBird) {
        // ننشئ قسيمة (coupon) لمرة واحدة بنسبة 30% ونربطها بالجلسة.
        // للاشتراك: duration=once → تُطبَّق على أول فاتورة فقط.
        // للدفع الفوري: duration=once هي الوحيدة المدعومة.
        const coupon = await stripe.coupons.create({
          percent_off: 30,
          duration: "once",
          name: "Early-Bird 30% (نِصاب)",
          metadata: { source: "nisab-early-bird", planId },
        });
        sessionParams.discounts = [{ coupon: coupon.id }];
        sessionParams.metadata.earlyBird = "true";
        // لا يمكن الجمع بين discounts و allow_promotion_codes
        sessionParams.allow_promotion_codes = false;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
