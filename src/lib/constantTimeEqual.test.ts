import { describe, it, expect } from "vitest";
import { constantTimeEqual, constantTimeEqualStrings } from "./constantTimeEqual";

const u = (...n: number[]) => new Uint8Array(n);

describe("constantTimeEqual", () => {
  it("متساويان", () => {
    expect(constantTimeEqual(u(1, 2, 3), u(1, 2, 3))).toBe(true);
    expect(constantTimeEqual(u(), u())).toBe(true);
  });

  it("اختلاف في أي موضع", () => {
    expect(constantTimeEqual(u(1, 2, 3), u(9, 2, 3))).toBe(false);
    expect(constantTimeEqual(u(1, 2, 3), u(1, 2, 9))).toBe(false);
  });

  it("اختلاف الطول يرفض دائماً", () => {
    expect(constantTimeEqual(u(1, 2), u(1, 2, 3))).toBe(false);
    expect(constantTimeEqual(u(1, 2, 3), u(1, 2))).toBe(false);
    expect(constantTimeEqual(u(), u(0))).toBe(false);
  });
});

describe("constantTimeEqualStrings", () => {
  it("يطابق النصوص العربية وغيرها بالبايتات", () => {
    expect(constantTimeEqualStrings("سرّ", "سرّ")).toBe(true);
    expect(constantTimeEqualStrings("سرّ", "سر")).toBe(false);
    expect(constantTimeEqualStrings("abc", "abd")).toBe(false);
  });

  it("البادئة المشتركة لا تكفي", () => {
    expect(constantTimeEqualStrings("secret", "secret-longer")).toBe(false);
    expect(constantTimeEqualStrings("", "x")).toBe(false);
  });
});
