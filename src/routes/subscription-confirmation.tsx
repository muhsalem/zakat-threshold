import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Download, Loader2, XCircle, ArrowLeft, CalendarClock, Package, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { verifyCheckoutSession } from "@/lib/payments";
import { downloadInvoicePdf, type InvoiceAddon } from "@/components/billing/InvoicePdf";
import { billingPeriodLabel, type BillingPeriod } from "@/lib/geo/plans";
import { toast } from "sonner";

const search = z.object({
  session_id: z.string().optional(),
  checkout: z.enum(["success", "cancelled"]).optional(),
});

export const Route = createFileRoute("/subscription-confirmation")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "تأكيد الاشتراك — نِصاب" },
      { name: "description", content: "ملخّص خطتك الجديدة والإضافات وتاريخ التجديد وفاتورة قابلة للتنزيل." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SubscriptionConfirmationPage,
});

type PaymentRow = {
  id: string;
  stripe_session_id: string | null;
  plan_id: string | null;
  amount_paid: number | null;
  currency: string | null;
  status: string | null;
  created_at: string;
};
type SubRow = {
  plan_id: string;
  plan_name: string;
  billing_period: string;
  amount: number;
  currency: string;
  renews_at: string | null;
  status: string;
  cancel_at_period_end: boolean | null;
};

function fmtMoney(n: number, cur: string) {
  try { return new Intl.NumberFormat("ar", { style: "currency", currency: cur }).format(n); }
  catch { return `${n.toFixed(2)} ${cur}`; }
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("ar", { dateStyle: "long" }).format(new Date(iso)); }
  catch { return iso; }
}
function invoiceNumberFrom(sessionId: string | null | undefined, fallbackId: string) {
  const src = sessionId ?? fallbackId;
  const tail = src.replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase();
  const y = new Date().getFullYear();
  return `NSB-${y}-${tail || "00000000"}`;
}

function SubscriptionConfirmationPage() {
  const { session_id, checkout } = Route.useSearch();
  const [phase, setPhase] = useState<"loading" | "ready" | "pending" | "cancelled" | "error">(
    checkout === "cancelled" ? "cancelled" : "loading",
  );
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [sub, setSub] = useState<SubRow | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [addons, setAddons] = useState<InvoiceAddon[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (checkout === "cancelled") return;
    if (!session_id) { setPhase("error"); return; }

    // إضافات مختارة قبل الـ checkout (تُحفظ في sessionStorage قبل التحويل لـ Stripe)
    try {
      const raw = sessionStorage.getItem(`nisab.addons.${session_id}`) || sessionStorage.getItem("nisab.addons.pending");
      if (raw) {
        const parsed = JSON.parse(raw) as InvoiceAddon[];
        if (Array.isArray(parsed)) setAddons(parsed);
      }
    } catch { /* ignore */ }

    let cancelled = false;
    let attempts = 0;
    const MAX = 8;

    async function loadOnce() {
      attempts += 1;
      const status = await verifyCheckoutSession(session_id!);
      if (cancelled) return;
      if (status === "error") { setPhase("error"); return; }
      if (status === "pending") {
        if (attempts >= MAX) { setPhase("pending"); return; }
        setTimeout(loadOnce, 1500);
        return;
      }
      // paid — نجلب البيانات
      const [{ data: pay }, { data: authData }] = await Promise.all([
        supabase.from("payments")
          .select("id, stripe_session_id, plan_id, amount_paid, currency, status, created_at")
          .eq("stripe_session_id", session_id!)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);
      if (cancelled) return;
      setPayment(pay as PaymentRow | null);
      setEmail(authData?.user?.email ?? null);

      const uid = authData?.user?.id;
      if (uid) {
        const { data: subRow } = await supabase.from("user_subscriptions")
          .select("plan_id, plan_name, billing_period, amount, currency, renews_at, status, cancel_at_period_end")
          .eq("user_id", uid)
          .maybeSingle();
        if (!cancelled) setSub(subRow as SubRow | null);
      }
      setPhase("ready");
    }
    // نبدأ بعد ثانية لإتاحة الفرصة للـ webhook
    const t = setTimeout(loadOnce, 1200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [session_id, checkout]);

  async function handleDownload() {
    if (!payment && !sub) return;
    setDownloading(true);
    try {
      const currency = (sub?.currency || payment?.currency || "USD").toUpperCase();
      const planAmount = Number(payment?.amount_paid ?? sub?.amount ?? 0);
      await downloadInvoicePdf({
        invoiceNumber: invoiceNumberFrom(payment?.stripe_session_id ?? session_id ?? null, payment?.id ?? "new"),
        issuedAt: payment?.created_at ?? new Date().toISOString(),
        planName: sub?.plan_name || payment?.plan_id || "اشتراك نِصاب",
        billingPeriod: sub?.billing_period ? billingPeriodLabel(sub.billing_period as BillingPeriod) : "دفعة",
        amount: planAmount,
        currency,
        addons,
        renewsAt: sub?.renews_at ?? null,
        customerEmail: email ?? undefined,
        sessionId: payment?.stripe_session_id ?? session_id ?? undefined,
      });
    } catch (e) {
      toast.error("تعذّر توليد الفاتورة");
      console.error(e);
    } finally { setDownloading(false); }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        {phase === "loading" && (
          <Card><CardContent className="pt-10 pb-8 text-center space-y-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">جارٍ تأكيد اشتراكك…</p>
          </CardContent></Card>
        )}

        {phase === "cancelled" && (
          <Card><CardContent className="pt-10 pb-8 text-center space-y-3">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-bold">تم إلغاء عملية الدفع</h1>
            <p className="text-sm text-muted-foreground">لم يُخصم أي مبلغ من حسابك.</p>
            <Link to="/pricing"><Button variant="outline">العودة للأسعار</Button></Link>
          </CardContent></Card>
        )}

        {phase === "pending" && (
          <Card><CardContent className="pt-10 pb-8 text-center space-y-3">
            <Loader2 className="h-12 w-12 animate-spin text-amber-500 mx-auto" />
            <h1 className="text-xl font-bold">جارٍ معالجة الدفع</h1>
            <p className="text-sm text-muted-foreground">قد يستغرق التأكيد بضع دقائق — ستصلك رسالة عند اكتماله.</p>
            <Link to="/subscription"><Button variant="outline">إدارة الاشتراك</Button></Link>
          </CardContent></Card>
        )}

        {phase === "error" && (
          <Card><CardContent className="pt-10 pb-8 text-center space-y-3">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-bold">تعذّر التحقق من الاشتراك</h1>
            <p className="text-sm text-muted-foreground">إن كنت متأكداً من إتمام الدفع، تواصل معنا: support@nisab.app</p>
            <Link to="/"><Button variant="outline">الصفحة الرئيسية</Button></Link>
          </CardContent></Card>
        )}

        {phase === "ready" && (
          <>
            <Card className="border-emerald-500/40 bg-emerald-500/5">
              <CardContent className="pt-8 pb-6 text-center space-y-3">
                <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto" />
                <h1 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  تم تأكيد اشتراكك بنجاح 🎉
                </h1>
                <p className="text-sm text-muted-foreground">
                  {email ? <>أُرسل إيصال تأكيد إلى <span className="font-medium">{email}</span></> : "أُرسل إيصال التأكيد إلى بريدك."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-5 w-5 text-primary" /> ملخّص الخطة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الخطة</span>
                  <span className="font-semibold">{sub?.plan_name || payment?.plan_id || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">نوع الفوترة</span>
                  <Badge variant="secondary">
                    {sub?.billing_period ? billingPeriodLabel(sub.billing_period as BillingPeriod) : "دفعة"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">المبلغ المدفوع</span>
                  <span className="font-semibold">
                    {fmtMoney(Number(payment?.amount_paid ?? sub?.amount ?? 0),
                              (sub?.currency || payment?.currency || "USD").toUpperCase())}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4" /> تاريخ التجديد القادم
                  </span>
                  <span className="font-semibold">
                    {sub?.cancel_at_period_end ? "لن يُجدَّد تلقائياً" : fmtDate(sub?.renews_at)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {addons.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">الإضافات المُفعَّلة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {addons.map((a, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
                      <span>{a.name}</span>
                      <span className="font-medium">{fmtMoney(a.amount, (sub?.currency || payment?.currency || "USD").toUpperCase())}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-5 w-5 text-primary" /> الفاتورة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">رقم الفاتورة</span>
                  <span className="font-mono">{invoiceNumberFrom(payment?.stripe_session_id ?? session_id ?? null, payment?.id ?? "new")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">تاريخ الإصدار</span>
                  <span>{fmtDate(payment?.created_at)}</span>
                </div>
                <Button onClick={handleDownload} disabled={downloading} className="w-full gap-2">
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  تنزيل الفاتورة PDF
                </Button>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Link to="/subscription" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" /> إدارة الاشتراك
                </Button>
              </Link>
              <Link to="/dashboard" className="flex-1">
                <Button className="w-full">لوحة التحكم</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
