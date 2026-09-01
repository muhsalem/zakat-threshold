/**
 * مقارنة بايتات بزمن ثابت بلا node:crypto.
 *
 * timingSafeEqual من "node:crypto" تُسحب إلى حزمة العميل حين يستوردها ملف
 * .server.ts يستورده ملف مسار في أعلاه (routeTree.gen.ts يحمّل كل المسارات في
 * العميل)، فترمي في المتصفح عند التقييم. هذه الدالة JavaScript خالص وتعمل
 * في كل بيئة.
 *
 * الزمن لا يعتمد على موضع أول اختلاف: نجمع XOR على كامل الطول دائماً. وعند
 * اختلاف الطولين نُكمل حلقة بطول المُدخل مقابل نفسه كي لا يكشف التوقيت طول
 * السرّ، ثم نرفض.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    let sink = 0;
    for (let i = 0; i < a.length; i++) sink |= a[i] ^ a[i];
    return sink === 0 && false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

const enc = new TextEncoder();

/** مقارنة نصّين بزمن ثابت — تُرمَّز UTF-8 ثم تُقارَن بايتاً بايتاً. */
export function constantTimeEqualStrings(a: string, b: string): boolean {
  return constantTimeEqual(enc.encode(a), enc.encode(b));
}
