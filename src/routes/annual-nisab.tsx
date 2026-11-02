import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarDays, Calculator, Save, RefreshCw } from "lucide-react";
import { Page } from "@/components/site/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTRIES, countryName } from "@/lib/countries";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useSilverStandard } from "@/lib/use-silver-standard";
import { HISTORY_CACHE_MS } from "@/lib/daily-nisab";
import { annualSearchSchema, daysOfYear, historicalDue, historicalValuation, yearOf, type AnnualSearch } from "@/lib/annual-nisab";
import { getAnnualNisab, saveHistoricalCalculation } from "@/lib/annual-nisab.functions";
import { formatHijri } from "@/lib/hijri";

const annualOptions = (search: AnnualSearch) => queryOptions({
  queryKey: ["annual-nisab", search.country, search.calendar, search.year],
  queryFn: () => getAnnualNisab({ data: { country: search.country, calendar: search.calendar, year: search.year } }),
  staleTime: HISTORY_CACHE_MS,
});

export const Route = createFileRoute("/annual-nisab")({
  validateSearch: (search) => annualSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({ country: search.country, calendar: search.calendar, year: search.year }),
  loader: async ({ context, deps }) => { await context.queryClient.ensureQueryData(annualOptions(annualSearchSchema.parse(deps))); },
  head: () => ({ meta: [
    { title: "نصاب الزكاة السنوي واليومي · نِصاب" },
    { name: "description", content: "سجل نصاب الذهب والفضة لكل سنة ويوم مع مصادر الأسعار المحفوظة وحسابات الزكاة الشخصية." },
    { property: "og:title", content: "سجل النصاب السنوي واليومي · نِصاب" },
    { property: "og:description", content: "الأسعار التاريخية الموثقة بحسب البلد والتاريخ وربطها بحسابك الشخصي." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  errorComponent: AnnualError,
  notFoundComponent: () => <Page title="السجل غير متاح"><Link to="/annual-nisab" search={annualSearchSchema.parse({})}>سجل النصاب</Link></Page>,
  component: AnnualNisab,
});

function AnnualError() {
  const router = useRouter();
  return <Page title="تعذّر تحميل سجل النصاب"><Button onClick={() => void router.invalidate()}><RefreshCw />إعادة المحاولة</Button></Page>;
}

function AnnualNisab() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, refetch, isFetching } = useSuspenseQuery(annualOptions(search));
  const { lang } = useI18n();
  const { user } = useAuth();
  const { weight } = useSilverStandard();
  const queryClient = useQueryClient();
  const [wealth, setWealth] = useState("");
  const [basis, setBasis] = useState<"hijri" | "gregorian">("hijri");
  const save = useServerFn(saveHistoricalCalculation);
  const mutation = useMutation({ mutationFn: save, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["personal-historical-calculations"] }); } });
  const change = (patch: Partial<AnnualSearch>) => {
    mutation.reset();
    void navigate({ search: (previous) => ({ ...previous, ...patch }) });
  };
  const rows = new Map(data.rows.map((row) => [row.day, row]));
  const days = daysOfYear(data.year, search.calendar);
  const selected = search.day ? rows.get(search.day) : data.rows.at(-1);
  const valuation = historicalValuation(selected, search.metal, weight);
  const validWealth = wealth.trim() !== "" && Number.isFinite(Number(wealth)) && Number(wealth) >= 0 && Number(wealth) <= 1e15;
  const result = valuation && validWealth ? historicalDue(Number(wealth), valuation.threshold, basis) : null;
  const money = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat(lang, { style: "currency", currency: data.currency, maximumFractionDigits: 2 }).format(value);
  const inputClass = "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";
  const recorded = data.rows.filter((row) => historicalValuation(row, search.metal, weight));

  return <Page eyebrow="DAILY ARCHIVE" title="نصاب الزكاة السنوي واليومي" sub="سجل الأسعار المحفوظة، بحسب البلد والسنة وتاريخ استحقاق الزكاة.">
    <div className="mb-6 flex flex-wrap gap-3 items-end">
      <label className="grid gap-1 text-sm"><span>البلد</span><select aria-label="البلد" value={search.country} className={inputClass} onChange={(e) => change({ country: e.target.value, day: undefined })}>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{countryName(c, lang)}</option>)}</select></label>
      <label className="grid gap-1 text-sm"><span>التقويم</span><select aria-label="التقويم" value={search.calendar} className={inputClass} onChange={(e) => { const calendar = e.target.value === "hijri" ? "hijri" : "gregorian"; change({ calendar, year: yearOf(selected?.day ?? data.today, calendar), day: undefined }); }}><option value="gregorian">ميلادي</option><option value="hijri">هجري</option></select></label>
      <label className="grid gap-1 text-sm"><span>السنة</span><Input aria-label="السنة" type="number" className="w-28" min={search.calendar === "hijri" ? 1300 : 1900} max={yearOf(data.today, search.calendar)} value={data.year} onChange={(e) => { const year = Number(e.target.value); if (year >= (search.calendar === "hijri" ? 1300 : 1900) && year <= yearOf(data.today, search.calendar)) change({ year, day: undefined }); }} /></label>
      <label className="grid gap-1 text-sm"><span>المعيار</span><select aria-label="المعيار" className={inputClass} value={search.metal} onChange={(e) => change({ metal: e.target.value === "gold" ? "gold" : "silver" })}><option value="silver">الفضة · {weight} جم</option><option value="gold">الذهب</option></select></label>
      <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}><RefreshCw className={isFetching ? "animate-spin" : ""} />تحديث السجل</Button>
      <Button asChild variant="outline"><Link to="/personal-calculations"><Save />حساباتي المحفوظة</Link></Button>
    </div>
    <section className="grid gap-4 border-y border-border py-5 sm:grid-cols-3">
      <div><p className="text-sm text-muted-foreground">السنة · {data.currency}</p><p className="num mt-1 text-2xl">{data.year}</p></div>
      <div><p className="text-sm text-muted-foreground">أيام موثقة للمعيار المحدد</p><p className="num mt-1 text-2xl">{recorded.length} / {days.length}</p></div>
      <div><p className="text-sm text-muted-foreground">أول يوم محفوظ لهذا البلد</p><p className="num mt-1 text-lg">{data.firstDay ?? "لا توجد بيانات محفوظة"}</p></div>
    </section>
    <p className="my-4 text-sm text-muted-foreground">نصاب محسوب من سعر الجرام المحفوظ، وليس إعلانًا رسميًا. الأيام المفقودة لا تُستبدل بأسعار اليوم. التواريخ اليومية بتوقيت UTC.</p>
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section className="min-w-0">
        <h2 className="mb-3 flex items-center gap-2 text-xl"><CalendarDays className="size-5 text-primary" />أيام السنة</h2>
        {data.rows.length === 0 && <p role="status" className="mb-3 text-muted-foreground">لا توجد أسعار محفوظة لهذه السنة والبلد.</p>}
        <div className="max-h-[560px] overflow-auto border-y border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="sticky top-0 bg-secondary text-muted-foreground"><tr><th className="p-3 text-start">اليوم</th><th className="p-3 text-start">النصاب</th><th className="p-3 text-start">مصدر السعر</th><th className="p-3"><span className="sr-only">اختيار</span></th></tr></thead>
            <tbody>{days.map((day) => { const row = rows.get(day); const value = historicalValuation(row, search.metal, weight); return <tr key={day} className={`border-t border-border ${selected?.day === day ? "bg-secondary" : ""}`}>
              <td className="p-3"><time className="num whitespace-nowrap" dateTime={day}>{day}</time><span className="block text-xs text-muted-foreground">{formatHijri(Date.parse(`${day}T00:00:00Z`), lang)}</span></td>
              <td className="p-3 num whitespace-nowrap">{money(value?.threshold)}</td><td className="p-3 text-xs text-muted-foreground">{row?.source || (day > data.today ? "لم يأتِ بعد" : "غير متاح")}</td>
              <td className="p-2">{value && <Button size="icon" variant="ghost" aria-label={`احسب زكاة ${day}`} title={`احسب زكاة ${day}`} onClick={() => change({ day })}><Calculator className="size-4" /></Button>}</td>
            </tr>; })}</tbody>
          </table>
        </div>
      </section>
      <section className="min-w-0 border-s border-border ps-5">
        <h2 className="text-xl">حساب زكاة فردي</h2>
        <label className="mt-4 grid gap-1 text-sm"><span>تاريخ التقييم</span><Input aria-label="تاريخ التقييم" type="date" value={search.day ?? selected?.day ?? ""} max={data.today} onChange={(e) => { const day = e.target.value; if (day) change({ day, year: yearOf(day, search.calendar) }); }} /></label>
        {selected && valuation ? <>
          <dl className="my-5 space-y-2 text-sm"><div className="flex justify-between gap-2"><dt>سعر الجرام</dt><dd className="num">{money(valuation.gram)}</dd></div><div className="flex justify-between gap-2"><dt>وزن النصاب</dt><dd className="num">{valuation.weight} جم</dd></div><div className="flex justify-between gap-2"><dt>النصاب التاريخي</dt><dd className="num font-semibold">{money(valuation.threshold)}</dd></div></dl>
          <p className="text-xs text-muted-foreground break-words">مصدر السعر: {selected.source || "غير مسجل"}</p>
          <label className="mt-4 grid gap-1 text-sm"><span>صافي الأصول بعد الالتزامات · {data.currency}</span><Input aria-label="صافي الأصول" type="number" min="0" max="1000000000000000" value={wealth} onChange={(e) => { setWealth(e.target.value); mutation.reset(); }} /></label>
          <label className="mt-4 grid gap-1 text-sm"><span>أساس الحول</span><select aria-label="أساس الحول" className={inputClass} value={basis} onChange={(e) => { setBasis(e.target.value === "gregorian" ? "gregorian" : "hijri"); mutation.reset(); }}><option value="hijri">هجري · 2.5%</option><option value="gregorian">ميلادي · 2.577%</option></select></label>
          <div className="my-5 border-y border-border py-4" aria-live="polite"><p className="text-sm text-muted-foreground">الزكاة المحسوبة</p><p data-testid="historical-zakat-due" className="num mt-1 text-2xl text-primary">{money(result?.due)}</p>{result && <p className="mt-2 text-xs text-muted-foreground">{Number(wealth) >= valuation.threshold ? "بلغ المال النصاب؛ الاستحقاق مشروط باكتمال الحول وشروط الزكاة." : "صافي المال أقل من النصاب في هذا اليوم."}</p>}</div>
          {user ? <Button disabled={!result || mutation.isPending} onClick={() => mutation.mutate({ data: { historyId: selected.id, metal: search.metal, silverWeight: weight === 612.36 ? 612.36 : 595, netWealth: Number(wealth), basis } })}><Save />{mutation.isPending ? "جارٍ الحفظ…" : "حفظ في حسابي"}</Button> : <Button asChild variant="outline"><Link to="/auth">تسجيل الدخول لحفظ الحساب</Link></Button>}
          {mutation.isSuccess && <p role="status" className="mt-3 text-sm text-primary">تم حفظ الحساب ومصدره. <Link className="underline" to="/personal-calculations">عرض حساباتي</Link></p>}
          {mutation.isError && <p role="alert" className="mt-3 text-sm text-destructive">تعذّر الحفظ؛ لم يتم تأكيد حفظ الحساب. حاول مرة أخرى.</p>}
        </> : <p role="status" className="mt-5 text-muted-foreground">لا يتوفر سعر محفوظ للمعيار المختار في هذا اليوم.</p>}
      </section>
    </div>
  </Page>;
}