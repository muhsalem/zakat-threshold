import { describe, it, expect } from "vitest";
import { SITE_URL, absoluteUrl, OG_IMAGE } from "./siteUrl";

describe("siteUrl", () => {
  it("الأصل بلا شرطة ختامية", () => {
    expect(SITE_URL).toMatch(/^https?:\/\//);
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  it("absoluteUrl لا يُنتج شرطة مزدوجة أياً كانت صيغة المسار", () => {
    expect(absoluteUrl("/a")).toBe(`${SITE_URL}/a`);
    expect(absoluteUrl("a")).toBe(`${SITE_URL}/a`);
    expect(absoluteUrl("/a")).not.toContain("//a");
  });

  it("OG_IMAGE رابط مطلق صالح", () => {
    expect(() => new URL(OG_IMAGE)).not.toThrow();
    expect(OG_IMAGE.endsWith("/og-image.jpg")).toBe(true);
  });
});
