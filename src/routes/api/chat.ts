import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Anthropic } from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";

async function requireUser(request: Request): Promise<{ userId: string } | Response> {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const token = authHeader.slice(7).trim();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const supa = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supa.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { userId: data.claims.sub as string };
}

const SYSTEM_PROMPT = `أنت "مستشار نِصاب" — مساعد متخصص في فقه ومحاسبة الزكاة وفق المعايير الشرعية المعتمدة (خاصةً المعيار الشرعي 35 من AAOIFI، وفتاوى المجامع الفقهية الكبرى).

قواعد إجابتك:
- أجب باللغة العربية الفصحى المبسطة.
- اعتمد على القرآن والسنة وآراء المذاهب الأربعة، مع ذكر المصدر/المرجع باختصار عند كل حكم.
- وضّح متى يختلف الحكم بين المذاهب، وقدّم الرأي الراجح المعمول به في معايير AAOIFI.
- اشرح طريقة الحساب خطوة بخطوة عند الأسئلة العملية.
- إذا كان السؤال يتعلق بحالة شخصية حساسة (طلاق/إرث/جنائي)، انصح المستخدم بالرجوع لمفتٍ معتمد.
- لا تخترع أرقامًا أو فتاوى. إذا لم تعرف، قل "لا أعلم بدقة، يُستحسن الرجوع لجهة إفتاء معتمدة".
- اجعل الإجابة منظمة بعناوين ونقاط حين يلزم.`;

function buildProvider() {
  // 1) Lovable AI Gateway (الأولوية الأولى)
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (lovableKey) {
    return {
      provider: createLovableAiGatewayProvider(lovableKey),
      model: "google/gemini-2.0-flash-lite",
    };
  }

  // 2) OpenAI-compatible endpoint (بديل مرن)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const openai = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      headers: { Authorization: `Bearer ${openaiKey}` },
    });
    return { provider: openai, model: "gpt-4o-mini" };
  }

  return null;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (auth instanceof Response) return auth;
        const rl = rateLimit(request, { key: `chat:${auth.userId}`, limit: 20, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter);

        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) return new Response("Messages required", { status: 400 });

        const config = buildProvider();

        // 3) Anthropic fallback مباشر (إذا لا يوجد provider آخر)
        if (!config) {
          const anthropicKey = process.env.ANTHROPIC_API_KEY;
          if (!anthropicKey) {
            return new Response(
              JSON.stringify({
                error:
                  "لم يُهيَّأ أي مفتاح AI. أضف LOVABLE_API_KEY أو OPENAI_API_KEY أو ANTHROPIC_API_KEY في متغيرات البيئة.",
              }),
              { status: 503, headers: { "Content-Type": "application/json" } },
            );
          }
          const client = new Anthropic({ apiKey: anthropicKey });
          const userMessages = messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => {
              const text = Array.isArray(m.parts)
                ? m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")
                : "";
              return { role: m.role as "user" | "assistant", content: text };
            });
          const stream = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: userMessages,
            stream: true,
          });
          const encoder = new TextEncoder();
          const readable = new ReadableStream({
            async start(controller) {
              for await (const event of stream) {
                if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`,
                    ),
                  );
                }
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            },
          });
          return new Response(readable, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        }

        const result = streamText({
          model: config.provider(config.model),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
