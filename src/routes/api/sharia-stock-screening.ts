import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { Anthropic } from "@anthropic-ai/sdk";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";

/**
 * استخراج بيانات القوائم المالية لفرز الأسهم شرعياً — يقرأ ملف PDF أصلياً
 * (لا OCR صورة) عبر دعم المستندات المدمج في Anthropic Messages API، ولا
 * يحسب أي نسبة: الاستخراج فقط، والحساب الحتمي في shariaStockScreening.ts
 * على الخادم/العميل (نفس الأرقام تُنتج نفس الحكم دائماً، لا اجتهاد نموذج).
 *
 * الاستخدام: POST { pdfBase64: string, dualPass?: boolean }
 * الاستجابة: { extract: StockAuditExtract, extract2?: StockAuditExtract | null }
 */

const SYSTEM = `أنت مدقق مالي وشرعي خبير. مهمتك هي الاستخراج الدقيق للبيانات من القوائم المالية المرفوعة فقط — لا تحسب أي نسب ولا تصدر أحكاماً كمية؛ الحسابات ستتم برمجياً.

قواعد الاستخراج الصارمة:
- جميع الأرقام بصيغة أرقام لاتينية (0-9) بدون فواصل أو رموز، كما وردت حرفياً في القوائم.
- انتبه لالتباسات الأرقام العربية المصورة (٥ مع ٠) — دقق مرتين، وطابق المجاميع الفرعية مع الإجماليات المطبوعة.
- لكل بند دين اذكر الدليل (رقم الإيضاح أو اسم البند كما ورد).
- حدد نوع القوائم: "مستقلة" أو "مجمعة" من عنوان القوائم نفسه.
- الفوائد المرسملة: افحص إيضاحات القروض والأصول الثابتة ومشروعات تحت التنفيذ والاستثمارات عن أي فوائد/عوائد تُرسمل ضمن الأصول ولا تمر بقائمة الدخل وقدّر قيمتها عن الفترة إن أمكن، وإلا فاذكرها في contractReview.
- المتوسط المرجح لعدد الأسهم: من إيضاح نصيب السهم.
- الديون الربوية = القروض والتسهيلات البنكية التقليدية بفائدة + سندات التوريق بفائدة + أي تمويل بفائدة (لا تشمل صكوك الإجارة المهيكلة شرعياً ولا التزامات عقود الإيجار التشغيلية). أدرج أصل المبلغ والفوائد المستحقة معاً (متداول + غير متداول).
- قاعدة حاسمة: العبرة في التصنيف بجوهر العقد كما وُصف في الإيضاحات لا بهوية البنك أو اسمه. إذا كان المقرض بنكاً إسلامياً لكن الإيضاح يصف التعاقد بأنه «قرض» بـ«فائدة» على مؤشر مع «فوائد مستحقة»، فصنّفه ديناً ربوياً غير متوافق على ظاهر الإفصاح، وأضف بنداً في contractReview للتحقق من إعادة الهيكلة. أما إن وُصف صراحة كمرابحة أو تمويل إسلامي بهامش محدد عند التعاقد فصنّفه متوافقاً أو «تحتاج فحصاً» بحسب وضوح الإفصاح.
- الودائع والاستثمارات بفائدة: الودائع لأجل بفائدة وأدوات الدين بفائدة (لا تشمل الحسابات الجارية إلا إذا نُص على أنها بفائدة).
- الإيرادات غير المتوافقة = الفوائد الدائنة وأي إيراد محرم آخر بقائمة الدخل عن الفترة الحالية.
- الحوكمة الشرعية: ابحث في التقرير كله — الغياب يعني "no".
- contractReview: البنود التي تحتاج فحص عقود لا تكفي القوائم للحكم عليها.

أعد JSON فقط دون أي نص أو markdown بالهيكل التالي حرفياً (النصوص بالعربية):
{"company":{"name":"","period":"","auditor":"","activity":""},
"statementType":"مستقلة|مجمعة|غير محدد",
"figures":{"totalAssets":0,"totalLiabilities":0,"totalEquity":0,"totalRevenue":0,"interestIncome":0,"capitalizedInterest":0,"weightedShares":0},
"conventionalDebt":[{"name":"","amount":0,"evidence":""}],
"interestBearingDeposits":[{"name":"","amount":0,"evidence":""}],
"instruments":[{"name":"","amount":0,"classification":"متوافقة|غير متوافقة|تحتاج فحصاً","basis":""}],
"governance":[{"item":"هيئة رقابة شرعية","status":"yes|no|partial","note":""},{"item":"تدقيق شرعي داخلي","status":"yes|no|partial","note":""},{"item":"تقرير شرعي سنوي","status":"yes|no|partial","note":""},{"item":"سياسة تطهير معلنة","status":"yes|no|partial","note":""}],
"violations":[{"title":"","severity":"high|medium|low","detail":"","reference":""}],
"recommendations":[{"priority":1,"title":"","detail":""}],
"contractReview":[{"item":"","why":""}],
"extractionNotes":""}`;

function repairJson(raw: string): unknown {
  for (let end = raw.length; end > 0; end--) {
    const ch = raw[end - 1];
    if (ch !== "}" && ch !== "]" && ch !== '"' && !/[0-9]/.test(ch)) continue;
    let cut = raw.slice(0, end).replace(/,\s*$/, "");
    const stack: string[] = [];
    let inStr = false;
    let escp = false;
    for (const c of cut) {
      if (escp) {
        escp = false;
        continue;
      }
      if (c === "\\") {
        escp = true;
        continue;
      }
      if (c === '"') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue;
      if (c === "{" || c === "[") stack.push(c);
      else if (c === "}" || c === "]") stack.pop();
    }
    if (inStr) cut += '"';
    const closing = stack
      .reverse()
      .map((c) => (c === "{" ? "}" : "]"))
      .join("");
    try {
      return JSON.parse(cut + closing);
    } catch {
      /* أسبق (جرّب قصاً أقصر) */
    }
  }
  throw new Error("تعذّرت قراءة نتيجة التحليل حتى بعد محاولة الإصلاح — أعد المحاولة");
}

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

async function extractOnce(client: Anthropic, pdfBase64: string): Promise<unknown> {
  const msg = await client.messages.create({
    // نفس مقياس النموذج المستخدم أصلاً في /api/chat (fallback مباشر) — يُبقي
    // إعداد المفاتيح موحّداً عبر المنصة بدل تعريف مقياس جديد غير مُختبر.
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          {
            type: "text",
            text: "استخرج البيانات من هذه القوائم المالية وأعد JSON وفق الهيكل المطلوب حرفياً — استخراج فقط دون حساب نسب.",
          },
        ],
      },
    ],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  const raw = clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1);
  try {
    return JSON.parse(raw);
  } catch {
    return repairJson(raw);
  }
}

export const Route = createFileRoute("/api/sharia-stock-screening")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (auth instanceof Response) return auth;
        const rl = await rateLimit(request, {
          key: `sharia-stock:${auth.userId}`,
          limit: 10,
          windowMs: 60_000,
        });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter);

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({
              error:
                "الفرز الشرعي للأسهم يتطلب ANTHROPIC_API_KEY (دعم مستندات PDF أصلي) في متغيرات البيئة.",
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        let body: { pdfBase64?: string; dualPass?: boolean };
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 });
        }
        if (!body.pdfBase64) {
          return new Response(JSON.stringify({ error: "pdfBase64_required" }), { status: 400 });
        }
        // حد حجم دفاعي (~15MB مُرمَّزة base64) يمنع استنزاف الذاكرة/الحصة عبر ملفات ضخمة
        if (body.pdfBase64.length > 20_000_000) {
          return new Response(JSON.stringify({ error: "file_too_large" }), { status: 413 });
        }

        const client = new Anthropic({ apiKey });
        try {
          if (body.dualPass) {
            const results = await Promise.allSettled([
              extractOnce(client, body.pdfBase64),
              extractOnce(client, body.pdfBase64),
            ]);
            const first = results[0];
            const second = results[1];
            if (first.status === "rejected" && second.status === "rejected") {
              throw first.reason;
            }
            const extract =
              first.status === "fulfilled"
                ? first.value
                : second.status === "fulfilled"
                  ? second.value
                  : null;
            const extract2 =
              first.status === "fulfilled" && second.status === "fulfilled" ? second.value : null;
            return Response.json({ extract, extract2 });
          }
          const extract = await extractOnce(client, body.pdfBase64);
          return Response.json({ extract, extract2: null });
        } catch (e) {
          return new Response(
            JSON.stringify({
              error: e instanceof Error ? e.message : "تعذّر استخراج البيانات من الملف",
            }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
