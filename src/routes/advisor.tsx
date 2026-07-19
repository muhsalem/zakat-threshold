import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, ArrowRight, Bot, User, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/advisor")({
  component: AdvisorPage,
  head: () => ({
    meta: [
      { title: "مستشار نِصاب الذكي — استشارات زكاة فورية" },
      {
        name: "description",
        content:
          "اسأل مستشار الزكاة الذكي عن أحكام وطرق حساب زكاة المال، الذهب، الأسهم، التجارة، الرواتب وأنواع الزكاة المعاصرة وفق المعايير الشرعية المعتمدة.",
      },
      { property: "og:title", content: "المستشار الشرعي الذكي — نِصاب" },
      {
        property: "og:description",
        content:
          "إجابات فورية موثّقة عن أسئلة الزكاة المعاصرة بذكاء اصطناعي مدرَّب على مصادر شرعية معتمدة.",
      },
      { property: "og:url", content: "/advisor" },
    ],
    links: [{ rel: "canonical", href: "/advisor" }],
  }),
});

const SUGGESTIONS = [
  "كيف أحسب زكاة الراتب الشهري؟",
  "ما حكم زكاة أسهم البورصة؟",
  "متى يجب تطهير الأرباح من الفوائد الربوية؟",
  "كيف تختلف زكاة العقار للسكن عن العقار التجاري؟",
  "ما الفرق بين النصاب بالذهب والنصاب بالفضة؟",
];

function AdvisorPage() {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (url, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(url, { ...init, headers });
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    await sendMessage({ text: t });
  };

  return (
    <div className="container max-w-3xl py-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">مستشار نِصاب الذكي</h1>
        </div>
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowRight className="h-4 w-4" /> العودة
          </Button>
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        مساعد ذكي متخصص في فقه ومحاسبة الزكاة وفق معايير AAOIFI الشرعية. الإجابات استرشادية ولا
        تُغني عن مفتٍ معتمد.
      </p>

      {!authLoading && !user && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <p className="text-sm">
              يلزم تسجيل الدخول لاستخدام المستشار (لحماية استهلاك الذكاء الاصطناعي).
            </p>
            <Link to="/auth">
              <Button size="sm" className="gap-1">
                <LogIn className="h-4 w-4" /> تسجيل الدخول
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> المحادثة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[55vh] overflow-y-auto space-y-3 rounded-md bg-muted/30 p-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  ابدأ بسؤال أو اختر اقتراحًا:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      disabled={busy || !user}
                      className="text-xs rounded-full border border-primary/30 bg-card px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m: UIMessage) => {
              const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-primary text-primary-foreground" : "bg-card border"}`}
                  >
                    {isUser ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  <div
                    className={`rounded-lg px-3 py-2 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${isUser ? "bg-primary text-primary-foreground" : "bg-card border"}`}
                  >
                    {text || (busy ? "…" : "")}
                  </div>
                </div>
              );
            })}

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2">
                تعذّر الاتصال بالمستشار. حاول مجددًا.
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                user ? "اكتب سؤالك الشرعي أو المحاسبي عن الزكاة…" : "سجّل الدخول لبدء المحادثة"
              }
              disabled={busy || !user}
              className="flex-1"
            />
            <Button type="submit" disabled={busy || !input.trim() || !user} className="gap-1.5">
              <Send className="h-4 w-4" /> إرسال
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
