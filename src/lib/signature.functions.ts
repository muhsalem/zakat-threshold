import { createServerFn } from "@tanstack/react-start";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const signInputSchema = z.object({
  id: z.string().min(1).max(200),
  hash: z.string().min(1).max(200),
  issued: z.string().datetime(),
});
const verifyInputSchema = signInputSchema.extend({ sig: z.string().min(1).max(64) });

function getKey(): Buffer {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_URL || "nisab-fallback";
  // derive a stable key from server-only env (never exposed to client)
  return createHmac("sha256", "nisab-signing-v1").update(k).digest();
}

function canonical(p: { id: string; hash: string; issued: string }): string {
  return [p.id, p.hash, p.issued].join("|");
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * التوقيع مقصور على مستخدم مسجَّل دخوله — كان بلا أي تحقق هوية (server
 * function عامة قابلة للاستدعاء المباشر بغضّ النظر عن الصفحة التي
 * تستورده)، فكان بإمكان أي مجهول تمرير id/hash/issued مُختلَقة تماماً
 * والحصول على توقيع "صالح" رياضياً — يُنتج رابط تحقق يبدو معتمَداً
 * لأرقام زكاة مُلفَّقة بالكامل. لا يوجد بعد ربط بجدول قاعدة بيانات فعلي
 * لهذا المسار (PrintReport يُنشئ id محلياً لا صف pdf_reports حقيقي)،
 * فتقييد التوقيع بمستخدم مصادَق هو الحد الأدنى العملي الآن — إغلاق
 * الفجوة بالكامل يتطلب تخزين التقارير الموقَّعة والتحقق مقابلها فعلياً،
 * وهو خارج نطاق هذا الإصلاح.
 */
export const signReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => signInputSchema.parse(d))
  .handler(async ({ data }) => {
    const mac = createHmac("sha256", getKey()).update(canonical(data)).digest();
    return { sig: b64url(mac).slice(0, 22) };
  });

// التحقق يبقى عاماً بلا مصادقة عمداً — طرف ثالث (بنك، جهة خيرية) يفحص
// شهادة مطبوعة عبر QR لا يملك بالضرورة حساباً بالمنصة.
export const verifyReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifyInputSchema.parse(d))
  .handler(async ({ data }) => {
    if (!data.id || !data.hash || !data.issued || !data.sig) return { valid: false };
    const mac = createHmac("sha256", getKey()).update(canonical(data)).digest();
    const expected = b64url(mac).slice(0, 22);
    const a = Buffer.from(expected);
    const b = Buffer.from(data.sig);
    const valid = a.length === b.length && timingSafeEqual(a, b);
    return { valid };
  });
