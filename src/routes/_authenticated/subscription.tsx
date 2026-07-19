import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, ArrowUpCircle, ArrowDownCircle, Receipt, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PLANS, billingPeriodLabel, type Plan, type PlanId } from "@/lib/geo/plans";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({
    meta: [
      { title: "اشتراكي — نِصاب" },
      { name: "description", content: "إدارة اشتراكك: عرض الخطة الحالية، الترقية، التخفيض، أو الإلغاء." },
    ],
  }),
  component: SubscriptionPage,
});

type Subscription = {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  status: "active" | "canceled" | "trialing" | "past_due";
  billing_period: "monthly" | "yearly" | "lifetime" | "one_time";
  amount: number | null;
  currency: string;
  started_at: string;
  renews_at: string | null;
  canceled_at: string | null;
  cancel_at_period_end: boolean;
};

type Payment = {
  id: string;
  plan_id: string | null;
  amount_paid: number | null;
  currency: string | null;
  status: string;
  created_at: string;
};

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "نشط", variant: "default" },
  canceled: { label: "ملغى", variant: "destructive" },
  trialing: { label: "تجريبي", variant: "secondary" },
  past_due: { label: "متأخر السداد", variant: "destructive" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  } catch { return iso; }
}

function planTier(id: string): number {
  const order: PlanId[] = [
    "free",
    "personal-one-time",
    "personal-annual",
    "family-annual",
    "personal-lifetime",
    "startup",
    "growth",
    "business",
    "enterprise",
    "accountant-solo",
    "accountant-firm",
    "accountant-unlimited",
  ];
  const i = order.indexOf(id as PlanId);
  return i === -1 ? 0 : i;
}

function SubscriptionPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: subRow }, { data: pays }] = await Promise.all([
        supabase.from("user_subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("payments").select("id, plan_id, amount_paid, currency, status, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setSub(subRow as Subscription | null);
      setPayments((pays ?? []) as Payment[]);
      setLoading(false);
    })();
  }, [user]);

  const currentPlan = useMemo<Plan | undefined>(
    () => PLANS.find((p) => p.id === (sub?.plan_id ?? "free")),
    [sub?.plan_id],
  );

  const audience = currentPlan?.audience ?? "individual";
  const availablePlans = PLANS.filter((p) => p.audience === audience);

  async function switchPlan(target: Plan) {
    if (!user || !sub) return;
    setSwitching(target.id);
    const nowIso = new Date().toISOString();
    const renews =
      target.billing === "lifetime" || target.billing === "one_time"
        ? null
        : new Date(Date.now() + (target.billing === "monthly" ? 30 : 365) * 86400_000).toISOString();

    const { error } = await supabase
      .from("user_subscriptions")
      .update({
        plan_id: target.id,
        plan_name: target.name,
        status: "active",
        billing_period: target.billing === "custom" ? "yearly" : target.billing,
        amount: target.usdPrice ?? 0,
        currency: "USD",
        started_at: nowIso,
        renews_at: renews,
        canceled_at: null,
        cancel_at_period_end: false,
      })
      .eq("user_id", user.id);

    setSwitching(null);
    if (error) {
      toast.error("تعذّر تحديث الخطة");
      return;
    }
    toast.success(`تم التحويل إلى خطة ${target.name}`);
    const { data } = await supabase.from("user_subscriptions").select("*").eq("user_id", user.id).maybeSingle();
    setSub(data as Subscription | null);
  }

  async function cancelSubscription() {
    if (!user || !sub) return;
    setCanceling(true);
    const { error } = await supabase
      .from("user_subscriptions")
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        status: sub.renews_at ? "active" : "canceled",
      })
      .eq("user_id", user.id);
    setCanceling(false);
    if (error) {
      toast.error("تعذّر إلغاء الاشتراك");
      return;
    }
    toast.success("تم جدولة الإلغاء — سيبقى وصولك حتى نهاية الفترة الحالية");
    const { data } = await supabase.from("user_subscriptions").select("*").eq("user_id", user.id).maybeSingle();
    setSub(data as Subscription | null);
  }

  async function resumeSubscription() {
    if (!user || !sub) return;
    const { error } = await supabase
      .from("user_subscriptions")
      .update({ cancel_at_period_end: false, canceled_at: null, status: "active" })
      .eq("user_id", user.id);
    if (error) return toast.error("تعذّر استئناف الاشتراك");
    toast.success("تم استئناف الاشتراك");
    const { data } = await supabase.from("user_subscriptions").select("*").eq("user_id", user.id).maybeSingle();
    setSub(data as Subscription | null);
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const statusBadge = STATUS_MAP[sub?.status ?? "active"];
  const currentTier = planTier(sub?.plan_id ?? "free");

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-6xl" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-primary" />
          اشتراكي
        </h1>
        <p className="text-muted-foreground mt-1">إدارة خطتك الحالية، الترقية أو التخفيض، والاطلاع على سجل المدفوعات.</p>
      </div>

      {/* Current plan card */}
      <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                {currentPlan?.name ?? sub?.plan_name}
                <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              </CardTitle>
              <CardDescription className="mt-1">{currentPlan?.tagline ?? "خطتك الحالية"}</CardDescription>
            </div>
            <div className="text-left">
              <div className="text-3xl font-bold">
                {(sub?.amount ?? 0) === 0 ? "مجاناً" : `$${Number(sub?.amount).toFixed(0)}`}
              </div>
              <div className="text-xs text-muted-foreground">
                {billingPeriodLabel(currentPlan?.billing ?? "yearly")}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <div className="text-muted-foreground">تاريخ البدء</div>
              <div className="font-medium">{fmtDate(sub?.started_at ?? null)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">التجديد التالي</div>
              <div className="font-medium">{fmtDate(sub?.renews_at ?? null)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">حالة الإلغاء</div>
              <div className="font-medium">
                {sub?.cancel_at_period_end
                  ? "مجدول للإلغاء نهاية الفترة"
                  : "التجديد التلقائي مفعّل"}
              </div>
            </div>
          </div>

          {sub?.cancel_at_period_end && (
            <Alert>
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>سيتم إلغاء اشتراكك في {fmtDate(sub.renews_at)}. يمكنك استئنافه قبل ذلك.</span>
                <Button size="sm" onClick={resumeSubscription}>استئناف الاشتراك</Button>
              </AlertDescription>
            </Alert>
          )}

          {!sub?.cancel_at_period_end && sub?.plan_id !== "free" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <XCircle className="w-4 h-4" />
                  إلغاء الاشتراك
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>تأكيد إلغاء الاشتراك</DialogTitle>
                  <DialogDescription>
                    سيبقى وصولك إلى مزايا خطة <strong>{currentPlan?.name}</strong> حتى
                    {" "}<strong>{fmtDate(sub?.renews_at ?? null)}</strong>، وبعدها ستعود تلقائياً للخطة المجانية.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button variant="ghost">تراجع</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="destructive" onClick={cancelSubscription} disabled={canceling}>
                      {canceling && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                      نعم، ألغِ الاشتراك
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Available plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">الترقية أو التخفيض</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availablePlans.map((p) => {
            const isCurrent = p.id === sub?.plan_id;
            const t = planTier(p.id);
            const direction = t > currentTier ? "upgrade" : t < currentTier ? "downgrade" : "current";
            const Icon = p.icon;
            return (
              <Card
                key={p.id}
                className={isCurrent ? "border-primary ring-1 ring-primary/40" : ""}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{p.name}</CardTitle>
                    </div>
                    {p.ribbon && <Badge variant="secondary" className="text-xs">{p.ribbon}</Badge>}
                  </div>
                  <CardDescription>{p.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold">
                      {p.usdPrice === null ? "حسب الطلب" : p.usdPrice === 0 ? "مجاناً" : `$${p.usdPrice}`}
                    </div>
                    <div className="text-xs text-muted-foreground">{billingPeriodLabel(p.billing)}</div>
                  </div>
                  <ul className="text-sm space-y-1.5">
                    {p.features.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button variant="secondary" className="w-full" disabled>خطتك الحالية</Button>
                  ) : p.billing === "custom" ? (
                    <Button asChild variant="outline" className="w-full">
                      <a href="mailto:sales@nisab.app">تواصل مع المبيعات</a>
                    </Button>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      variant={direction === "upgrade" ? "default" : "outline"}
                      disabled={switching === p.id}
                      onClick={() => switchPlan(p)}
                    >
                      {switching === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : direction === "upgrade" ? (
                        <ArrowUpCircle className="w-4 h-4" />
                      ) : (
                        <ArrowDownCircle className="w-4 h-4" />
                      )}
                      {direction === "upgrade" ? "ترقية" : "تخفيض"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          تصفّح جميع الخطط والإضافات في <Link to="/pricing" className="underline">صفحة الاشتراكات والخطط</Link>.
        </p>
      </div>

      {/* Payments history */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          سجل الفواتير والمدفوعات
        </h2>
        <Card>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                لا توجد مدفوعات مسجّلة بعد.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-right p-3 font-medium">التاريخ</th>
                      <th className="text-right p-3 font-medium">الخطة</th>
                      <th className="text-right p-3 font-medium">المبلغ</th>
                      <th className="text-right p-3 font-medium">الحالة</th>
                      <th className="text-right p-3 font-medium">الإيصال</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="p-3">{fmtDate(p.created_at)}</td>
                        <td className="p-3">{p.plan_id ?? "—"}</td>
                        <td className="p-3 font-medium">
                          {p.amount_paid ? `${Number(p.amount_paid).toFixed(2)} ${p.currency ?? "USD"}` : "—"}
                        </td>
                        <td className="p-3">
                          <Badge variant={p.status === "succeeded" || p.status === "paid" ? "default" : "secondary"}>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Button size="sm" variant="ghost" onClick={() => toast.info("سيتوفر تنزيل الإيصال قريباً")}>
                            تنزيل
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
