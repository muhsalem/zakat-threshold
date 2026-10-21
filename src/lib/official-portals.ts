export type ZakatPortal = {
  id: string;
  countryCode: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  url: string;
  isOfficialGov: boolean;
  category: "government" | "trusted_charity" | "waqf";
};

export const ZAKAT_PORTALS: ZakatPortal[] = [
  // السعودية
  {
    id: "ehsan-sa",
    countryCode: "SA",
    nameAr: "منصة إحسان الوطنية للعمل الخيري",
    nameEn: "Ehsan National Charity Platform",
    descriptionAr:
      "المنصة الوطنية المعتمدة بالمملكة لإخراج زكاة المال وزكاة الفطر لمستحقيها مباشرة.",
    descriptionEn: "The official Saudi national charity platform for direct Zakat distribution.",
    url: "https://ehsan.sa/zakat",
    isOfficialGov: true,
    category: "government",
  },
  {
    id: "zakaty-sa",
    countryCode: "SA",
    nameAr: "تطبيق زكاتي (هيئة الزكاة والضريبة والجمارك)",
    nameEn: "Zakaty Service (ZATCA)",
    descriptionAr:
      "خدمة حكومية موثوقة لحساب ودفع زكاة الأفراد وتوزيعها على مستفيدي الضمان الاجتماعي.",
    descriptionEn: "Official government service for individuals to calculate and disburse Zakat.",
    url: "https://zatca.gov.sa/ar/Zakat/Zakaty",
    isOfficialGov: true,
    category: "government",
  },
  // الكويت
  {
    id: "zakathouse-kw",
    countryCode: "KW",
    nameAr: "بيت الزكاة الكويتي",
    nameEn: "Kuwait Zakat House",
    descriptionAr: "هيئة حكومية كويتية رائدة ومستقلة تُعنى بجمع وتوزيع أموال الزكاة شرعياً.",
    descriptionEn:
      "Official independent Kuwaiti government body for Zakat collection and distribution.",
    url: "https://www.zakathouse.org.kw",
    isOfficialGov: true,
    category: "government",
  },
  // الإمارات
  {
    id: "zakatfund-ae",
    countryCode: "AE",
    nameAr: "صندوق الزكاة الإماراتي",
    nameEn: "UAE Zakat Fund",
    descriptionAr: "الهيئة الاتحادية المتخصصة في خدمة فريضة الزكاة وتوجيهها للمستحقين.",
    descriptionEn: "Federal government entity in the UAE dedicated to Zakat disbursement.",
    url: "https://www.zakatfund.gov.ae",
    isOfficialGov: true,
    category: "government",
  },
  // قطر
  {
    id: "zakat-qa",
    countryCode: "QA",
    nameAr: "إدارة شؤون الزكاة (وزارة الأوقاف القطرية)",
    nameEn: "Qatar Zakat Fund (Awqaf)",
    descriptionAr: "الجهة الرسمية المعتمدة لتحصيل وصرف الزكاة داخل دولة قطر وفق المصارف الشرعية.",
    descriptionEn: "Official authority for Zakat collection and distribution in Qatar.",
    url: "https://www.zakat.gov.qa",
    isOfficialGov: true,
    category: "government",
  },
  // مصر
  {
    id: "baitzakat-eg",
    countryCode: "EG",
    nameAr: "بيت الزكاة والصدقات المصري (تحت إشراف مشيخة الأزهر)",
    nameEn: "Egypt Zakat and Charity House (Al-Azhar)",
    descriptionAr:
      "هيئة مستقلة بإشراف فضيلة الإمام الأكبر شيخ الأزهر الشريف لتوجيه الزكاة لأشد المحتاجين.",
    descriptionEn: "Independent institution supervised by the Grand Imam of Al-Azhar.",
    url: "https://baitzakat.org.eg",
    isOfficialGov: true,
    category: "government",
  },
  // الأردن
  {
    id: "zakatfund-jo",
    countryCode: "JO",
    nameAr: "صندوق الزكاة الأردني (وزارة الأوقاف)",
    nameEn: "Jordan Zakat Fund",
    descriptionAr:
      "المؤسسة الرسمية العامة لإدارة وتحصيل وتوزيع أموال الزكاة في المملكة الأردنية الهاشمية.",
    descriptionEn: "Official national body managing Zakat in Jordan under the Ministry of Awqaf.",
    url: "https://www.zakatfund.gov.jo",
    isOfficialGov: true,
    category: "government",
  },
  // سلطنة عمان
  {
    id: "zakat-om",
    countryCode: "OM",
    nameAr: "البوابة الإلكترونية لخدمات الزكاة (وزارة الأوقاف والشؤون الدينية)",
    nameEn: "Oman Electronic Zakat Portal",
    descriptionAr: "بوابة ذكية تقدم خدمات دفع وصرف الزكاة للأسر العمانية المستحقة بدقة وشفافية.",
    descriptionEn: "Official Ministry portal for calculating and donating Zakat in Oman.",
    url: "https://zakat.om",
    isOfficialGov: true,
    category: "government",
  },
  // البحرين
  {
    id: "zakat-bh",
    countryCode: "BH",
    nameAr: "صندوق الزكاة والصدقات البحريني",
    nameEn: "Bahrain Zakat & Charity Fund",
    descriptionAr: "الجهة الحكومية التابعة لوزارة العدل والشؤون الإسلامية والأوقاف بمملكة البحرين.",
    descriptionEn: "Official fund under the Ministry of Justice and Islamic Affairs in Bahrain.",
    url: "https://www.islam.gov.bh",
    isOfficialGov: true,
    category: "government",
  },
];

export function getPortalsForCountry(countryCode: string): ZakatPortal[] {
  const matched = ZAKAT_PORTALS.filter((p) => p.countryCode === countryCode);
  if (matched.length > 0) return matched;
  // Default to universal humanitarian Islamic platforms if no specific country portal exists
  return [
    {
      id: "universal-relief",
      countryCode: "ALL",
      nameAr: "منظمات الإغاثة الإنسانية الإسلامية المعتمدة",
      nameEn: "Accredited Islamic Relief Charities",
      descriptionAr:
        "يُرجى إخراج الزكاة عبر الهيئات الخيرية الإسلامية المرخصة في بلدك أو إيصالها مباشرة للمستحقين من الأقارب والمحتاجين.",
      descriptionEn:
        "Distribute your Zakat via licensed local Islamic charities or directly to deserving relatives and needy families.",
      url: "https://www.islamic-relief.org",
      isOfficialGov: false,
      category: "trusted_charity",
    },
  ];
}
