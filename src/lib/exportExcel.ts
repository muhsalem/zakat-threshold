import * as XLSX from "xlsx";
import type { PrintReportData } from "@/components/zakat/PrintReport";

/** تصدير تقرير الزكاة إلى ملف Excel (.xlsx) متعدد الأوراق */
export function downloadReportExcel(data: PrintReportData, filename = "zakat-report.xlsx") {
  const wb = XLSX.utils.book_new();

  // ورقة 1: ملخص المُزكِّي
  const summary = [
    ["تقرير حساب الزكاة"],
    [],
    ["المُزكِّي", data.name || "—"],
    ["المهنة / النشاط", data.profession || "—"],
    ["الدولة", data.countryCode],
    ["العملة", data.currencyName],
    ["التاريخ", new Date().toLocaleDateString("ar-EG")],
    ["أساس النصاب", data.nisabBasis ?? "beneficial"],
    ["أساس التقييم", data.valuationBasis ?? "market"],
    ["التقويم", data.calendarBasis === "hijri" ? "هجري" : "ميلادي"],
    ["معدّل الزكاة", `${(data.effectiveRate * 100).toFixed(3)}%`],
    [],
    ["إجمالي الأصول النقدية", data.monetaryGross],
    ["الديون / الخصوم", data.debts],
    ["الوعاء الزكوي الصافي", data.monetaryBase],
    ["النصاب النقدي المعتمد", data.moneyNisab],
    ["إجمالي الزكاة المستحقة", data.totalZakat],
    ["زكاة السنة السابقة", data.previousYearZakat || "—"],
    [],
    ["اكتمال الحول", data.hawlComplete === null ? "—" : data.hawlComplete ? "نعم" : "لا"],
    ["تاريخ بداية الحول", data.hawlDate || "—"],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1["!cols"] = [{ wch: 35 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws1, "الملخص");

  // ورقة 2: تفاصيل بنود الزكاة
  const rowsHeader = [["البند", "القيمة الإجمالية", "النصاب", "بلغ النصاب؟", "الزكاة المستحقة"]];
  const rowsBody = data.rows.map(r => [
    r.label,
    r.gross,
    r.nisab ?? "—",
    r.eligible ? "نعم" : "لا",
    r.zakat,
  ]);
  rowsBody.push(["—", "", "", "الإجمالي", data.totalZakat]);
  const ws2 = XLSX.utils.aoa_to_sheet([...rowsHeader, ...rowsBody]);
  ws2["!cols"] = [{ wch: 50 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws2, "تفاصيل البنود");

  // ورقة 3: الأنعام (إن وُجدت)
  if (data.livestock?.show) {
    const ls = [
      ["النوع", "العدد"],
      ["الإبل", data.livestock.camels],
      ["البقر/الجاموس", data.livestock.cows],
      ["الغنم/المعز", data.livestock.sheep],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(ls);
    ws3["!cols"] = [{ wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws3, "الأنعام");
  }

  // ورقة 4: المراجعة الشرعية / المحاسبية
  const review = [
    ["المراجع", data.accountantName || "—"],
    ["رقم الترخيص", data.accountantLicense || "—"],
    ["نوع الرأي", data.opinionType],
    ["تمهيد", data.accountantPreamble || "—"],
    ["الرأي", data.accountantOpinion || "—"],
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(review);
  ws4["!cols"] = [{ wch: 25 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws4, "الرأي والمراجعة");

  XLSX.writeFile(wb, filename);
}
