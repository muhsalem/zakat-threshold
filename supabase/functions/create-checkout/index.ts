// Edge Function: إنشاء جلسة Stripe Checkout
// المتغيرات المطلوبة في Supabase Dashboard:
//   STRIPE_SECRET_KEY  — مفتاح Stripe السري (sk_live_... أو sk_test_...)
//   SITE_URL           — رابط الموقع (https://nisab.app)

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PlanId = "certified" | "vip_annual" | "startup" | "business";

const PLANS: Record<PlanId, { priceId: string; mode: "payment" | "subscription" }> = {
  // استبدل بـ Price IDs الحقيقية من لوحة Stripe
  certified:   { priceId: "price_certified_placeholder",   mode: "payment"      },
  vip_annual:  { priceId: "price_vip_annual_placeholder",  mode: "subscription" },
  startup:     { priceId: "price_startup_placeholder",     mode: "subscription" },
  business:    { priceId: "price_business_placeholder",    mode: "subscription" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2024-06-20",
    });

    const { planId, userId, email, returnPath = "/" } = await req.json() as {
      planId: PlanId;
      userId: string;
      email: string;
      returnPath?: string;
    };

    if (!planId || !PLANS[planId]) {
      return new Response(JSON.stringify({ error: "planId غير صالح" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:8080";
    const plan = PLANS[planId];

    const session = await stripe.checkout.sessions.create({
      mode: plan.mode,
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      metadata: { userId, planId },
      success_url: `${siteUrl}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}${returnPath}?checkout=cancelled`,
      locale: "ar",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      tax_id_collection: { enabled: true },
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
