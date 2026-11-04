import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { History as HistoryIcon, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { COUNTRIES, DEFAULT_COUNTRY, findCountry } from "@/lib/countries";
import { useI18n } from "@/lib/i18n";
import { getNisabAt } from "@/lib/nisab-at.functions";
import { goldWeightFor } from "@/lib/nisab-valuation";
import { silverWeightFor, type NisabStandard } from "@/lib/nisab-at";
import { formatMoney } from "@/lib/nisab";

const BASIS: Record<string, string> = {
  tick: "سجل دقيق لهذه الدقيقة تقريبًا",
  daily: "لقطة اليوم الخام (لا يوجد سجل دقيق قريب)",
  history: "سجل الدولة اليومي المحفوظ قبل بدء التسجيل الدقيق",
};

/** Pick a country and an instant; see the nisab as it was then. */
export function PastNisab() {
  const { country: siteCountry } = useI18n();
  const lookup = useServerFn(getNisabAt);
  const [code, setCode] = useState(() => findCountry(siteCountry || DEFAULT_COUNTRY).code);
  const [standard, setStandard] = useState<NisabStandard>("default");
  // datetime-local has no zone: it is entered and read as UTC to match how history is keyed.
  const nowLocal = useMemo(() => new Date().toISOString().slice(0, 16), []);
  const [at, setAt] = useState(nowLocal);

  const query = useMutation({
    mutationFn: () => lookup({ data: { country: code, at: `${at}:00Z`, standard } }),
  });
  const sorted = useMemo(() => [...COUNTRIES].sort((a, b) => a.ar.localeCompare(b.ar, "ar")), []);
  const result = query.data;
  const money = (v: number, currency: string) => formatMoney(v, currency, "en");
  const silverW = silverWeightFor(standard);

  return (
    <section
      aria-labelledby="past-nisab-title"
      className="card-surface overflow-hidden"
      dir="rtl"
      lang="ar"
    >
      <header className="border-b border-border bg-secondary/40 p-6">
        <h2 id="past-nisab-title" className="flex items-center gap-2 text-xl text-foreground">
          <HistoryIcon aria-hidden="true" className="size-5 text-accent" />
          نصاب دولة في تاريخ سابق
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          اختر الدولة والتاريخ والوقت (بتوقيت UTC) لترى النصاب كما كان في ذلك الوقت.
        </p>
      </header>
      <form
        className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          query.mutate();
        }}
      >
        <label className="grid gap-1 text-xs text-muted-foreground">
          الدولة
          <select
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            {sorted.map((c) => (
              <option key={c.code} value={c.code}>
                {c.ar} ({c.currency})
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          التاريخ والوقت (UTC)
          <input
            type="datetime-local"
            value={at}
            max={nowLocal}
            onChange={(e) => setAt(e.target.value)}
            required
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          معيار الأوزان
          <select
            value={standard}
            onChange={(e) => setStandard(e.target.value as NisabStandard)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="default">٨٥ جم ذهب / ٥٩٥ جم فضة</option>
            <option value="tola">٨٧٫٤٨ جم ذهب / ٦١٢٫٣٦ جم فضة (التولة)</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={query.isPending} className="w-full">
            <Search aria-hidden="true" />
            {query.isPending ? "جارٍ البحث…" : "اعرض النصاب"}
          </Button>
        </div>
      </form>

      <div className="px-6 pb-6" aria-live="polite">
        {query.isError && (
          <p role="alert" className="text-sm text-negative">
            تعذّر الوصول إلى سجل الأسعار. حاول لاحقًا.
          </p>
        )}
        {result && !result.found && (
          <p role="status" className="text-sm text-muted-foreground">
            {result.reason === "no-data"
              ? "لا يوجد سجل لهذه الدولة قبل هذا التاريخ؛ التسجيل يبدأ من تاريخ تشغيل المنصة."
              : result.reason === "invalid"
                ? "تاريخ أو دولة غير صالحة."
                : "سجل الأسعار غير متاح الآن."}
          </p>
        )}
        {result?.found && (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
                <p className="text-sm text-muted-foreground">
                  نصاب الذهب ({goldWeightFor(silverW)} جم)
                </p>
                <p className="num mt-1 text-2xl text-foreground">
                  {money(result.nisab.gold, result.currency)}
                </p>
                <p className="num mt-1 text-xs text-muted-foreground">
                  جرام الذهب {money(result.nisab.goldGram, result.currency)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary p-4">
                <p className="text-sm text-muted-foreground">نصاب الفضة ({silverW} جم)</p>
                <p className="num mt-1 text-2xl text-foreground">
                  {money(result.nisab.silver, result.currency)}
                </p>
                <p className="num mt-1 text-xs text-muted-foreground">
                  جرام الفضة {money(result.nisab.silverGram, result.currency)}
                </p>
              </div>
            </div>
            <ul className="grid gap-1 text-xs leading-6 text-muted-foreground">
              <li>
                الأساس: {BASIS[result.basis]}
                {result.gapMinutes > 0 &&
                  ` — أقرب سجل قبل الوقت المطلوب بـ ${result.gapMinutes} دقيقة`}
                .
              </li>
              <li className="num">
                وقت السجل: {result.recordedAt.replace("T", " ").slice(0, 16)} UTC
              </li>
              <li>المصدر: {result.source}</li>
              {result.fxDay && <li className="num">سعر الصرف: لقطة يوم {result.fxDay}</li>}
              {result.status && result.status !== "agree" && result.status !== "single" && (
                <li className="text-negative">
                  تنبيه: كانت المصادر متباعدة وقت التسجيل ({result.status}).
                </li>
              )}
            </ul>
          </div>
        )}
        <p className="mt-4 text-xs leading-6 text-muted-foreground">
          يُحسب نصاب كل دولة من سعر الأونصة الخام المسجَّل ومن سعر الصرف المحفوظ لذلك اليوم، فلا
          يقتصر السجل على دول بعينها. أرقام استرشادية وليست فتوى.
        </p>
      </div>
    </section>
  );
}
