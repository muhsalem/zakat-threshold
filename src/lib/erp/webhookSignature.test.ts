import { describe, it, expect } from "vitest";
import { hexToBytes, hmacSha256Hex, verifyHmacSha256Hex } from "./webhookSignature";

describe("hmacSha256Hex — متجه RFC 4231", () => {
  it("الحالة 2: المفتاح Jefe", async () => {
    const out = await hmacSha256Hex("Jefe", "what do ya want for nothing?");
    expect(out).toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
  });
});

describe("verifyHmacSha256Hex", () => {
  const secret = "s3cret";
  const msg = '1725148800000.{"type":"invoice.created"}';

  it("يقبل التوقيع الصحيح", async () => {
    const sig = await hmacSha256Hex(secret, msg);
    expect(await verifyHmacSha256Hex(secret, msg, sig)).toBe(true);
  });

  it("يقبل hex بأحرف كبيرة", async () => {
    const sig = (await hmacSha256Hex(secret, msg)).toUpperCase();
    expect(await verifyHmacSha256Hex(secret, msg, sig)).toBe(true);
  });

  it("يرفض رسالة معدَّلة", async () => {
    const sig = await hmacSha256Hex(secret, msg);
    expect(await verifyHmacSha256Hex(secret, msg + " ", sig)).toBe(false);
  });

  it("يرفض سرّاً مختلفاً", async () => {
    const sig = await hmacSha256Hex(secret, msg);
    expect(await verifyHmacSha256Hex("other", msg, sig)).toBe(false);
  });

  it("يرفض توقيعاً مقلوب بايت واحد", async () => {
    const sig = await hmacSha256Hex(secret, msg);
    const flipped = (sig[0] === "0" ? "1" : "0") + sig.slice(1);
    expect(await verifyHmacSha256Hex(secret, msg, flipped)).toBe(false);
  });

  it("يرفض التوقيعات المشوَّهة دون رمي", async () => {
    for (const bad of ["", "abc", "zz".repeat(32), "ab".repeat(31), "ab".repeat(33)]) {
      expect(await verifyHmacSha256Hex(secret, msg, bad)).toBe(false);
    }
  });
});

describe("hexToBytes", () => {
  it("يفكّ hex صالحاً", () => {
    expect(Array.from(hexToBytes("00ff10")!)).toEqual([0, 255, 16]);
  });

  it("null للطول الفردي وغير hex والفارغ", () => {
    expect(hexToBytes("abc")).toBeNull();
    expect(hexToBytes("gg")).toBeNull();
    expect(hexToBytes("")).toBeNull();
  });
});
