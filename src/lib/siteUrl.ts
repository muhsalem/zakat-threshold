/**
 * أصل الموقع القانوني (canonical origin) — مصدر واحد لكل رابط مطلق.
 *
 * كانت ستة روابط OG ومُخدِّما OpenAPI مثبَّتة على نطاق معاينة
 * project--c0035707-….lovable.app. أثره أن معاينات المشاركة الاجتماعية
 * وعنوان الـAPI المُعلَن يتعطّلان بصمت متى زال نطاق المعاينة، ويشيران
 * لبيئة معاينة حتى في الإنتاج.
 *
 * يُقرأ من VITE_SITE_URL وقت البناء ليعمل على الخادم والعميل معاً
 * (process.env غير متاح في حزمة العميل). التراجع يحفظ السلوك القائم
 * لئلا ينكسر شيء قبل ضبط المتغيّر، لكنه ليس بديلاً عن ضبطه في الإنتاج.
 */
const FALLBACK = "https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app";

function normalize(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return FALLBACK;
  try {
    // نأخذ الأصل فقط: أي مسار أو شرطة ختامية تُنتج روابط مزدوجة الشرطات
    return new URL(v).origin;
  } catch {
    return FALLBACK;
  }
}

export const SITE_URL = normalize(
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SITE_URL,
);

/** يبني رابطاً مطلقاً من مسار نسبي. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** هل ما زلنا على نطاق المعاينة؟ يُستخدَم في فحص الجاهزية. */
export function isPreviewOrigin(): boolean {
  return SITE_URL === FALLBACK || SITE_URL.includes("lovable.app");
}

export const OG_IMAGE = absoluteUrl("/og-image.jpg");
