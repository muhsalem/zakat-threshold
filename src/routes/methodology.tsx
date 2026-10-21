import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Calculator, Database, Scale } from "lucide-react";

import { Page } from "@/components/site/Page";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { GOLD_NISAB_G, SILVER_NISAB_G, TROY_OUNCE_G } from "@/lib/nisab";
import { homeCopy } from "@/lib/home-copy";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "منهجية حساب النصاب والأساس الشرعي · نِصاب" },
      {
        name: "description",
        content:
          "شرح أصل نصاب الذهب والفضة، معادلة التحويل إلى قيمة، الفرق بين النصاب والزكاة، والمصادر والاختلاف الفقهي.",
      },
      { property: "og:title", content: "منهجية حساب النصاب والأساس الشرعي · نِصاب" },
      {
        property: "og:description",
        content:
          "منهجية شفافة تجمع الأصل الشرعي والبيانات الاقتصادية والحساب الرياضي دون خلط بينها.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MethodologyPage,
});

function MethodologyPage() {
  const { t, lang } = useI18n();
  const s = homeCopy(lang);
  const sections = [
    { n: "01", icon: BookOpen, title: t("method.fiqh.title"), body: t("method.fiqh.body") },
    { n: "02", icon: Database, title: t("method.data.title"), body: t("method.data.body") },
    { n: "03", icon: Calculator, title: t("method.math.title"), body: t("method.math.body") },
  ];
  return (
    <Page eyebrow={t("method.eyebrow")} title={t("method.title")} sub={t("method.sub")}>
      <section className="brand-panel grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <Scale aria-hidden="true" className="size-8 text-goldlight" />
          <h2 className="mt-5 text-2xl">{t("method.distinction")}</h2>
          <p className="mt-3 leading-8 opacity-80">{t("method.distinctionBody")}</p>
        </div>
        <div className="grid gap-px overflow-hidden rounded-lg bg-primary-foreground/20 sm:grid-cols-2">
          <div className="bg-forest/70 p-5">
            <p className="eyebrow opacity-60">NISAB</p>
            <p className="mt-3 text-lg">{t("method.nisab")}</p>
          </div>
          <div className="bg-forest/70 p-5">
            <p className="eyebrow opacity-60">ZAKAT</p>
            <p className="mt-3 text-lg">{t("method.zakat")}</p>
          </div>
        </div>
      </section>

      <section className="mt-10 border-y border-border">
        {sections.map((section) => (
          <article
            key={section.n}
            className="grid gap-5 border-b border-border py-8 last:border-0 md:grid-cols-[9rem_1fr]"
          >
            <div className="flex items-center gap-3">
              <span className="num text-2xl text-accent">{section.n}</span>
              <section.icon aria-hidden="true" className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl text-foreground">{section.title}</h2>
              <p className="mt-3 max-w-3xl leading-8 text-muted-foreground">{section.body}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="card-surface p-6">
          <p className="eyebrow text-muted-foreground">GOLD</p>
          <h2 className="mt-3 text-2xl text-foreground">{GOLD_NISAB_G}g</h2>
          <p className="num mt-4 rounded-md bg-secondary p-4 text-sm text-secondary-foreground">
            (USD/oz ÷ {TROY_OUNCE_G}) × FX × {GOLD_NISAB_G}
          </p>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{t("method.goldNote")}</p>
        </article>
        <article className="card-surface p-6">
          <p className="eyebrow text-muted-foreground">SILVER</p>
          <h2 className="mt-3 text-2xl text-foreground">{SILVER_NISAB_G}g</h2>
          <p className="num mt-4 rounded-md bg-secondary p-4 text-sm text-secondary-foreground">
            (USD/oz ÷ {TROY_OUNCE_G}) × FX × {SILVER_NISAB_G}
          </p>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{t("method.silverNote")}</p>
        </article>
      </section>

      <section className="mt-10 card-surface p-6" dir="rtl" lang="ar">
        <h2 className="text-xl text-foreground">الدليل الشرعي وأصل الأوزان</h2>
        <ul className="mt-4 max-w-4xl list-disc space-y-3 ps-5 leading-8 text-muted-foreground">
          <li>
            <strong className="text-foreground">الذهب:</strong> «ليس عليك شيء — يعني في الذهب — حتى
            يكون لك عشرون ديناراً، فإذا كان لك عشرون ديناراً وحال عليها الحول ففيها نصف دينار» (رواه
            أبو داود من حديث علي رضي الله عنه).
          </li>
          <li>
            <strong className="text-foreground">الفضة:</strong> «ليس فيما دون خمس أواقٍ صدقة» (متفق
            عليه من حديث أبي سعيد الخدري رضي الله عنه)، والأوقية أربعون درهماً، فالنصاب مائتا درهم.
          </li>
          <li>
            <strong className="text-foreground">تقدير الأوزان:</strong> الجمهور على أن المثقال ٤٫٢٥
            جم والدرهم ٢٫٩٧٥ جم، فيكون نصاب الذهب ٨٥ جم ونصاب الفضة ٥٩٥ جم. ويعتمد كثير من الحنفية
            في جنوب آسيا معيار التولة (١١٫٦٦٤ جم): ٧٫٥ تولة ذهباً = ٨٧٫٤٨ جم، و٥٢٫٥ تولة فضة =
            ٦١٢٫٣٦ جم. والخلاف في تقدير الوزن اجتهادي، والأولى اتباع جهة الفتوى في بلدك.
          </li>
          <li>
            <strong className="text-foreground">نصاب الأوراق النقدية:</strong> يُقدَّر بقيمة نصاب
            الذهب أو الفضة، ومن العلماء والهيئات من يرجّح الفضة لأنها الأحظّ للفقراء، ومنهم من يرجّح
            الذهب لثباته؛ فهي مسألة اجتهادية معاصرة.
          </li>
        </ul>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          هذا الموقع أداة حساب استرشادية وليس فتوى، ويُنصح بمراجعة مختص شرعي في الحالات الخاصة.
        </p>
      </section>

      <section className="mt-10 border-s-2 border-accent bg-card p-6">
        <h2 className="text-xl text-foreground">{t("method.difference.title")}</h2>
        <p className="mt-3 max-w-4xl leading-8 text-muted-foreground">
          {t("method.difference.body")}
        </p>
        <p className="mt-3 leading-8 text-muted-foreground">595g / 612.36g · {s.note}</p>
        <p className="mt-3 leading-8 text-muted-foreground">{s.basis}</p>
      </section>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/today">{t("nav.today")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/fiqh">{t("nav.fiqh")}</Link>
        </Button>
      </div>
    </Page>
  );
}
