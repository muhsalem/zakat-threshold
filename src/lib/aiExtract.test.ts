import { describe, it, expect } from "vitest";
import {
  aiItemsToClassifiedRows,
  lowConfidenceLabels,
  AI_CATEGORY_TO_ZAKAT,
  type AiExtractedItem,
} from "./aiExtract";
import { computeZakatFromTrialBalance } from "./erp/zakatMapping";
import { runShariaComplianceReview } from "./shariaAudit";

const AI_ITEMS: AiExtractedItem[] = [
  { category: "cash", label: "النقد لدى البنوك", amount: 500000, zakatable: true, confidence: 0.97 },
  { category: "murabaha", label: "ذمم مرابحة", amount: 200000, zakatable: true, confidence: 0.9 },
  { category: "equity_trading", label: "أسهم للمتاجرة", amount: 150000, zakatable: true, confidence: 0.85 },
  { category: "fixed_assets_use", label: "مبانٍ ومعدات", amount: 800000, zakatable: false, confidence: 0.95 },
  { category: "current_payables", label: "التزامات مستحقة", amount: 250000, zakatable: false, confidence: 0.9 },
  { category: "unclassified", label: "بند غامض", amount: 30000, zakatable: false, confidence: 0.4, note: "غير واضح" },
];

describe("aiItemsToClassifiedRows() — محوّل مخرجات الذكاء الاصطناعي", () => {
  const rows = aiItemsToClassifiedRows(AI_ITEMS);

  it("يحوّل فئات AAOIFI التفصيلية إلى الفئات الموحّدة", () => {
    expect(rows[0].category).toBe("cash");
    expect(rows[1].category).toBe("receivables"); // murabaha
    expect(rows[2].category).toBe("investments"); // equity_trading
    expect(rows[3].category).toBe("fixed_assets");
    expect(rows[4].category).toBe("current_liabilities");
  });

  it("الالتزامات تُقلب إشارتها سالبة", () => {
    expect(rows[4].balance).toBe(-250000);
    expect(rows[0].balance).toBe(500000);
  });

  it("unclassified يُعلَّم كغير مصنف (source=default) لفحص الحوكمة", () => {
    expect(rows[5].source).toBe("default");
    expect(rows[0].source).toBe("provider_rule");
  });

  it("فئة مجهولة تماماً تُستبعد بأمان", () => {
    const r = aiItemsToClassifiedRows([
      { category: "weird_cat", label: "x", amount: 10, zakatable: false, confidence: 1 },
    ]);
    expect(r[0].category).toBe("excluded");
    expect(r[0].source).toBe("default");
  });

  it("كل فئات الذكاء الاصطناعي المعلنة لها تحويل", () => {
    for (const cat of Object.keys(AI_CATEGORY_TO_ZAKAT)) {
      expect(AI_CATEGORY_TO_ZAKAT[cat]).toBeTruthy();
    }
  });
});

describe("مسار الذكاء الاصطناعي — حساب + مراجعة شرعية كاملة", () => {
  const rows = aiItemsToClassifiedRows(AI_ITEMS);
  const calc = computeZakatFromTrialBalance(rows, { calendar: "hijri" });

  it("الوعاء = (نقد + مرابحة + أسهم) − التزامات", () => {
    // 500000 + 200000 + 150000 = 850000 − 250000 = 600000
    expect(calc.zakatBase).toBe(600000);
    expect(calc.zakatDue).toBe(15000);
  });

  it("المراجعة ترصد البنود منخفضة الثقة كتنبيه حوكمة", () => {
    const review = runShariaComplianceReview({
      rows,
      computation: calc,
      hawlComplete: null,
      calendar: "hijri",
      lowConfidence: lowConfidenceLabels(AI_ITEMS),
    });
    const f = review.findings.find((x) => x.id === "low_confidence_items");
    expect(f?.severity).toBe("warning");
    expect(f?.accounts?.[0]).toContain("بند غامض");
    expect(f?.detail).toContain("مراجعة بشرية");
  });

  it("lowConfidenceLabels يلتقط ما دون 0.6 فقط", () => {
    const low = lowConfidenceLabels(AI_ITEMS);
    expect(low).toHaveLength(1);
    expect(low[0]).toContain("40%");
  });

  it("بند ربوي مستخرج آلياً يُكشف في المراجعة", () => {
    const withRiba = aiItemsToClassifiedRows([
      ...AI_ITEMS,
      { category: "unclassified", label: "فوائد بنكية دائنة", amount: 12000, zakatable: false, confidence: 0.7 },
    ]);
    const review = runShariaComplianceReview({
      rows: withRiba,
      computation: computeZakatFromTrialBalance(withRiba, { calendar: "hijri" }),
      hawlComplete: null,
      calendar: "hijri",
    });
    expect(review.findings.find((x) => x.id === "riba_detected")?.severity).toBe("violation");
  });
});
