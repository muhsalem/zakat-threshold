import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rateLimit, __setRateLimitKvForTests } from "./rate-limit.server";

function req(ip = "1.2.3.4"): Request {
  return new Request("https://example.com/api", { headers: { "cf-connecting-ip": ip } });
}

describe("rateLimit() — التراجع للذاكرة المحلية (بلا KV مربوط)", () => {
  it("يسمح ضمن الحد ويرفض بعد تجاوزه", async () => {
    const opts = { key: "test-mem", limit: 3, windowMs: 60_000 };
    const r1 = await rateLimit(req("9.9.9.1"), opts);
    const r2 = await rateLimit(req("9.9.9.1"), opts);
    const r3 = await rateLimit(req("9.9.9.1"), opts);
    const r4 = await rateLimit(req("9.9.9.1"), opts);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
    expect(r4.ok).toBe(false);
    if (!r4.ok) expect(r4.retryAfter).toBeGreaterThan(0);
  });

  it("عناوين IP مختلفة معزولة عن بعضها", async () => {
    const opts = { key: "test-isolation", limit: 1, windowMs: 60_000 };
    const a = await rateLimit(req("5.5.5.1"), opts);
    const b = await rateLimit(req("5.5.5.2"), opts);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });

  it("مفاتيح (key) مختلفة لنفس IP معزولة عن بعضها", async () => {
    const a = await rateLimit(req("6.6.6.6"), { key: "route-a", limit: 1, windowMs: 60_000 });
    const b = await rateLimit(req("6.6.6.6"), { key: "route-b", limit: 1, windowMs: 60_000 });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });
});

describe("rateLimit() — مسار Cloudflare KV الموزَّع", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    __setRateLimitKvForTests({
      get: async (k: string) => store.get(k) ?? null,
      put: async (k: string, v: string) => {
        store.set(k, v);
      },
    });
  });
  afterEach(() => {
    __setRateLimitKvForTests(null);
  });

  it("يستخدم KV عند توفره ويطبّق الحد عبره", async () => {
    const opts = { key: "kv-route", limit: 2, windowMs: 60_000 };
    const r1 = await rateLimit(req("7.7.7.7"), opts);
    const r2 = await rateLimit(req("7.7.7.7"), opts);
    const r3 = await rateLimit(req("7.7.7.7"), opts);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(false);
    // الحالة فعلاً محفوظة في KV لا في ذاكرة العملية
    expect(store.size).toBeGreaterThan(0);
  });

  it("فشل KV يتراجع تلقائياً للذاكرة بلا رمي خطأ للمستخدم", async () => {
    __setRateLimitKvForTests({
      get: async () => {
        throw new Error("kv unavailable");
      },
      put: async () => {
        throw new Error("kv unavailable");
      },
    });
    const r = await rateLimit(req("8.8.8.1"), { key: "kv-fail", limit: 5, windowMs: 60_000 });
    expect(r.ok).toBe(true);
  });
});
