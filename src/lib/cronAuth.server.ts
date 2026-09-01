// لا node:crypto: خمسة مسارات hooks تستورد هذا الملف في أعلاها، وrouteTree.gen.ts
// يحمّل كل المسارات في حزمة العميل — فكان الاستيراد يرمي في المتصفح على كل
// صفحة. المقارنة الثابتة الآن JavaScript خالص (constantTimeEqual.ts).
import { constantTimeEqualStrings } from "@/lib/constantTimeEqual";

/**
 * تحقق موحَّد لكل كرون-هوكس (pg_cron) — مفتاح مشترك CRON_SECRET عبر ترويسة
 * X-Cron-Secret أو Authorization: Bearer. مقارنة زمنية ثابتة (لا ===) لتفادي
 * تسريب طول/محتوى السر عبر توقيت الاستجابة.
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!header) return false;

  return constantTimeEqualStrings(header, secret);
}

export function cronUnauthorizedResponse(): Response {
  return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
