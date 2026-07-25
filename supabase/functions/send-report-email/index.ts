// Edge Function: إرسال التقرير المعتمد بالبريد
// المتغيرات: RESEND_API_KEY, SITE_URL, SUPABASE_URL, SUPABASE_ANON_KEY
// حماية: JWT مطلوب، البريد يُرسل فقط لبريد المستخدم المسجّل، محتوى معقّم من HTML.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  to?: string; // اختياري — يُقبل فقط إن كان بريد المستخدم نفسه أو بريد أحد عملائه (accountant)
  clientName: string;
  zakatDue: number;
  currency: string;
  reportId: string;
  hijriDate?: string;
  gregorianDate: string;
  accountantName?: string;
  verifyPath?: string; // مسار نسبي فقط
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// حدّ بسيط في الذاكرة لكل عامل: 5 رسائل/دقيقة لكل مستخدم
const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(userId: string): boolean {
  const now = Date.now();
  const b = buckets.get(userId);
  if (!b || b.resetAt < now) {
    buckets.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (b.count >= 5) return false;
  b.count++;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.slice(7);
    const supaUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supaAnon =
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const supabase = createClient(supaUrl, supaAnon);
    const { data: u, error: uErr } = await supabase.auth.getUser(jwt);
    if (uErr || !u?.user?.id || !u.user.email) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!rateLimit(u.user.id)) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey)
      return new Response(JSON.stringify({ error: "RESEND_API_KEY غير محدد" }), { status: 500 });

    const payload: Payload = await req.json();
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://nisab.app";

    // تحديد المستلم: افتراضياً بريد المستخدم نفسه. إن مرّر `to` مختلفاً،
    // نقبله فقط إذا كان بريد أحد عملائه في `accountant_clients` (بوابة المحاسب).
    let to = u.user.email as string;
    const requested = (payload.to ?? "").trim().toLowerCase();
    if (requested && requested !== to.toLowerCase()) {
      const { data: match } = await supabase
        .from("accountant_clients")
        .select("id")
        .eq("owner_id", u.user.id)
        .ilike("email", requested)
        .limit(1)
        .maybeSingle();
      if (!match) {
        return new Response(JSON.stringify({ error: "recipient_not_allowed" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      to = requested;
    }

    // verify path يجب أن يكون مسار نسبي داخل الموقع
    const path =
      typeof payload.verifyPath === "string" &&
      payload.verifyPath.startsWith("/") &&
      !payload.verifyPath.startsWith("//")
        ? payload.verifyPath
        : `/verify?id=${encodeURIComponent(payload.reportId ?? "")}`;
    const verifyUrl = `${siteUrl}${path}`;

    const zakatFormatted = new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: payload.currency || "USD",
      maximumFractionDigits: 2,
    }).format(Number(payload.zakatDue) || 0);

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Cairo,Arial,sans-serif;background:#f8f6f0;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#2d6a52;padding:32px 24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">تقرير الزكاة المعتمد</h1>
      <p style="color:#a7d7c5;margin:8px 0 0">منصة نِصاب — زكاة معتمدة شرعياً ومحاسبياً</p>
    </div>
    <div style="padding:32px 24px" dir="rtl">
      <p style="color:#374151;font-size:16px">
        السلام عليكم ورحمة الله، <strong>${esc(payload.clientName)}</strong>
      </p>
      <p style="color:#6b7280">يسعدنا إرسال تقرير زكاتك المعتمد لهذا العام.</p>
      <div style="background:#f0faf5;border:1px solid #a7d7c5;border-radius:8px;padding:20px;margin:24px 0;text-align:center">
        <div style="color:#6b7280;font-size:13px;margin-bottom:4px">إجمالي الزكاة المستحقة</div>
        <div style="color:#2d6a52;font-size:32px;font-weight:bold">${esc(zakatFormatted)}</div>
        <div style="color:#9ca3af;font-size:12px;margin-top:4px">${esc(payload.hijriDate ?? "")} — ${esc(payload.gregorianDate)}</div>
      </div>
      ${
        payload.accountantName
          ? `<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:8px;padding:16px;margin-bottom:20px">
             <div style="font-weight:bold;color:#92400e">مراجعة معتمدة</div>
             <div style="color:#78350f;font-size:13px">راجعه وأجازه: ${esc(payload.accountantName)}</div>
           </div>`
          : ""
      }
      <div style="margin:24px 0">
        <a href="${esc(verifyUrl)}"
           style="display:block;text-align:center;background:#2d6a52;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
          تحقق من صحة التقرير →
        </a>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:8px">رقم التقرير: ${esc(payload.reportId)}</p>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="color:#9ca3af;font-size:12px;text-align:center">
        تقرير صادر من منصة نِصاب وفق معايير AAOIFI 35 | ${esc(siteUrl)}
      </p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "نِصاب <reports@nisab.app>",
        to: [to],
        subject: `تقرير الزكاة المعتمد — ${payload.gregorianDate}`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));

    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-report-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
