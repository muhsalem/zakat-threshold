import { describe, it, expect } from "vitest";
import { renderInline, safeHref } from "./renderInline";

describe("renderInline — التهريب", () => {
  it("يحوّل الوسوم الخام إلى نص", () => {
    expect(renderInline("<script>alert(1)</script>")).not.toContain("<script>");
    expect(renderInline("<script>x</script>")).toContain("&lt;script&gt;");
  });

  it("يهرّب علامة الاقتباس فيمنع الخروج من السمة", () => {
    const out = renderInline('[x](a" onmouseover="alert(1))');
    expect(out).not.toMatch(/onmouseover=/);
  });

  it("يبقي العريض يعمل", () => {
    expect(renderInline("**قوي**")).toBe("<strong>قوي</strong>");
  });

  it("يبقي الروابط السليمة تعمل", () => {
    const out = renderInline("[زكاة](https://example.com/a)");
    expect(out).toContain('href="https://example.com/a"');
    expect(out).toContain(">زكاة<");
  });
});

describe("safeHref — المخطّطات", () => {
  it("يرفض المخطّطات المنفِّذة", () => {
    for (const u of ["javascript:alert(1)", "  JavaScript:alert(1)", "data:text/html,<b>", "vbscript:x", "file:///etc"]) {
      expect(safeHref(u)).toBe("#");
    }
  });

  it("يقبل http/https/mailto والنسبي والمرساة", () => {
    expect(safeHref("https://a.com")).toBe("https://a.com");
    expect(safeHref("http://a.com")).toBe("http://a.com");
    expect(safeHref("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(safeHref("/zakat")).toBe("/zakat");
    expect(safeHref("#s")).toBe("#s");
    expect(safeHref("./x")).toBe("./x");
  });

  it("يقبل النطاق المجرّد ويرفض ما سواه", () => {
    expect(safeHref("example.com/a")).toBe("example.com/a");
    expect(safeHref("weird:thing")).toBe("#");
  });

  it("لا يمرّ javascript عبر مسافات أو حالة أحرف", () => {
    expect(renderInline("[x](javascript:alert(1))")).toContain('href="#"');
    expect(renderInline("[x](JAVASCRIPT:alert(1))")).toContain('href="#"');
  });
});
