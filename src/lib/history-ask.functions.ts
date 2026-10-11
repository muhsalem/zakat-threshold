import { createServerFn } from "@tanstack/react-start";

type AskInput = {
  question: string;
  country: string;
  currency: string;
  range: string;
  view: string;
  lang: string;
  points: { d: string; v: number }[];
};

function parse(input: unknown): AskInput {
  const v = input as Partial<AskInput>;
  const question = String(v?.question ?? "").trim().slice(0, 500);
  if (question.length < 3) throw new Error("السؤال قصير جدًا");
  const points = (Array.isArray(v?.points) ? v.points : [])
    .filter((p) => p && typeof p.v === "number" && Number.isFinite(p.v))
    .slice(0, 200)
    .map((p) => ({ d: String(p.d).slice(0, 10), v: Math.round(p.v * 100) / 100 }));
  if (points.length < 2) throw new Error("لا توجد بيانات كافية للتحليل");
  const s = (x: unknown, n = 60) => String(x ?? "").slice(0, n);
  return { question, country: s(v.country), currency: s(v.currency, 3), range: s(v.range, 10), view: s(v.view), lang: s(v.lang, 5) || "ar", points };
}

/** Answers a natural-language question using only the historical series shown in the chart. */
export const askHistory = createServerFn({ method: "POST" })
  .inputValidator(parse)
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("missing LOVABLE_API_KEY");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const { createLovableAiGatewayRunIdFetch } = await import("./ai-gateway.server");
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    const first = data.points[0]!;
    const last = data.points[data.points.length - 1]!;
    const values = data.points.map((p) => p.v);
    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      system:
        "You are a precious-metals data analyst for a zakat nisab platform. Answer ONLY from the provided series; " +
        "if the data cannot answer, say so. Cite concrete dates and values, compute percentages accurately. " +
        "No fatwas, no investment advice, no invented data. Under 200 words, markdown allowed, no tables. " +
        `Reply in language code: ${data.lang}.`,
      prompt:
        `Country: ${data.country}\nCurrency: ${data.currency}\nSeries: ${data.view}\nRange: ${data.range}\n` +
        `First: ${first.d}=${first.v}, Last: ${last.d}=${last.v}, Min: ${Math.min(...values)}, Max: ${Math.max(...values)}\n` +
        `Data (date=value):\n${data.points.map((p) => `${p.d}=${p.v}`).join("\n")}\n\nQuestion: ${data.question}`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    try {
      const text = await result.text;
      return { text: text.trim() };
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 429) throw new Error("ضغط مرتفع على الخدمة، حاول بعد قليل.");
      if (status === 402) throw new Error("نفد رصيد الذكاء الاصطناعي للمنصة.");
      throw e instanceof Error ? e : new Error("تعذّر التحليل");
    }
  });
