import { timingSafeEqual } from "node:crypto";

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

  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function cronUnauthorizedResponse(): Response {
  return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
