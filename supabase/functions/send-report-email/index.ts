// Edge Function: إرسال التقرير المعتمد بالبريد
// المتغيرات المطلوبة:
//   RESEND_API_KEY — مفتاح Resend للبريد الإلكتروني
//   SITE_URL       — رابط الموقع

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  to: string;
  clientName: string;
  zakatDue: number;
  currency: string;
  reportId: string;
  hijriDate?: string;
  gregorianDate: string;
  accountantName?: string;
  verifyUrl?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return new Response(JSON.stringify({ error: "RESEND_API_KEY غير محدد" }), { status: 500 });

    const payload: Payload = await req.json();
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://nisab.app";
    const verifyUrl = payload.verifyUrl ?? `${siteUrl}/verify?id=${payload.reportId}`;

    const zakatFormatted = new Intl.NumberFormat("ar-SA", {
      style: "currency", currency: payload.currency, maximumFractionDigits: 2,
    }).format(payload.zakatDue);

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Cairo,Arial,sans-serif;background:#f8f6f0;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <!-- Header -->
    <div style="background:#2d6a52;padding:32px 24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">تقرير الزكاة المعتمد</h1>
      <p style="color:#a7d7c5;margin:8px 0 0">منصة نِصاب — زكاة معتمدة شرعياً ومحاسبياً</p>
    </div>
    <!-- Body -->
    <div style="padding:32px 24px" dir="rtl">
      <p style="color:#374151;font-size:16px">
        السلام عليكم ورحمة الله، <strong>${payload.clientName}</strong>
      </p>
      <p style="color:#6b7280">يسعدنا إرسال تقرير زكاتك المعتمد لهذا العام.</p>

      <div style="background:#f0faf5;border:1px solid #a7d7c5;border-radius:8px;padding:20px;margin:24px 0;text-align:center">
        <div style="color:#6b7280;font-size:13px;margin-bottom:4px">إجمالي الزكاة المستحقة</div>
        <div style="color:#2d6a52;font-size:32px;font-weight:bold">${zakatFormatted}</div>
        <div style="color:#9ca3af;font-size:12px;margin-top:4px">${payload.hijriDate ?? ""} — ${payload.gregorianDate}</div>
      </div>

      ${payload.accountantName ? `
      <div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#d97706;font-size:18px">✅</span>
          <div>
            <div style="font-weight:bold;color:#92400e">مراجعة معتمدة</div>
            <div style="color:#78350f;font-size:13px">راجعه وأجازه: ${payload.accountantName}</div>
          </div>
        </div>
      </div>` : ""}

      <div style="margin:24px 0">
        <a href="${verifyUrl}"
           style="display:block;text-align:center;background:#2d6a52;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
          تحقق من صحة التقرير →
        </a>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:8px">رقم التقرير: ${payload.reportId}</p>
      </div>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="color:#9ca3af;font-size:12px;text-align:center">
        تقرير صادر من منصة نِصاب وفق معايير AAOIFI 35 | ${siteUrl}
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
        to: [payload.to],
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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
