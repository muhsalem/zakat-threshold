import { z } from "zod";

export const zakatQuestionSchema = z.object({
  question: z.string().trim().min(3).max(1000),
  country: z.string().regex(/^[A-Z]{2}$/),
  lang: z.string().regex(/^[a-z]{2,3}$/),
});

export type ZakatSource = {
  id: string;
  title: string;
  url: string;
  kind: "official" | "summary" | "guide";
  text: string;
  sourceKind?: "fatwa" | "official-guide" | "announcement" | "app-guide";
  publishedOn?: string | null;
  verifiedAt?: string | null;
  excerpt?: string;
};

const answerSchema = z.object({
  answer: z.string().trim().min(1).max(12000),
  sourceIds: z.array(z.string()).max(10),
});

/** Only server-supplied references may be displayed; a model cannot invent a link. */
export function validateZakatAnswer(raw: string, sources: ZakatSource[]) {
  const parsed = answerSchema.parse(JSON.parse(raw));
  const ids = new Set(parsed.sourceIds);
  if (parsed.sourceIds.some((id) => !sources.some((source) => source.id === id))) {
    throw new Error("UNKNOWN_SOURCE");
  }
  return { answer: parsed.answer, sources: sources.filter((source) => ids.has(source.id)) };
}

export function safeSourceUrl(value: string): boolean {
  if (value.startsWith("/fiqh#")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
