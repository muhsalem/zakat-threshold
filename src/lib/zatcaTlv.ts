// ZATCA Phase-1 TLV QR encoder (Tag-Length-Value, Base64)
// Reference: ZATCA E-Invoicing — Simplified Tax Invoice QR
function tlv(tag: number, value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  const out = new Uint8Array(2 + bytes.length);
  out[0] = tag;
  out[1] = bytes.length;
  out.set(bytes, 2);
  return out;
}

function concat(arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return typeof btoa !== "undefined" ? btoa(bin) : Buffer.from(bytes).toString("base64");
}

/**
 * يُولِّد سلسلة QR بصيغة TLV-Base64 المعتمدة من ZATCA.
 * يستخدم للإفصاح عن الزكاة كفاتورة استرشادية.
 */
export function buildZatcaTlvQr(opts: {
  sellerName: string; // اسم الجهة / المنصة
  vatNumber: string; // رقم VAT (أو معرّف بديل)
  timestampIso: string; // ISO 8601
  invoiceTotal: number; // الإجمالي شامل
  vatTotal: number; // ضريبة القيمة المضافة (0 للزكاة)
}): string {
  const bytes = concat([
    tlv(1, opts.sellerName),
    tlv(2, opts.vatNumber),
    tlv(3, opts.timestampIso),
    tlv(4, opts.invoiceTotal.toFixed(2)),
    tlv(5, opts.vatTotal.toFixed(2)),
  ]);
  return toBase64(bytes);
}
