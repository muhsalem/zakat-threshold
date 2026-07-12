// Edge Function: استقبال أحداث Stripe Webhook
// المتغيرات المطلوبة:
//   STRIPE_SECRET_KEY        — مفتاح Stripe السري
//   STRIPE_WEBHOOK_SECRET    — سر التحقق من الـ Webhook (whsec_...)
//   SUPABASE_URL             — رابط مشروع Supabase
//   SUPABASE_SERVICE_ROLE_KEY — مفتاح الخدمة

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2024-06-20",
  });

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // تسجيل الحدث في جدول payments للمراجعة والتدقيق
  async function upsertPayment(opts: {
    stripeSessionId?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    userId?: string;
    planId?: string;
    status: string;
    amountPaid?: number;
    currency?: string;
  }) {
    const { error } = await supabase.from("payments").upsert(
      {
        stripe_session_id: opts.stripeSessionId,
        stripe_customer_id: opts.stripeCustomerId,
        stripe_subscription_id: opts.stripeSubscriptionId,
        user_id: opts.userId,
        plan_id: opts.planId,
        status: opts.status,
        amount_paid: opts.amountPaid,
        currency: opts.currency,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_session_id" },
    );
    if (error) console.error("upsertPayment error:", error);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;
      await upsertPayment({
        stripeSessionId: session.id,
        stripeCustomerId: session.customer as string,
        userId,
        planId,
        status: "paid",
        amountPaid: (session.amount_total ?? 0) / 100,
        currency: session.currency ?? "usd",
      });
      // ترقية الخطة في ملف المستخدم
      if (userId && planId) {
        await supabase
          .from("profiles")
          .update({
            plan: planId,
            plan_expires_at:
              planId === "vip_annual" ? new Date(Date.now() + 365 * 864e5).toISOString() : null,
          })
          .eq("user_id", userId);
      }
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = invoice.subscription as string;
      if (sub) {
        const subscription = await stripe.subscriptions.retrieve(sub);
        const userId = subscription.metadata?.userId;
        await upsertPayment({
          stripeSubscriptionId: sub,
          stripeCustomerId: subscription.customer as string,
          userId,
          planId: subscription.metadata?.planId,
          status: "active",
          amountPaid: (invoice.amount_paid ?? 0) / 100,
          currency: invoice.currency ?? "usd",
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId) {
        await supabase
          .from("profiles")
          .update({ plan: "free", plan_expires_at: null })
          .eq("user_id", userId);
      }
      break;
    }
    default:
      console.log("Unhandled event:", event.type);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
