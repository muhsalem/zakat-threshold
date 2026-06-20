import { createServerFn } from "@tanstack/react-start";
import { createHmac, timingSafeEqual } from "node:crypto";

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

export const signReport = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; hash: string; issued: string }) => d)
  .handler(async ({ data }) => {
    const mac = createHmac("sha256", getKey()).update(canonical(data)).digest();
    return { sig: b64url(mac).slice(0, 22) };
  });

export const verifyReport = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; hash: string; issued: string; sig: string }) => d)
  .handler(async ({ data }) => {
    if (!data.id || !data.hash || !data.issued || !data.sig) return { valid: false };
    const mac = createHmac("sha256", getKey()).update(canonical(data)).digest();
    const expected = b64url(mac).slice(0, 22);
    const a = Buffer.from(expected);
    const b = Buffer.from(data.sig);
    const valid = a.length === b.length && timingSafeEqual(a, b);
    return { valid };
  });
