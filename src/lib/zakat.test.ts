import { describe, it, expect } from "vitest";
import {
  ZAKAT_RATE,
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
  num,
  camelZakat,
  cowZakat,
  sheepZakat,
  karatToPure24,
  gregorianToHijri,
  checkHawl,
  HAWL_DAYS_HIJRI,
  CROPS_RATE_NATURAL,
  CROPS_RATE_IRRIGATED,
} from "./zakat";

describe("ثوابت الزكاة", () => {
  it("معدل الزكاة 2.5%", () => expect(ZAKAT_RATE).toBe(0.025));
  it("نصاب الذهب 85 جرام", () => expect(GOLD_NISAB_GRAMS).toBe(85));
  it("نصاب الفضة 595 جرام", () => expect(SILVER_NISAB_GRAMS).toBe(595));
  it("معدل الزروع بالري الطبيعي 10%", () => expect(CROPS_RATE_NATURAL).toBe(0.1));
  it("معدل الزروع بالري المكلف 5%", () => expect(CROPS_RATE_IRRIGATED).toBe(0.05));
});

describe("num()", () => {
  it("يحوّل النص لرقم", () => expect(num("123.5")).toBe(123.5));
  it("يرجع 0 للقيم غير الصالحة", () => {
    expect(num("abc")).toBe(0);
    expect(num("")).toBe(0);
    expect(num(-5)).toBe(0);
    expect(num(NaN)).toBe(0);
  });
});

describe("karatToPure24()", () => {
  it("يحوّل عيار 21 إلى 24", () => {
    expect(karatToPure24(100, 21)).toBeCloseTo(87.5);
  });
  it("عيار 24 يساوي نفسه", () => expect(karatToPure24(50, 24)).toBe(50));
  it("صفر جرام = صفر", () => expect(karatToPure24(0, 21)).toBe(0));
});

describe("camelZakat() — زكاة الإبل", () => {
  it("أقل من 5 لا زكاة", () => expect(camelZakat(4)).toBe("لا زكاة"));
  it("5 إبل = شاة", () => expect(camelZakat(5)).toBe("شاة واحدة"));
  it("25 = بنت مخاض", () => expect(camelZakat(25)).toContain("بنت مخاض"));
  it("46 = حِقَّة", () => expect(camelZakat(46)).toContain("حِقَّة"));
  it("61 = جَذَعة", () => expect(camelZakat(61)).toContain("جَذَعة"));
});

describe("cowZakat() — زكاة البقر", () => {
  it("أقل من 30 لا زكاة", () => expect(cowZakat(29)).toBe("لا زكاة"));
  it("30 = تبيع", () => expect(cowZakat(30)).toContain("تبيع"));
  it("40 = مسنّة", () => expect(cowZakat(40)).toContain("مسنّة"));
});

describe("sheepZakat() — زكاة الغنم", () => {
  it("أقل من 40 لا زكاة", () => expect(sheepZakat(39)).toBe("لا زكاة"));
  it("40 = شاة واحدة", () => expect(sheepZakat(40)).toBe("شاة واحدة"));
  it("121 = شاتان", () => expect(sheepZakat(121)).toBe("شاتان"));
  it("400 = أربع شياه", () => expect(sheepZakat(400)).toBe("أربع شياه"));
});

describe("gregorianToHijri()", () => {
  it("يحوّل تاريخ معروف", () => {
    const h = gregorianToHijri(2024, 1, 1);
    expect(h.hy).toBeGreaterThan(1440);
    expect(h.hm).toBeGreaterThanOrEqual(1);
    expect(h.hm).toBeLessThanOrEqual(12);
  });
});

describe("checkHawl() — شرط الحول", () => {
  it("يرجع null للتاريخ الفارغ", () => expect(checkHawl("")).toBeNull());
  it("حول لم يكتمل", () => {
    const today = new Date("2026-06-01");
    const start = new Date(today);
    start.setDate(start.getDate() - 100);
    const r = checkHawl(start.toISOString(), today);
    expect(r?.hawlComplete).toBe(false);
    expect(r?.daysRemaining).toBe(HAWL_DAYS_HIJRI - 100);
  });
  it("حول مكتمل", () => {
    const today = new Date("2026-06-01");
    const start = new Date(today);
    start.setDate(start.getDate() - 400);
    const r = checkHawl(start.toISOString(), today);
    expect(r?.hawlComplete).toBe(true);
    expect(r?.daysRemaining).toBe(0);
  });
});

describe("حسابات تكاملية", () => {
  it("زكاة 100,000 = 2,500", () => {
    expect(100000 * ZAKAT_RATE).toBe(2500);
  });
  it("نصاب الذهب بسعر 5000 = 425,000", () => {
    expect(GOLD_NISAB_GRAMS * 5000).toBe(425000);
  });
});
