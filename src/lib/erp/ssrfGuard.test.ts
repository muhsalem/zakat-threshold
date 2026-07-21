import { describe, it, expect } from "vitest";
import { checkUrlStructure } from "./ssrfGuard";

describe("checkUrlStructure() — الفحص البنيوي (بلا DNS)", () => {
  it("يرفض localhost وأسماءه المرادفة", () => {
    expect(checkUrlStructure("http://localhost:8069").ok).toBe(false);
    expect(checkUrlStructure("http://LOCALHOST/jsonrpc").ok).toBe(false);
    expect(checkUrlStructure("http://0.0.0.0/api").ok).toBe(false);
  });

  it("يرفض عناوين IPv4 الخاصة والمحجوزة", () => {
    expect(checkUrlStructure("http://127.0.0.1/").ok).toBe(false);
    expect(checkUrlStructure("http://10.0.0.5/odoo").ok).toBe(false);
    expect(checkUrlStructure("http://192.168.1.1/").ok).toBe(false);
    expect(checkUrlStructure("http://172.16.0.1/").ok).toBe(false);
    // بيانات وصفية سحابية حساسة (AWS/GCP/Azure)
    expect(checkUrlStructure("http://169.254.169.254/latest/meta-data/").ok).toBe(false);
  });

  it("يرفض عناوين IPv6 الخاصة", () => {
    expect(checkUrlStructure("http://[::1]/").ok).toBe(false);
    expect(checkUrlStructure("http://[fe80::1]/").ok).toBe(false);
  });

  it("يرفض نطاقات .local و.internal والبروتوكولات غير http/https", () => {
    expect(checkUrlStructure("http://erp.local/").ok).toBe(false);
    expect(checkUrlStructure("http://db.internal/").ok).toBe(false);
    expect(checkUrlStructure("file:///etc/passwd").ok).toBe(false);
    expect(checkUrlStructure("ftp://example.com/").ok).toBe(false);
  });

  it("يقبل نطاقات ERP عامة مشروعة", () => {
    expect(checkUrlStructure("https://demo.odoo.com").ok).toBe(true);
    expect(checkUrlStructure("https://mycompany.odoo.com").ok).toBe(true);
    expect(checkUrlStructure("https://sandbox.api.sap.com").ok).toBe(true);
    expect(checkUrlStructure("https://myXXXXXX.s4hana.cloud.sap").ok).toBe(true);
  });

  it("يرفض روابط غير صالحة بلا انهيار", () => {
    expect(checkUrlStructure("not a url").ok).toBe(false);
    expect(checkUrlStructure("").ok).toBe(false);
  });

  it("عنوان IP عام صريح يُقبل", () => {
    expect(checkUrlStructure("http://8.8.8.8/").ok).toBe(true);
  });
});
