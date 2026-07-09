import * as XLSX from "xlsx";
import type { PrintReportData } from "@/components/zakat/PrintReport";
import { camelZakat, cowZakat, sheepZakat, ZAKAT_RATE } from "@/lib/zakat";

/** يبني مصنّف الإكسل من بيانات التقرير (قابل للاختبار). */
export function buildReportWorkbook(data: PrintReportData): XLSX.WorkBook {
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
  const rowsBody = data.rows.map((r) => [
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

  // ورقة 3: زكاة بهيمة الأنعام (إن وُجدت)
  if (data.livestock?.show) {
    const mode =
      data.livestock.mode ??
      (data.livestock.tradeValue && data.livestock.tradeValue > 0 ? "trade" : "grazing");
    const ls: (string | number)[][] = [
      ["زكاة بهيمة الأنعام"],
      [],
      [
        "نمط التزكية",
        mode === "trade"
          ? "للتجارة (عروض تجارة بنسبة 2.5%)"
          : "سائمة (راعية في الكلأ المباح طوال الحول)",
      ],
      [
        "معدّل الزكاة",
        mode === "trade"
          ? `${(ZAKAT_RATE * 100).toFixed(2)}% من القيمة السوقية`
          : "وفق الجداول النبوية الواردة في صحيح البخاري ومصنّفات الفقهاء",
      ],
      [],
    ];

    if (mode === "trade") {
      const val = Number(data.livestock.tradeValue || 0);
      const zak = +(val * ZAKAT_RATE).toFixed(2);
      ls.push(
        ["النوع", "العدد", "القيمة السوقية", "الزكاة المستحقة"],
        ["الإبل", data.livestock.camels, "—", "—"],
        ["البقر/الجاموس", data.livestock.cows, "—", "—"],
        ["الغنم/المعز", data.livestock.sheep, "—", "—"],
        ["الإجمالي (مدمج في وعاء عروض التجارة)", "", val, zak],
        [],
        [
          "ملاحظة",
          "تُضمّ قيمة الأنعام المعدّة للتجارة إلى وعاء عروض التجارة وتُزكّى بنسبة 2.5% بعد بلوغ النصاب وحَول الحول، دون تطبيق جداول السائمة.",
        ],
      );
    } else {
      ls.push(
        ["النوع", "العدد", "النصاب الأدنى", "بلغ النصاب؟", "مقدار الزكاة الواجبة"],
        [
          "الإبل",
          data.livestock.camels,
          "5 من الإبل",
          data.livestock.camels >= 5 ? "نعم" : "لا",
          camelZakat(data.livestock.camels),
        ],
        [
          "البقر/الجاموس",
          data.livestock.cows,
          "30 من البقر",
          data.livestock.cows >= 30 ? "نعم" : "لا",
          cowZakat(data.livestock.cows),
        ],
        [
          "الغنم/المعز",
          data.livestock.sheep,
          "40 من الغنم",
          data.livestock.sheep >= 40 ? "نعم" : "لا",
          sheepZakat(data.livestock.sheep),
        ],
        [],
        [
          "شروط السائمة",
          "أن تكون راعيةً في الكلأ المباح أكثر العام، وأن يحول عليها الحول، وأن تبلغ النصاب، وألّا تكون عاملةً للحرث أو السقي.",
        ],
        [
          "الخصومات",
          "لا تُحسم ديون مالك الأنعام من العدد؛ والزكاة تتعلّق بالعين لا بالقيمة، وتؤدّى من جنس المال غالبًا أو قيمته عند الحاجة.",
        ],
        [
          "المرجع",
          "صحيح البخاري — كتاب الزكاة (كتاب أبي بكر الصدّيق رضي الله عنه)، ومعيار AAOIFI رقم (35) للزكاة.",
        ],
      );
    }

    const ws3 = XLSX.utils.aoa_to_sheet(ls);
    ws3["!cols"] = [{ wch: 38 }, { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws3, "زكاة الأنعام");
  }

  // ورقة: زكاة خيارات/منح أسهم الموظفين (ESOP/RSU)
  if (data.esop?.show) {
    const e = data.esop;
    const esopRows: (string | number)[][] = [
      ["زكاة خيارات/منح أسهم الموظفين (ESOP / RSU)"],
      [],
      ["البيان", "القيمة"],
      ["عدد الخيارات المستحقّة (Vested)", e.vestedShares],
      ["سعر السهم الحالي", e.price],
      ["سعر التنفيذ (Strike)", e.strike],
      ["القيمة الجوهرية للخيارات (max(0, السعر − التنفيذ) × العدد)", +e.intrinsic.toFixed(2)],
      ["قيمة RSUs المستحقّة بسعر السوق", e.rsuValue],
      ["إجمالي قاعدة الزكاة", +e.base.toFixed(2)],
      [
        "نية المزكّي",
        e.intentTrade
          ? "المتاجرة (تُزكّى 2.5%)"
          : "الاحتفاظ (تُزكّى موجودات الشركة الزكوية بحسب النسبة)",
      ],
      [
        "النصاب المعتمد",
        `النصاب النقدي (الأنفع للفقراء) = ${data.moneyNisab} ${data.currencyName}`,
      ],
      ["بلغ النصاب؟", e.base >= data.moneyNisab ? "نعم" : "لا"],
      ["الخصومات المطبّقة", "الخيارات غير المستحقّة (Unvested) لا تُحسب لعدم تمام الملك"],
      ["الزكاة المستحقة", +e.zakat.toFixed(2)],
      [],
      [
        "المرجع",
        "AAOIFI — معيار الزكاة رقم (35) + قرارات الندوات الفقهية المعاصرة بشأن منح الأسهم للموظفين",
      ],
    ];
    const wsE = XLSX.utils.aoa_to_sheet(esopRows);
    wsE["!cols"] = [{ wch: 55 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsE, "زكاة ESOP-RSU");
  }

  // ورقة: زكاة الأوقاف والمؤسسات الوقفية
  if (data.waqf?.show) {
    const w = data.waqf;
    const waqfRows: (string | number)[][] = [
      ["زكاة الأوقاف والمؤسسات الوقفية"],
      [],
      ["البيان", "القيمة"],
      ["عروض تجارة مملوكة للوقف للاسترباح", w.tradeAssets],
      ["غلّة موزّعة على موقوف عليهم معيّنين (بلغت النصاب وحال الحول)", w.rentIncome],
      ["خصم: أصول وقفية خيرية محبّسة (معفاة من الزكاة)", w.exemptCore],
      ["قاعدة الزكاة الصافية", +w.base.toFixed(2)],
      ["النصاب المعتمد", `النصاب النقدي = ${data.moneyNisab} ${data.currencyName}`],
      ["بلغ النصاب؟", w.base >= data.moneyNisab ? "نعم" : "لا"],
      ["معدّل الزكاة", "2.5% (ربع العشر)"],
      ["الزكاة المستحقة", +w.zakat.toFixed(2)],
      [],
      ["القاعدة الفقهية", "أصل الوقف لا تجب فيه الزكاة لخروجه عن الملك."],
      [
        "الاستثناءات",
        "1) عروض التجارة المملوكة للوقف للاسترباح. 2) غلّة الوقف المخصّصة للموقوف عليهم المعيّنين إذا بلغت النصاب وكانوا أغنياء.",
      ],
      ["المرجع", "قرار مجمع الفقه الإسلامي الدولي رقم 140 (15/4) + معيار AAOIFI رقم (35)"],
    ];
    const wsW = XLSX.utils.aoa_to_sheet(waqfRows);
    wsW["!cols"] = [{ wch: 55 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsW, "زكاة الأوقاف");
  }

  // ورقة: بيان الخصومات والمبرّرات (الفحص البصري لكل خصم)
  if (data.deductions && data.deductions.length > 0) {
    const dedHeader = [
      [
        "البند",
        "القيمة المُدخلة",
        `العملة (${data.currencyName})`,
        "تم احتسابه؟",
        "السبب الشرعي/المحاسبي",
        "المرجع",
      ],
    ];
    const dedRows = data.deductions.map((d) => [
      d.label,
      d.amount,
      data.currencyName,
      d.included ? "نعم — مُحتسب" : "لا — مُستبعد",
      d.reason,
      d.ref || "—",
    ]);
    const includedTotal = data.deductions
      .filter((d) => d.included)
      .reduce((s, d) => s + (d.amount || 0), 0);
    const excludedTotal = data.deductions
      .filter((d) => !d.included)
      .reduce((s, d) => s + (d.amount || 0), 0);
    dedRows.push(["—", "", "", "", "", ""]);
    dedRows.push([
      "إجمالي الخصومات المُحتسبة",
      includedTotal,
      data.currencyName,
      "—",
      "تدخل في حساب الوعاء الزكوي الصافي",
      "—",
    ]);
    dedRows.push([
      "إجمالي البنود المستبعدة",
      excludedTotal,
      data.currencyName,
      "—",
      "لا تُخصم لعدم استيفاء شروط الخصم الشرعية",
      "—",
    ]);
    const wsD = XLSX.utils.aoa_to_sheet([
      ["بيان الخصومات والمبرّرات الشرعية"],
      ["كل سطر يوضّح القيمة المُدخلة، ما إذا تم احتسابها أو استبعادها، والسبب والمرجع الشرعي."],
      [],
      ...dedHeader,
      ...dedRows,
    ]);
    wsD["!cols"] = [{ wch: 38 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 60 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsD, "بيان الخصومات");
  }

  // ورقة: أسعار الصرف المستخدمة في التحويل التلقائي
  if (data.fx && (data.fx.rates.length > 0 || data.fx.entries.length > 0)) {
    const fxAoA: (string | number)[][] = [
      ["أسعار الصرف المعتمدة في التقرير"],
      [`عملة التقرير: ${data.fx.reportCurrency}`],
      data.fx.source ? [`المصدر: ${data.fx.source}`] : [""],
      [],
      ["العملة الأصلية", `السعر مقابل ${data.fx.reportCurrency}`],
      ...data.fx.rates.map((r) => [r.from, r.rate]),
      [],
      ["تفاصيل البنود المحوَّلة"],
      [
        "البند",
        "القيمة الأصلية",
        "العملة الأصلية",
        "السعر المستخدم",
        `القيمة بعد التحويل (${data.fx.reportCurrency})`,
      ],
      ...data.fx.entries.map((e) => [
        e.label,
        e.originalAmount,
        e.originalCurrency,
        e.rate,
        +e.convertedAmount.toFixed(2),
      ]),
    ];
    const wsFx = XLSX.utils.aoa_to_sheet(fxAoA);
    wsFx["!cols"] = [{ wch: 38 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsFx, "أسعار الصرف");
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

  return wb;
}

/** تصدير تقرير الزكاة إلى ملف Excel (.xlsx) متعدد الأوراق */
export function downloadReportExcel(data: PrintReportData, filename = "zakat-report.xlsx") {
  const wb = buildReportWorkbook(data);
  XLSX.writeFile(wb, filename);
}
