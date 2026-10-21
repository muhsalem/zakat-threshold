/**
 * The Shariah weights of the nisab did not change across eras; what changed is the
 * money it is measured in. Hijri ranges are approximate and the notes are summaries,
 * not citations of a specific source.
 */
export type NisabEra = {
  id: string;
  nameAr: string;
  /** Approximate hijri span, e.g. "1 – 11 هـ". */
  spanAr: string;
  goldAr: string;
  silverAr: string;
  noteAr: string;
};

export const NISAB_ERAS: NisabEra[] = [
  {
    id: "prophetic",
    nameAr: "العهد النبوي",
    spanAr: "1 – 11 هـ",
    goldAr: "20 ديناراً (~85 جم)",
    silverAr: "200 درهم (~595 جم)",
    noteAr: "ثبت النصاب بنص السنة النبوية: «ليس فيما دون خمس أواقٍ صدقة» (متفق عليه).",
  },
  {
    id: "rashidun",
    nameAr: "الخلافة الراشدة",
    spanAr: "11 – 40 هـ",
    goldAr: "20 ديناراً ذهبياً",
    silverAr: "200 درهم فضة",
    noteAr:
      "استمر التعامل بالدينار الذهبي والدرهم الفضي وزناً لا عدّاً، وبقي النصاب بالأوزان نفسها.",
  },
  {
    id: "umayyad",
    nameAr: "العصر الأموي",
    spanAr: "41 – 132 هـ",
    goldAr: "دينار عبد الملك (4.25 جم)",
    silverAr: "درهم (2.975 جم)",
    noteAr: "توحيد المسكوكات الإسلامية في إصلاح عبد الملك بن مروان نحو سنة 77هـ.",
  },
  {
    id: "abbasid",
    nameAr: "العصر العباسي",
    spanAr: "132 – 656 هـ",
    goldAr: "20 مثقالاً",
    silverAr: "200 درهم",
    noteAr:
      "استمر الدينار والدرهم الشرعيان معياراً للنصاب، وتدوَّنت المذاهب الفقهية وفيها أحكام الزكاة.",
  },
  {
    id: "mamluk",
    nameAr: "العصر المملوكي",
    spanAr: "648 – 923 هـ",
    goldAr: "20 مثقالاً",
    silverAr: "200 درهم",
    noteAr: "اضطربت عيارات النقود وتعددت، فكتب المقريزي في النقود وغلاء الأسعار وأثرهما على الناس.",
  },
  {
    id: "ottoman",
    nameAr: "العصر العثماني",
    spanAr: "923 – 1342 هـ",
    goldAr: "20 مثقالاً",
    silverAr: "200 درهم",
    noteAr: "تنوعت العملات المتداولة، وبقيت الأوزان الشرعية مرجعاً للنصاب عند الفقهاء.",
  },
  {
    id: "modern",
    nameAr: "العصر الحديث",
    spanAr: "من 1342 هـ إلى اليوم",
    goldAr: "85 جم ذهب خالص",
    silverAr: "595 جم فضة",
    noteAr:
      "حلّت الأوراق النقدية محل الذهب والفضة، فصار النصاب يُقوَّم بالعملة المحلية بسعر الذهب أو الفضة يومياً.",
  },
];
