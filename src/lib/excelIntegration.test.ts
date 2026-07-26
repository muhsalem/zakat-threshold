import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildReportWorkbook } from "./exportExcel";
import type { PrintReportData } from "@/components/zakat/PrintReport";

describe("Excel Integration & Import/Export Engine", () => {
  it("يقوم بتوليد ملف Excel كامل متعدد الأوراق (Multi-sheet XLSX)", () => {
    const mockReportData = {
      name: "شركة النجاح المحدودة",
      countryCode: "SA",
      currencyName: "ر.س",
      effectiveRate: 0.025,
      monetaryGross: 1000000,
      debts: 200000,
      monetaryBase: 800000,
      moneyNisab: 25000,
      totalZakat: 20000,
      rows: [
        { label: "الأرصدة النقدية في البنوك", gross: 500000, nisab: 25000, eligible: true, zakat: 12500 },
        { label: "عروض التجارة (المخزون)", gross: 500000, nisab: 25000, eligible: true, zakat: 12500 },
      ],
      calendarBasis: "hijri",
    };

    const wb = buildReportWorkbook(mockReportData as unknown as PrintReportData);
    expect(wb.SheetNames).toContain("الملخص");
    expect(wb.SheetNames).toContain("تفاصيل البنود");

    // محاكاة تحويل الملف إلى Buffer ثم إعادة قراءته للتأكد من السلامة
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const parsedWb = XLSX.read(buffer, { type: "buffer" });

    expect(parsedWb.SheetNames.length).toBeGreaterThanOrEqual(2);
    const summarySheet = XLSX.utils.sheet_to_json(parsedWb.Sheets["الملخص"], { header: 1 });
    expect(summarySheet.length).toBeGreaterThan(0);
  });

  it("يقرأ ويستورد ميزان المراجعة من ملف Excel (Excel Trial Balance Parsing)", () => {
    // إنشاء ملف Excel وهمي يمثل ميزان المراجعة لشركة
    const trialBalanceRows = [
      ["رمز الحساب", "اسم الحساب", "نوع الحساب", "رصيد دائن", "رصيد مدين"],
      ["1010", "البنك الأهلي - حساب جاري", "Cash", 0, 450000],
      ["1020", "مخزون بضائع المتاجرة", "Inventory", 0, 300000],
      ["1030", "عملاء وذمم مدينة", "Receivables", 0, 150000],
      ["2010", "موردون وديون قصيرة", "Liabilities", 200000, 0],
    ];

    const ws = XLSX.utils.aoa_to_sheet(trialBalanceRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TrialBalance");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const importedWb = XLSX.read(buffer, { type: "buffer" });
    const parsedData = XLSX.utils.sheet_to_json<any>(importedWb.Sheets["TrialBalance"]);

    expect(parsedData.length).toBe(4);
    expect(parsedData[0]["اسم الحساب"]).toBe("البنك الأهلي - حساب جاري");

    // حساب الوعاء الزكوي من بيانات الإكسيل المستوردة
    const cash = parsedData.find((r) => r["نوع الحساب"] === "Cash")["رصيد مدين"];
    const inventory = parsedData.find((r) => r["نوع الحساب"] === "Inventory")["رصيد مدين"];
    const receivables = parsedData.find((r) => r["نوع الحساب"] === "Receivables")["رصيد مدين"];
    const liabilities = parsedData.find((r) => r["نوع الحساب"] === "Liabilities")["رصيد دائن"];

    const zakatBase = cash + inventory + receivables - liabilities;
    const zakatDue = zakatBase * 0.025;

    expect(zakatBase).toBe(700000);
    expect(zakatDue).toBe(17500);
  });
});
