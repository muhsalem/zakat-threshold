import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";

/**
 * AI OCR/استخراج للقوائم المالية:
 * يستقبل نصاً خاماً (نسخ من PDF/Excel) أو صورة (base64) لقائمة المركز المالي،
 * ويعيد تصنيفاً منظّماً للأصول الزكوية والخصومات جاهزاً لإدخاله في نموذج البنك/الشركة.
 *
 * الاستخدام: POST { text?: string, imageBase64?: string, imageType?: "image/png"|"image/jpeg" }
 * الاستجابة: { items: Array<{ category: string; label: string; amount: number; zakatable: boolean; confidence: number; note?: string }> }
 */

const SYSTEM = `أنت خبير محاسبي شرعي متخصّص في زكاة الشركات والمؤسسات المالية الإسلامية وفق AAOIFI SS 35 و FAS 9.
مهمتك: قراءة قائمة مركز مالي (Balance Sheet) وتصنيف كل بند إلى فئات الزكاة التالية:

الفئات الزكوية (zakatable=true):
- cash: النقد وما في حكمه
- receivables_strong: ذمم مدينة مرجوّة التحصيل
- inventory: مخزون / بضائع للمتاجرة
- murabaha: ذمم مرابحة
- ijara: ذمم إجارة
- istisna: ذمم استصناع
- sukuk_trading: صكوك للمتاجرة
- equity_trading: أسهم للمتاجرة
- mudaraba_share: حصة في مضاربات
- musharaka_share: حصة في مشاركات
- precious_metals: ذهب/فضة

الفئات المستبعَدة (zakatable=false):
- fixed_assets_use: أصول ثابتة للاستخدام
- intangibles: أصول غير ملموسة للاستخدام
- psia: ودائع أصحاب حسابات الاستثمار
- takaful_participants: صندوق المشتركين في التكافل
- current_payables: التزامات مستحقة خلال السنة (خصم)
- doubtful_provision: مخصّص ديون مشكوك فيها (خصم)
- unclassified: بند غير قابل للتصنيف تلقائياً

القواعد:
1) أعِد JSON فقط بلا أي شرح.
2) الأرقام موجبة دائماً؛ حدّد zakatable حسب الفئة.
3) confidence رقم بين 0 و 1.
4) إن كان البند مشكوكاً فيه ضعه في unclassified مع note يوضّح السبب.

الصيغة المطلوبة:
{"items":[{"category":"cash","label":"النقد لدى البنوك","amount":1250000,"zakatable":true,"confidence":0.95,"note":""}]}`;

async function requireUser(request: Request): Promise<{ userId: string } | Response> {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  const token = authHeader.slice(7).trim();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  const supa = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supa.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  return { userId: data.claims.sub as string };
}

export const Route = createFileRoute("/api/extract-statement")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (auth instanceof Response) return auth;
        const rl = rateLimit(request, { key: `extract:${auth.userId}`, limit: 10, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter);

        const body = (await request.json()) as {
          text?: string;
          imageBase64?: string;
          imageType?: string;
        };

        if (!body.text && !body.imageBase64) {
          return new Response(JSON.stringify({ error: "text_or_image_required" }), { status: 400 });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "AI gateway غير مُهيَّأ. أضف LOVABLE_API_KEY." }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        const userContent: unknown[] = [];
        if (body.text) {
          userContent.push({ type: "text", text: `قائمة المركز المالي:\n\n${body.text.slice(0, 20_000)}` });
        }
        if (body.imageBase64) {
          const mime = body.imageType || "image/png";
          userContent.push({
            type: "image_url",
            image_url: { url: `data:${mime};base64,${body.imageBase64.slice(0, 6_000_000)}` },
          });
        }

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-lite",
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: userContent },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          return new Response(
            JSON.stringify({ error: "ai_gateway_error", details: errText.slice(0, 500) }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }

        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const raw = data.choices?.[0]?.message?.content?.trim() || "{}";

        let parsed: { items?: unknown[] } = {};
        try {
          parsed = JSON.parse(raw);
        } catch {
          // Sometimes model returns text before JSON; try to extract
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              parsed = JSON.parse(match[0]);
            } catch {
              parsed = {};
            }
          }
        }

        return new Response(JSON.stringify({ items: Array.isArray(parsed.items) ? parsed.items : [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
