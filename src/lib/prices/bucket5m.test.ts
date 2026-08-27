import { describe, it, expect } from "vitest";
import { bucket5m } from "./bucket5m";

describe("bucket5m", () => {
  it("يُرجع بداية الشريحة لا لحظة الرصد", () => {
    expect(bucket5m(new Date("2026-08-13T10:07:43.219Z"))).toBe("2026-08-13T10:05:00.000Z");
  });

  it("كل اللحظات داخل الشريحة الواحدة تعطي نفس البصمة", () => {
    const same = [
      "2026-08-13T10:05:00.000Z",
      "2026-08-13T10:06:30.000Z",
      "2026-08-13T10:09:59.999Z",
    ].map((t) => bucket5m(new Date(t)));
    expect(new Set(same).size).toBe(1);
  });

  it("أول لحظة في الشريحة التالية تعطي بصمة مختلفة", () => {
    expect(bucket5m(new Date("2026-08-13T10:09:59.999Z"))).not.toBe(
      bucket5m(new Date("2026-08-13T10:10:00.000Z")),
    );
  });

  it("الشرائح على حدود خمس دقائق دائماً", () => {
    for (let i = 0; i < 288; i++) {
      const b = new Date(bucket5m(new Date(Date.UTC(2026, 7, 13) + i * 5 * 60_000 + 137_000)));
      expect(b.getUTCMinutes() % 5).toBe(0);
      expect(b.getUTCSeconds()).toBe(0);
      expect(b.getUTCMilliseconds()).toBe(0);
    }
  });

  it("يعبر حدّ الساعة واليوم بلا انزلاق", () => {
    expect(bucket5m(new Date("2026-08-13T23:59:59.999Z"))).toBe("2026-08-13T23:55:00.000Z");
    expect(bucket5m(new Date("2026-08-14T00:00:00.000Z"))).toBe("2026-08-14T00:00:00.000Z");
  });

  it("يوم كامل = 288 شريحة متمايزة (تطابق cron */5)", () => {
    const s = new Set<string>();
    for (let i = 0; i < 288; i++) s.add(bucket5m(new Date(Date.UTC(2026, 7, 13) + i * 5 * 60_000)));
    expect(s.size).toBe(288);
  });
});
