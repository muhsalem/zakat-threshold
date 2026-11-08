import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Page } from "@/components/site/Page";
import { Button } from "@/components/ui/button";
import { getHistoricalCalculations } from "@/lib/annual-nisab.functions";
import { annualSearchSchema } from "@/lib/annual-nisab";
import { useI18n } from "@/lib/i18n";
import { CalendarDays, RefreshCw } from "lucide-react";

const options = queryOptions({
  queryKey: ["personal-historical-calculations"],
  queryFn: () => getHistoricalCalculations(),
  staleTime: 0,
});
export const Route = createFileRoute("/_authenticated/personal-calculations")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(options);
  },
  head: () => ({
    meta: [
      { title: "حساباتي التاريخية للزكاة · نِصاب" },
      {
        name: "description",
        content: "حساباتك الشخصية المحفوظة مع تاريخ التقييم والنصاب ومصدر السعر المستخدم.",
      },
      { property: "og:title", content: "حساباتي التاريخية · نِصاب" },
      { property: "og:description", content: "سجل خاص لحسابات الزكاة التاريخية ومصادرها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: PersonalError,
  notFoundComponent: () => (
    <Page title="الحساب غير متاح">
      <Link to="/calculator">حاسبة الزكاة</Link>
    </Page>
  ),
  component: PersonalCalculations,
});
function PersonalError() {
  const router = useRouter();
  return (
    <Page title="تعذّر تحميل حساباتك">
      <Button onClick={() => void router.invalidate()}>
        <RefreshCw />
        إعادة المحاولة
      </Button>
    </Page>
  );
}
function PersonalCalculations() {
  const { data, refetch } = useSuspenseQuery(options);
  const { lang } = useI18n();
  const money = (v: number, currency: string) =>
    new Intl.NumberFormat(lang, { style: "currency", currency }).format(v);
  return (
    <Page
      title="حساباتي التاريخية للزكاة"
      sub="حسابات خاصة محفوظة مع سعر التقييم ومصدره وقت الحفظ."
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/annual-nisab" search={annualSearchSchema.parse({})}>
            <CalendarDays />
            سجل النصاب السنوي
          </Link>
        </Button>
        <Button variant="outline" onClick={() => void refetch()}>
          <RefreshCw />
          تحديث
        </Button>
      </div>
      {data.length === 0 && (
        <p role="status" className="border-y border-border py-10 text-muted-foreground">
          لا توجد حسابات تاريخية محفوظة بعد.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.map((row) => (
          <article key={row.id} className="rounded-md border border-border p-5">
            <header className="flex justify-between gap-2">
              <h2 className="num text-lg">{row.valuation_day}</h2>
              <span className="text-sm text-muted-foreground">
                {row.country} · {row.currency}
              </span>
            </header>
            <dl className="my-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt>صافي الأصول</dt>
                <dd className="num">{money(row.net_wealth, row.currency)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>
                  النصاب · {row.metal === "gold" ? "الذهب" : "الفضة"} · {row.weight_grams} جم
                </dt>
                <dd className="num">{money(row.nisab_threshold, row.currency)}</dd>
              </div>
              <div className="flex justify-between gap-2 text-primary">
                <dt>الزكاة · {(row.zakat_rate * 100).toFixed(3)}%</dt>
                <dd className="num font-semibold">{money(row.zakat_due, row.currency)}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground break-words">
              مصدر السعر وقت الحفظ: {row.price_source || "غير مسجل"}
            </p>
            <Button asChild variant="ghost" className="mt-3">
              <Link
                to="/annual-nisab"
                search={annualSearchSchema.parse({
                  country: row.country,
                  year: Number(row.valuation_day.slice(0, 4)),
                  day: row.valuation_day,
                  metal: row.metal,
                })}
              >
                <CalendarDays />
                عرض يوم التقييم
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </Page>
  );
}
