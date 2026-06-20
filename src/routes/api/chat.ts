import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `أنت "مستشار نِصاب" — مساعد متخصص في فقه ومحاسبة الزكاة وفق المعايير الشرعية المعتمدة (خاصةً المعيار الشرعي 35 من AAOIFI، وفتاوى المجامع الفقهية الكبرى).

قواعد إجابتك:
- أجب باللغة العربية الفصحى المبسطة.
- اعتمد على القرآن والسنة وآراء المذاهب الأربعة، مع ذكر المصدر/المرجع باختصار عند كل حكم.
- وضّح متى يختلف الحكم بين المذاهب، وقدّم الرأي الراجح المعمول به في معايير AAOIFI.
- اشرح طريقة الحساب خطوة بخطوة عند الأسئلة العملية.
- إذا كان السؤال يتعلق بحالة شخصية حساسة (طلاق/إرث/جنائي)، انصح المستخدم بالرجوع لمفتٍ معتمد.
- لا تخترع أرقامًا أو فتاوى. إذا لم تعرف، قل "لا أعلم بدقة، يُستحسن الرجوع لجهة إفتاء معتمدة".
- اجعل الإجابة منظمة بعناوين ونقاط حين يلزم.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) return new Response("Messages required", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
