import { describe, it, expect } from "vitest";
import { freshness, overall, httpStatusFor } from "./checks";

const NOW = Date.parse("2026-08-13T12:00:00.000Z");
const opts = { degradedAfterSec: 900, downAfterSec: 3600, label: "الأسعار", now: NOW };

describe("freshness", () => {
  it("حديث = ok", () => {
    const r = freshness("2026-08-13T11:58:00.000Z", opts);
    expect(r.status).toBe("ok");
    expect(r.age_seconds).toBe(120);
  });

  it("تجاوز عتبة التحذير = degraded", () => {
    expect(freshness("2026-08-13T11:40:00.000Z", opts).status).toBe("degraded");
  });

  it("تجاوز عتبة السقوط = down", () => {
    expect(freshness("2026-08-13T10:00:00.000Z", opts).status).toBe("down");
  });

  it("غياب السجل كلياً = down لا ok", () => {
    expect(freshness(null, opts).status).toBe("down");
    expect(freshness(undefined, opts).status).toBe("down");
  });

  it("طابع زمني فاسد = down لا انهيار", () => {
    const r = freshness("ليس تاريخاً", opts);
    expect(r.status).toBe("down");
    expect(r.age_seconds).toBeNull();
  });

  it("طابع مستقبلي لا يعطي عمراً سالباً", () => {
    expect(freshness("2026-08-13T12:05:00.000Z", opts).age_seconds).toBe(0);
  });

  it("العتبة شاملة: عند الحد بالضبط تتحقق الحالة الأشد", () => {
    expect(freshness("2026-08-13T11:45:00.000Z", opts).status).toBe("degraded");
    expect(freshness("2026-08-13T11:00:00.000Z", opts).status).toBe("down");
  });
});

describe("overall", () => {
  it("أسوأ حالة تحكم", () => {
    expect(overall(["ok", "ok"])).toBe("ok");
    expect(overall(["ok", "degraded"])).toBe("degraded");
    expect(overall(["ok", "degraded", "down"])).toBe("down");
  });
  it("لا فحوص = ok", () => expect(overall([])).toBe("ok"));
});

describe("httpStatusFor", () => {
  it("down يعطي 503 لتلتقطه المراقبة بلا قراءة الجسم", () => {
    expect(httpStatusFor("down")).toBe(503);
    expect(httpStatusFor("ok")).toBe(200);
    expect(httpStatusFor("degraded")).toBe(200);
  });
});
