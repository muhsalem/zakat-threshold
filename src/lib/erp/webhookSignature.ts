/**
 * تحقق توقيع HMAC-SHA256 لويبهوك ERP عبر Web Crypto.
 *
 * كان webhook.ts يستورد createHmac وtimingSafeEqual من "node:crypto" في أعلى
 * الملف. routeTree.gen.ts يستورد كل ملفات المسارات في حزمة العميل أيضاً؛
 * تُجرَّد كتلة server: منها لكن الاستيراد يبقى، فيُخرِجه Vite للمتصفح ويرمي
 * عند التقييم: خطأ غير مُلتقَط على كل صفحة عامة، لا على مسار الويبهوك وحده.
 *
 * Web Crypto متاح في المتصفح وNode ≥ 20 وCloudflare Workers بلا أعلام، فلا
 * يضرّ وجود هذه الوحدة في حزمة العميل. وcrypto.subtle.verify يقارن بزمن
 * ثابت بالمواصفة، فيغني عن timingSafeEqual.
 */

const enc = new TextEncoder();

/** يفكّ سلسلة hex إلى بايتات، أو null إن كانت مشوَّهة (طول فردي، محارف غير hex، فارغة). */
export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (typeof hex !== "string" || hex.length === 0 || hex.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
  // ArrayBuffer صريح: TS ≥ 5.7 يميّز Uint8Array<ArrayBufferLike> عن BufferSource
  // الذي يطلبه crypto.subtle.verify.
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function importHmacKey(secret: string, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

/** يولّد توقيع HMAC-SHA256 كسلسلة hex — لمن يُنشئ التوقيع (اختبارات، عملاء). */
export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await importHmacKey(secret, ["sign"]);
  return bytesToHex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/**
 * يتحقق من توقيع hex مقابل الرسالة والسرّ. يرجع false لأي توقيع مشوَّه أو
 * بطول غير 32 بايت بدل الرمي — المُرسِل غير موثوق ولا نمنحه معلومة عن سبب الرفض.
 */
export async function verifyHmacSha256Hex(
  secret: string,
  message: string,
  signatureHex: string,
): Promise<boolean> {
  const sig = hexToBytes(signatureHex);
  if (!sig || sig.length !== 32) return false;
  const key = await importHmacKey(secret, ["verify"]);
  return crypto.subtle.verify("HMAC", key, sig, enc.encode(message));
}
