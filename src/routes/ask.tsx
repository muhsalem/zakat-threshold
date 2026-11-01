import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type FormEvent } from "react";
import { ArrowUp, BookOpen, ExternalLink, LoaderCircle, MessageCircle } from "lucide-react";
import { Page } from "@/components/site/Page";
import { CountryPicker } from "@/components/site/Shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { askZakatQuestion } from "@/lib/zakat-questions.functions";
import { zakatQuestionSchema, type ZakatSource } from "@/lib/zakat-questions";

export const Route = createFileRoute("/ask")({
  head: () => ({ meta: [
    { title: "اسأل عن الزكاة · نِصاب" },
    { name: "description", content: "إجابات نصية مُعدّة عن الزكاة مع مراجع فتاوى رسمية حديثة وتواريخ صدورها ومقتطفاتها الموثقة." },
    { property: "og:title", content: "اسأل عن الزكاة · نِصاب" },
    { property: "og:description", content: "اطرح سؤالك واقرأ الإجابة المُعدّة مع مرجع الفتوى وتاريخها والمقتطف الرسمي." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AskZakat,
});

type Exchange = { question: string; answer: string; sources: ZakatSource[] };
function AskZakat() {
  const { lang, country, rtl } = useI18n();
  const ar = rtl;
  const ask = useServerFn(askZakatQuestion);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const busy = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const label = ar ? "اسأل عن الزكاة" : "Ask about zakat";
  const errors: Record<string, string> = {
    RATE_LIMIT: ar ? "بلغت حد الأسئلة المتاحة مؤقتًا. انتظر قبل المحاولة مجددًا." : "Question limit reached. Please wait before trying again.",
    CREDITS: ar ? "الإجابات متوقفة لحين إضافة رصيد الذكاء الاصطناعي من صاحب الموقع." : "Answers are paused until the site owner adds AI credits.",
    DENIED: ar ? "الخدمة غير متاحة بسبب قيود الوصول الحالية." : "The service is unavailable due to access restrictions.",
    SOURCES: ar ? "تعذرت قراءة المصادر الرسمية؛ احتفظنا بسؤالك." : "Official sources could not be loaded. Your question is preserved.",
    REFUSAL: ar ? "تعذر تقديم إجابة لهذا الطلب. يمكنك طرح سؤال آخر عن الزكاة." : "This request could not be answered. You can ask another zakat question.",
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    const parsed = zakatQuestionSchema.safeParse({ question, country, lang });
    if (!parsed.success) { setError(ar ? "اكتب سؤالًا من 3 إلى 1000 حرف." : "Enter a question of 3–1000 characters."); return; }
    busy.current = true;
    setPending(true); setError("");
    try {
      const result = await ask({ data: parsed.data });
      if (!result.ok) { setError(errors[result.error] ?? (ar ? "تعذرت الإجابة؛ سؤالك محفوظ ويمكنك المحاولة مجددًا." : "The answer failed. Your question is preserved; you can try again.")); return; }
      setExchanges((previous) => [...previous, { question: parsed.data.question, answer: result.answer, sources: result.sources }]);
      setQuestion("");
    } catch { setError(ar ? "تعذر الاتصال؛ احتفظنا بسؤالك." : "Connection failed. Your question is preserved."); }
    finally { busy.current = false; setPending(false); }
  }
  return (
    <Page title={label}>
      <div className="max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-border py-4">
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4 text-primary" />{ar ? "إجابات استرشادية · ليست فتوى شخصية" : "General guidance · not a personal fatwa"}</span>
          <CountryPicker compact />
        </div>
        {exchanges.length === 0 && <div className="mb-7 flex items-center gap-3 text-foreground"><MessageCircle className="size-6 shrink-0 text-primary" /><h2 className="text-xl">{ar ? "ما سؤالك؟" : "What is your question?"}</h2></div>}
        <div className="space-y-8" aria-live="polite" aria-relevant="additions">
          {exchanges.map((exchange, index) => <article key={index} className="border-b border-border pb-7">
            <h2 className="mb-4 break-words text-lg font-semibold text-foreground">{exchange.question}</h2>
            <h3 className="mb-3 text-sm font-semibold text-primary">{ar ? "الإجابة المُعدّة" : "Prepared answer"}</h3>
            <div className="space-y-4">{exchange.answer.split(/\n\s*\n/).filter(Boolean).map((paragraph, i) => <p key={i} className="whitespace-pre-wrap break-words text-base leading-8 text-foreground">{paragraph}</p>)}</div>
            <p className="mt-4 text-xs text-muted-foreground">{ar ? "صياغة استرشادية، وليست النص الحرفي للفتوى أو فتوى شخصية." : "General guidance, not the verbatim fatwa or a personal ruling."}</p>
            {exchange.sources.length > 0 && <section className="mt-5">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{ar ? "المراجع المستخدمة" : "References used"}</h3>
              <ul className="space-y-5">{exchange.sources.map((source) => <li key={source.id} className="border-s-2 border-border ps-4 text-sm">
                <p className="mb-2 font-semibold text-foreground">{source.sourceKind === "fatwa" ? (ar ? "مرجع الفتوى" : "Fatwa reference") : source.sourceKind === "official-guide" ? (ar ? "دليل خدمة رسمي — ليس فتوى" : "Official service guide — not a fatwa") : source.sourceKind === "announcement" ? (ar ? "إعلان نصاب رسمي" : "Official nisab announcement") : (ar ? "مرجع استرشادي للتطبيق" : "App guidance reference")}</p>
                <a href={source.url} target={source.url.startsWith("https:") ? "_blank" : undefined} rel="noopener noreferrer" className="inline-flex items-start gap-2 break-words text-primary underline underline-offset-4"><ExternalLink className="mt-1 size-3.5 shrink-0" />{source.title}</a>
                {source.kind === "official" && <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <p>{source.sourceKind === "fatwa" ? (ar ? "تاريخ صدور الفتوى: " : "Fatwa issued: ") : (ar ? "تاريخ نشر المصدر: " : "Published: ")}{source.publishedOn ? <time dateTime={source.publishedOn} dir="ltr">{source.publishedOn}</time> : (ar ? "غير محدد باليوم في المصدر" : "Exact day not stated")}</p>
                  {source.verifiedAt && <p>{ar ? "آخر تحقق من النص: " : "Text verified: "}<time dateTime={source.verifiedAt} dir="ltr">{source.verifiedAt.slice(0, 10)}</time></p>}
                </div>}
                {source.excerpt && <details className="mt-3"><summary className="cursor-pointer text-sm text-primary">{ar ? "المقتطف الرسمي الموثق" : "Verified official excerpt"}</summary><blockquote className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{source.excerpt}</blockquote></details>}
              </li>)}</ul>
            </section>}
          </article>)}
        </div>
        <form onSubmit={submit} className="mt-6" aria-busy={pending}>
          <label htmlFor="zakat-question" className="mb-2 block text-sm font-medium text-foreground">{ar ? "سؤالك" : "Your question"}</label>
          <Textarea ref={textarea} id="zakat-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1000} disabled={pending} placeholder={ar ? "هل الزكاة على رأس المال أم الأرباح؟" : "Is zakat due on capital or profits?"} className="min-h-32 resize-y rounded-lg bg-card text-base" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="num text-xs text-muted-foreground">{question.length} / 1000</span>
            <Button type="submit" disabled={pending || question.trim().length < 3}>
              {pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <ArrowUp />}
              {pending ? (ar ? "جارٍ إعداد الإجابة…" : "Preparing answer…") : (ar ? "إرسال السؤال" : "Send question")}
            </Button>
          </div>
          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        </form>
      </div>
    </Page>
  );
}