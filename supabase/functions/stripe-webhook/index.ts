// Edge Function: استقبال أحداث Stripe Webhook
// المتغيرات المطلوبة:
//   STRIPE_SECRET_KEY        — مفتاح Stripe السري
//   STRIPE_WEBHOOK_SECRET    — سر التحقق من الـ Webhook (whsec_...)
//   SUPABASE_URL             — رابط مشروع Supabase
//   SUPABASE_SERVICE_ROLE_KEY — مفتاح الخدمة

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deriveSubscriptionRow } from "../_shared/subscriptionRow.ts";

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

  // كانت كل أخطاء الكتابة تُبتلع بـconsole.error ثم تُعاد 200 دون قيد.
  // Stripe يفهم 200 على أنه "عولج بنجاح" فلا يعيد المحاولة أبداً — فيدفع
  // العميل ولا يُكتب اشتراكه ولا استحقاقه، بلا مسار تعافٍ ولا إشعار.
  // الآن نتتبّع الفشل ونُعيد 5xx ليعيد Stripe المحاولة (تصاعدياً حتى 3 أيام).
  // الإعادة آمنة: الكتابات upsert على مفتاح تعارض، أي عديمة أثر تراكمي.
  const writeFailures: string[] = [];
  const noteFailure = (where: string, err: unknown) => {
    console.error(`${where}:`, err);
    writeFailures.push(where);
  };

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
    if (error) noteFailure("upsertPayment", error);
  }

  /**
   * تحديث صف الاشتراك المعروض (user_subscriptions).
   *
   * لماذا من Stripe لا من كتالوج التطبيق: يوجد كتالوجان متعارضان — payments.ts
   * يعرّف startup بـ$149 شهرياً وplans.ts يعرّفه بـ$99 سنوياً لنفس المعرّف.
   * الكتابة من أيّهما تُنتج صفّاً محاسبياً كاذباً تُبنى منه فاتورة PDF في صفحة
   * التأكيد. لذا نكتب ما شحنته Stripe فعلاً: المبلغ والعملة والدورية من الجلسة
   * نفسها. واسم الخطة يُشتق للعرض من plan_id في الواجهة (subscription.tsx)،
   * فنخزّن هنا اسم منتج Stripe كسجل لما رآه العميل وقت الدفع.
   *
   * ملاحظة: هذا الجدول للعرض ودورة حياة الاشتراك فقط. بوابة الميزات تبقى
   * profiles.plan — لا تُشتق صلاحية من هنا.
   */
  async function upsertSubscriptionRow(opts: {
    userId: string;
    planId: string;
    planName: string;
    amount: number;
    currency: string;
    billingPeriod: "monthly" | "yearly" | "lifetime" | "one_time";
    renewsAt: string | null;
    status: "active" | "canceled";
  }) {
    const { error } = await supabase.from("user_subscriptions").upsert(
      {
        user_id: opts.userId,
        plan_id: opts.planId,
        plan_name: opts.planName,
        status: opts.status,
        billing_period: opts.billingPeriod,
        amount: opts.amount,
        currency: opts.currency.toUpperCase(),
        started_at: new Date().toISOString(),
        renews_at: opts.renewsAt,
        canceled_at: null,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) noteFailure("upsertSubscriptionRow", error);
  }

  /** اسم المنتج كما عرضته Stripe للعميل؛ يتراجع لمعرّف الخطة إن تعذّر. */
  async function stripeProductName(sessionId: string, fallback: string): Promise<string> {
    try {
      const items = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1 });
      return items.data[0]?.description || fallback;
    } catch (err) {
      console.error("listLineItems failed:", err);
      return fallback;
    }
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
      // ترقية الخطة في ملف المستخدم — هذه هي بوابة الميزات الفعلية
      if (userId && planId) {
        // كانت نتيجة هذه الكتابة مُهمَلة كلياً — وهي منح الخطة بعد الدفع،
        // أخطر كتابة في المسار: فشلها صامتاً يعني عميلاً دفع بلا خطة.
        {
          const { error } = await supabase
            .from("profiles")
            .update({
              plan: planId,
              plan_expires_at:
                planId === "vip_annual" ? new Date(Date.now() + 365 * 864e5).toISOString() : null,
            })
            .eq("user_id", userId);
          if (error) noteFailure("profile plan grant", error);
        }

        // صف العرض/دورة الحياة — الاشتقاق في وحدة نقية مختبَرة (_shared)
        let recurringInterval: string | null = null;
        let currentPeriodEndSec: number | null = null;
        if (session.mode === "subscription" && session.subscription) {
          const s = await stripe.subscriptions.retrieve(session.subscription as string);
          recurringInterval = s.items.data[0]?.price?.recurring?.interval ?? null;
          currentPeriodEndSec = s.current_period_end ?? null;
        }

        const derived = deriveSubscriptionRow({
          mode: session.mode,
          amountTotalMinor: session.amount_total,
          currency: session.currency,
          prepayYears: session.metadata?.prepayYears,
          recurringInterval,
          currentPeriodEndSec,
        });

        await upsertSubscriptionRow({
          userId,
          planId,
          planName: await stripeProductName(session.id, planId),
          status: "active",
          ...derived,
        });
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

        // تجديد: ندفع تاريخ التجديد للأمام فقط — لا نمسّ started_at ولا plan_id
        if (userId) {
          const { error } = await supabase
            .from("user_subscriptions")
            .update({
              status: "active",
              renews_at: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
              cancel_at_period_end: false,
              canceled_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
          if (error) noteFailure("renewal update", error);
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId) {
        // كذلك نتيجة الإنزال للخطة المجانية كانت مُهمَلة: فشلها يُبقي
        // مستخدماً ملغى اشتراكه على امتيازات مدفوعة.
        {
          const { error } = await supabase
            .from("profiles")
            .update({ plan: "free", plan_expires_at: null })
            .eq("user_id", userId);
          if (error) noteFailure("profile downgrade", error);
        }

        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
            renews_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        if (error) noteFailure("cancellation update", error);
      }
      break;
    }
    default:
      console.log("Unhandled event:", event.type);
  }

  if (writeFailures.length > 0) {
    // 500 مقصود: يدفع Stripe لإعادة الإرسال بدل ضياع الدفعة صامتاً.
    // لا نُسرّب تفاصيل الخطأ في الجسم — تكفي أسماء المواضع للتشخيص من السجل.
    return new Response(
      JSON.stringify({ received: false, failed: writeFailures }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
