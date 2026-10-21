import { ScrollText } from "lucide-react";

import { NISAB_ERAS } from "@/lib/nisab-eras";

export function NisabEras() {
  return (
    <section
      aria-labelledby="nisab-eras-title"
      className="card-surface overflow-hidden"
      dir="rtl"
      lang="ar"
    >
      <header className="border-b border-border bg-secondary/40 p-6">
        <h2 id="nisab-eras-title" className="flex items-center gap-2 text-xl text-foreground">
          <ScrollText aria-hidden="true" className="size-5 text-accent" />
          التطور التاريخي للنصاب عبر العصور
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          من العهد النبوي حتى العصر الحديث: الأوزان الشرعية ثابتة، والذي تغيّر هو النقد الذي تُقوَّم
          به.
        </p>
      </header>
      <ol className="m-0 list-none p-6 ps-8">
        {NISAB_ERAS.map((era) => (
          <li
            key={era.id}
            className="relative border-s-2 border-border ps-6 pb-8 last:border-transparent last:pb-0"
          >
            <span
              aria-hidden="true"
              className="absolute -start-[7px] top-1.5 size-3 rounded-full bg-accent"
            />
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg text-foreground">{era.nameAr}</h3>
              <span className="num rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                {era.spanAr}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-foreground">
                <strong>الذهب:</strong> {era.goldAr}
              </p>
              <p className="rounded-lg border border-border bg-secondary px-3 py-2 text-foreground">
                <strong>الفضة:</strong> {era.silverAr}
              </p>
            </div>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{era.noteAr}</p>
          </li>
        ))}
      </ol>
      <p className="border-t border-border px-6 py-4 text-xs leading-6 text-muted-foreground">
        الحدود الزمنية تقريبية والملاحظات ملخصات تاريخية عامة، وتُقرأ للاستئناس؛ المرجع في الأوزان
        هو النصوص الشرعية وأقوال الفقهاء.
      </p>
    </section>
  );
}
