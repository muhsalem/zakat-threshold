import { createServerFn } from "@tanstack/react-start";

import { enforceRateLimit } from "./rate-limit.server";

type Point = { d: string; v: number };
type AskInput = {
  question: string;
  country: string;
  currency: string;
  range: string;
  view: string;
  lang: string;
  points: Point[];
};
type CompareInput = {
  question: string;
  range: string;
  view: string;
  lang: string;
  series: { country: string; currency: string; points: Point[] }[];
};

const s = (x: unknown, n = 60) => String(x ?? "").slice(0, n);
function cleanPoints(raw: unknown, max: number): Point[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((p) => p && typeof p.v === "number" && Number.isFinite(p.v))
    .slice(0, max)
    .map((p) => ({ d: String(p.d).slice(0, 10), v: Math.round(p.v * 100) / 100 }));
}

function parse(input: unknown): AskInput {
  const v = input as Partial<AskInput>;
  const question = String(v?.question ?? "")
    .trim()
    .slice(0, 500);
  if (question.length < 3) throw new Error("QUESTION_SHORT");
  const points = cleanPoints(v?.points, 200);
  if (points.length < 2) throw new Error("NO_DATA");
  return {
    question,
    country: s(v.country),
    currency: s(v.currency, 3),
    range: s(v.range, 10),
    view: s(v.view),
    lang: s(v.lang, 5) || "ar",
    points,
  };
}

function parseCompare(input: unknown): CompareInput {
  const v = input as Partial<CompareInput>;
  const question =
    String(v?.question ?? "")
      .trim()
      .slice(0, 500) || "Explain the most important differences between these countries.";
  const series = (Array.isArray(v?.series) ? v.series : [])
    .slice(0, 6)
    .map((x) => ({
      country: s(x?.country),
      currency: s(x?.currency, 3),
      points: cleanPoints(x?.points, 60),
    }))
    .filter((x) => x.points.length >= 2);
  if (series.length < 2) throw new Error("NO_DATA");
  return { question, range: s(v.range, 10), view: s(v.view), lang: s(v.lang, 5) || "ar", series };
}

const SYSTEM =
  "You are a precious-metals data analyst for a zakat nisab platform. Answer ONLY from the provided series; " +
  "if the data cannot answer, say so. Cite concrete dates and values, compute percentages accurately. " +
  "No fatwas, no investment advice, no invented data. Under 220 words, markdown allowed, no tables.";

function stats(points: Point[]) {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const vals = points.map((p) => p.v);
  const pct = ((last.v - first.v) / first.v) * 100;
  return `First ${first.d}=${first.v}, Last ${last.d}=${last.v}, Change ${pct.toFixed(2)}%, Min ${Math.min(...vals)}, Max ${Math.max(...vals)}`;
}

async function runModel(system: string, prompt: string) {
  // Public endpoint that spends AI credits: 10 questions per 10 minutes per client.
  enforceRateLimit("history-ask", 10, 10 * 60_000);
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("CONFIG");
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
  let failure: unknown;
  const result = streamText({
    model: lovable.responses("openai/gpt-6-astra"),
    system,
    prompt,
    onError: ({ error }) => {
      failure = error;
    },
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
    const text = (await result.text).trim();
    if (!text) throw failure ?? new Error("EMPTY");
    return { text };
  } catch (e) {
    const err = (failure ?? e) as { statusCode?: number; message?: string };
    const status = err?.statusCode;
    if (status === 429) throw new Error("RATE_LIMIT");
    if (status === 402) throw new Error("CREDITS");
    if (status === 403) throw new Error("DENIED");
    if (err?.message === "EMPTY") throw new Error("EMPTY");
    throw new Error("FAILED");
  }
}

/** Answers a natural-language question using only the historical series shown in the chart. */
export const askHistory = createServerFn({ method: "POST" })
  .inputValidator(parse)
  .handler(async ({ data }) =>
    runModel(
      `${SYSTEM} Reply in language code: ${data.lang}.`,
      `Country: ${data.country}\nCurrency: ${data.currency}\nSeries: ${data.view}\nRange: ${data.range}\n${stats(data.points)}\n` +
        `Data (date=value):\n${data.points.map((p) => `${p.d}=${p.v}`).join("\n")}\n\nQuestion: ${data.question}`,
    ),
  );

/** Compares the displayed series of several countries and explains the main differences. */
export const compareHistory = createServerFn({ method: "POST" })
  .inputValidator(parseCompare)
  .handler(async ({ data }) =>
    runModel(
      `${SYSTEM} Values are in each country's own currency, so compare percentage changes and trends, not raw amounts across currencies. Reply in language code: ${data.lang}.`,
      `Series: ${data.view}\nRange: ${data.range}\n\n` +
        data.series
          .map(
            (x) =>
              `## ${x.country} (${x.currency})\n${stats(x.points)}\n${x.points.map((p) => `${p.d}=${p.v}`).join(", ")}`,
          )
          .join("\n\n") +
        `\n\nQuestion: ${data.question}`,
    ),
  );
