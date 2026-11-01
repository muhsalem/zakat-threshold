import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";

import { Page } from "@/components/site/Page";
import { PriceSourcesTable } from "@/components/site/PriceSourcesTable";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, countryName, flagOf } from "@/lib/countries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/sources")({
  head: () => ({
    meta: [
      { title: "مصادر النصاب الرسمية لكل دولة · نِصاب" },
      {
        name: "description",
        content:
          "روابط الجهات الرسمية التي تعلن النصاب أو أحكام الزكاة في كل دولة، تتابعها منصة نِصاب يوميًا.",
      },
      { property: "og:title", content: "مصادر النصاب الرسمية لكل دولة" },
      {
        property: "og:description",
        content: "دور الإفتاء وبيوت الزكاة والهيئات الرسمية المتابَعة يوميًا.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SourcesPage,
});

function SourcesPage() {
  const { lang } = useI18n();
  const { data = [], isLoading } = useQuery({
    queryKey: ["official-sources-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("official_sources")
        .select("id,country,authority,url,last_checked,active,verified_excerpt,verified_at,published_on,source_kind")
        .eq("active", true)
        .order("country");
      return data ?? [];
    },
  });

  const byCountry = new Map<string, typeof data>();
  for (const s of data) byCountry.set(s.country, [...(byCountry.get(s.country) ?? []), s]);

  return (
    <Page
      eyebrow="SOURCES"
      title="مصادر النصاب الرسمية"
      sub="فتاوى وأدلة رسمية موثقة؛ تاريخ نشر المصدر يختلف عن تاريخ التحقق منه، ولا يمثل إعلانًا بقيمة نصاب اليوم."
    >
      {isLoading && <p className="text-sm text-muted-foreground">…</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {[...byCountry.entries()].map(([code, list]) => {
          const c = COUNTRIES.find((x) => x.code === code);
          return (
            <article key={code} className="card-surface p-5">
              <h2 className="text-lg text-foreground">
                <span aria-hidden="true">{flagOf(code)}</span> {c ? countryName(c, lang) : code}
              </h2>
              <ul className="mt-3 grid gap-2">
                {list.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4"
                    >
                      {s.authority} <ExternalLink aria-hidden="true" className="size-3.5" />
                    </a>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.source_kind === "fatwa" ? "فتوى" : s.source_kind === "guide" ? "دليل خدمة رسمي، وليس فتوى" : "مصدر إعلان"}
                      {s.published_on ? ` · نشر ${s.published_on}` : ""}
                      {s.verified_at ? ` · تحقق ${s.verified_at.slice(0, 10)}` : " · لم يوثق مقتطف بعد"}
                    </p>
                    {s.verified_excerpt && <blockquote className="mt-2 border-s-2 border-border ps-3 text-sm text-foreground">{s.verified_excerpt}</blockquote>}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
      <PriceSourcesTable />
      <p className="mt-6 text-xs text-muted-foreground">
        أرقام استرشادية وليست فتوى؛ المرجع النهائي هو إعلان الجهة الرسمية.
      </p>
    </Page>
  );
}
