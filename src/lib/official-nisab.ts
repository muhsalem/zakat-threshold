import { COUNTRIES, Country } from "./countries";
import { ZAKAT_PORTALS, ZakatPortal } from "./official-portals";

export interface OfficialFatwaInfo {
  countryCode: string;
  authorityAr: string;
  authorityEn: string;
  rulingAr: string;
  rulingEn: string;
  standard: "gold" | "silver" | "lower";
  notesAr: string;
  notesEn: string;
  portalUrl?: string;
  portalNameAr?: string;
}

export const OFFICIAL_FATWAS: Record<string, OfficialFatwaInfo> = {
  EG: {
    countryCode: "EG",
    authorityAr: "دار الإفتاء المصرية",
    authorityEn: "Egyptian Dar Al-Ifta",
    rulingAr:
      "تعتمد دار الإفتاء المصرية في نصاب زكاة المال قيمة 85 جراماً من الذهب عيار 21، وترجح في بعض الفتاوى نصاب الفضة (595 جراماً) كونه الأحوط والأنفع للفقراء والمحتاجين.",
    rulingEn:
      "Egyptian Dar Al-Ifta bases the cash zakat nisab on 85g of 21k gold, while also noting silver (595g) as the more beneficial to the poor.",
    standard: "lower",
    notesAr: "العيار المعتمد محلياً في صاغة مصر لحساب النصاب هو عيار 21.",
    notesEn: "21 karat is the standard reference used in Egyptian market calculations.",
    portalUrl: "https://www.dar-alifta.org",
    portalNameAr: "البوابة الرسمية لدار الإفتاء المصرية",
  },
  SA: {
    countryCode: "SA",
    authorityAr: "هيئة كبار العلماء وهيئة الزكاة والضريبة والجمارك (زكاتي)",
    authorityEn: "Council of Senior Scholars & ZATCA (Zakaty)",
    rulingAr:
      "يُعتمد نصاب الذهب (85 جراماً من الذهب الخالص عيار 24) كمرجع أساسي لزكاة الأموال النقدية وعروض التجارة.",
    rulingEn:
      "85 grams of pure 24k gold is the standard benchmark for monetary and commercial zakat.",
    standard: "gold",
    notesAr:
      "خدمة «زكاتي» تتيح الحساب والدفع الآلي المباشر لمستفيدي الضمان الاجتماعي عبر منصة إحسان.",
    notesEn: "Zakaty allows direct calculation and payout to social welfare recipients.",
    portalUrl: "https://ehsan.sa/zakat",
    portalNameAr: "منصة إحسان الوطنية للعمل الخيري",
  },
  KW: {
    countryCode: "KW",
    authorityAr: "بيت الزكاة الكويتي",
    authorityEn: "Kuwait Zakat House",
    rulingAr:
      "يعلن بيت الزكاة يومياً نصاب الذهب (85 جراماً عيار 24) ونصاب الفضة (595 جراماً) بالدينار الكويتي ويعتمد نصاب الذهب لزكاة الأموال النقدية والودائع.",
    rulingEn:
      "Kuwait Zakat House daily publishes official gold (85g 24k) and silver (595g) nisabs in KWD.",
    standard: "gold",
    notesAr: "تُحدَّث الأسعار يومياً بالتعاون مع وزارة التجارة والصناعة الكويتية.",
    notesEn: "Updated daily in cooperation with the Kuwait Ministry of Commerce.",
    portalUrl: "https://www.zakathouse.org.kw",
    portalNameAr: "الموقع الرسمي لبيت الزكاة الكويتي",
  },
  AE: {
    countryCode: "AE",
    authorityAr: "صندوق الزكاة الإماراتي والهيئة العامة للشؤون الإسلامية والأوقاف",
    authorityEn: "UAE Zakat Fund & AWQAF",
    rulingAr:
      "يُحسب النصاب بناءً على قيمة 85 جراماً من الذهب الخالص (عيار 24) بالدرهم الإماراتي، مع مراعاة حولان الحول القمري وبلوغ النصاب في كامل الحول.",
    rulingEn: "Calculated based on 85g pure gold (24k) in AED with a full lunar hawl requirement.",
    standard: "gold",
    notesAr: "يقدم صندوق الزكاة خدمات دفع وتحصيل معتمدة مع حاسبة متخصصة للمصارف والشركات.",
    notesEn: "Provides verified collection and enterprise calculator services.",
    portalUrl: "https://www.zakatfund.gov.ae",
    portalNameAr: "صندوق الزكاة الإماراتي",
  },
  QA: {
    countryCode: "QA",
    authorityAr: "إدارة صندوق الزكاة - وزارة الأوقاف والشؤون الإسلامية بقطر",
    authorityEn: "Qatar Zakat Fund - Ministry of Endowments",
    rulingAr:
      "يصدر صندوق الزكاة القطري بياناً دورياً بأسعار الذهب والفضة، مع اعتماد 85 جراماً من الذهب الخالص كنصاب لأموال التجارة والمدخرات.",
    rulingEn: "Qatar Zakat Fund periodically issues gold and silver prices based on 85g pure gold.",
    standard: "gold",
    notesAr: "يوفر الصندوق خدمات التحصيل الإلكتروني المباشر لمصارف الزكاة الثمانية الشرعية.",
    notesEn: "Provides direct e-payment channels for the eight Quranic zakat categories.",
    portalUrl: "https://www.islam.gov.qa",
    portalNameAr: "وزارة الأوقاف والشؤون الإسلامية بقطر",
  },
  JO: {
    countryCode: "JO",
    authorityAr: "صندوق الزكاة الأردني ودائرة الإفتاء العام للمملكة",
    authorityEn: "Jordanian Zakat Fund & General Iftaa' Department",
    rulingAr:
      "تعتمد دائرة الإفتاء العام الأردنية نصاب الذهب (85 جراماً عيار 20 أو 24) وتصدر فتوى دورية برقم النصاب بالدينار الأردني عند تغير الأسعار.",
    rulingEn: "Jordan General Iftaa Department sets the nisab benchmark in JOD based on 85g gold.",
    standard: "gold",
    notesAr: "يُربط إخراج الزكاة في الأردن بلجان الزكاة التطوعية المعتمدة رسمياً في المحافظات.",
    notesEn: "Zakat distribution is coordinated via authorized provincial committees.",
    portalUrl: "https://aliftaa.jo",
    portalNameAr: "دائرة الإفتاء العام الأردنية",
  },
  MA: {
    countryCode: "MA",
    authorityAr: "المجلس العلمي الأعلى ووزارة الأوقاف والشؤون الإسلامية",
    authorityEn: "Moroccan Supreme Scientific Council & Ministry of Habous",
    rulingAr:
      "المذهب الفقهي المعتمد في المملكة المغربية هو المذهب المالكي، ويعتمد تقويم نصاب النقدين بالذهب (85 جراماً) مع مراعاة حظ الفقراء عند تزامن النصابين.",
    rulingEn: "Following the Maliki school, zakat threshold is evaluated on 85g gold standard.",
    standard: "lower",
    notesAr: "تُصرف الزكوات عبر القنوات الاجتماعية والخيرية الموثوقة وفق الضوابط الشرعية.",
    notesEn: "Zakat is directed through established community trusts and welfare bodies.",
    portalUrl: "https://www.habous.gov.ma",
    portalNameAr: "وزارة الأوقاف والشؤون الإسلامية المغربية",
  },
  DZ: {
    countryCode: "DZ",
    authorityAr: "وزارة الشؤون الدينية والأوقاف - الجزائر",
    authorityEn: "Ministry of Religious Affairs and Wakfs - Algeria",
    rulingAr:
      "تحدد وزارة الشؤون الدينية رسمياً كل عام نصاب الزكاة بالدينار الجزائري بناءً على ثمن 20 ديناراً ذهبياً (ما يعادل 84-85 جراماً من الذهب عيار 18 أو 24 حسب متوسط السوق).",
    rulingEn:
      "The Ministry officially announces annual zakat nisab in DZD based on 20 gold dinars (~84-85g).",
    standard: "gold",
    notesAr: "تُودع أموال الزكاة في الحساب البريدي الجاري الوطني لصندوق الزكاة الجزائري.",
    notesEn: "National postal accounts are designated for official Zakat Fund deposits.",
    portalUrl: "https://www.marw.dz",
    portalNameAr: "وزارة الشؤون الدينية والأوقاف الجزائرية",
  },
  TN: {
    countryCode: "TN",
    authorityAr: "ديوان الإفتاء للجمهورية التونسية",
    authorityEn: "Diwan of Iftaa of the Republic of Tunisia",
    rulingAr:
      "يصدر سماحة مفتي الجمهورية التونسية سنوياً بياناً رسمياً يحدد قيمة نصاب زكاة المال بالدينار التونسي استناداً إلى سعر 84-85 جراماً من الذهب عيار 18 أو 24.",
    rulingEn:
      "The Mufti of the Republic annually issues an official declaration fixing the nisab in TND.",
    standard: "gold",
    notesAr: "يُنشر البيان في مفتتح العام الهجري ومواسم إخراج الزكاة.",
    notesEn: "Announced annually at the start of the Hijri year and Ramadan.",
    portalUrl: "http://www.diwanifta.tn",
    portalNameAr: "ديوان الإفتاء للجمهورية التونسية",
  },
  OM: {
    countryCode: "OM",
    authorityAr: "وزارة الأوقاف والشؤون الدينية - سلطنة عُمان",
    authorityEn: "Ministry of Endowments and Religious Affairs - Oman",
    rulingAr:
      "تعتمد الوزارة نصاب الذهب (85 جراماً) ونصاب الفضة (595 جراماً)، ويُحسب النصاب بالريال العماني وفق الأسعار اليومية للمعدن.",
    rulingEn: "Evaluated on 85g gold and 595g silver according to daily market rates in OMR.",
    standard: "gold",
    notesAr: "تتيح بوابة الأوقاف العمانية خدمات احتساب ودفع الزكاة للمستحقين إلكترونياً.",
    notesEn: "Oman AWQAF portal provides online zakat calculation and disbursement.",
    portalUrl: "https://www.mara.gov.om",
    portalNameAr: "وزارة الأوقاف والشؤون الدينية بعُمان",
  },
  BH: {
    countryCode: "BH",
    authorityAr: "صندوق الزكاة والصدقات - وزارة العدل والشؤون الإسلامية والأوقاف",
    authorityEn: "Zakat and Charity Fund - Bahrain Ministry of Justice & Islamic Affairs",
    rulingAr:
      "يحدد الصندوق نصاب زكاة المال بناءً على سعر 85 جراماً من الذهب الخالص بالدينار البحريني، ويوفر خدمة الحساب والتوزيع المباشر.",
    rulingEn: "Calculated based on 85g pure gold in BHD by the national Zakat and Charity Fund.",
    standard: "gold",
    notesAr: "يُشرف مجلس شرعي متخصص على مصارف الصندوق وتدقيق الحسابات.",
    notesEn: "Audited and supervised by a specialized Sharia board.",
    portalUrl: "https://www.islam.gov.bh",
    portalNameAr: "وزارة الشؤون الإسلامية بمملكة البحرين",
  },
  TR: {
    countryCode: "TR",
    authorityAr: "رئاسة الشؤون الدينية التركية (Diyanet)",
    authorityEn: "Presidency of Religious Affairs (Diyanet)",
    rulingAr:
      "تحدد الشؤون الدينية نصاب الزكاة بـ 80.18 إلى 85 جراماً من الذهب أو ما يعادلها بالليرة التركية (TRY) وتصدر فتوى سنوية لمقدار النصاب وزكاة الفطر.",
    rulingEn: "Diyanet fixes the nisab based on 80.18g to 85g gold equivalent in TRY.",
    standard: "gold",
    notesAr: "تُجمع الزكاة وتوزع عبر وقف الديانة التركي (Türkiye Diyanet Vakfı).",
    notesEn: "Distributed globally via Türkiye Diyanet Foundation (TDV).",
    portalUrl: "https://diyanet.gov.tr",
    portalNameAr: "رئاسة الشؤون الدينية التركية",
  },
  MY: {
    countryCode: "MY",
    authorityAr: "الهيئات الشرعية للزكاة في الولايات الماليزية (PPZ / LZS)",
    authorityEn: "Pusat Pungutan Zakat (PPZ) & Lembaga Zakat Selangor (LZS)",
    rulingAr:
      "تعلن مجالس الشؤون الإسلامية في ماليزيا نصاب الزكاة مرتين سنوياً أو شهرياً استناداً إلى 85 جراماً من الذهب بالرينغيت (MYR).",
    rulingEn: "State Islamic religious councils announce nisab regularly based on 85g gold in MYR.",
    standard: "gold",
    notesAr:
      "تُعد ماليزيا من النماذج الرائدة في حوكمة الزكاة والاستقطاع الآلي والإعفاء الضريبي للمزكين.",
    notesEn: "Offers formal tax rebates and institutional governance for zakat payers.",
    portalUrl: "https://www.zakat.com.my",
    portalNameAr: "مركز تحصيل الزكاة ماليزيا (PPZ)",
  },
  ID: {
    countryCode: "ID",
    authorityAr: "الهيئة الوطنية للزكاة بإندونيسيا (BAZNAS)",
    authorityEn: "National Board of Zakat (BAZNAS Indonesia)",
    rulingAr:
      "تصدر BAZNAS سنوياً قراراً رسمياً (SK BAZNAS) يحدد نصاب زكاة الدخل والمال بـ 85 جراماً من الذهب بالروبية الإندونيسية (IDR).",
    rulingEn:
      "BAZNAS issues an annual decree setting the income and wealth zakat nisab at 85g gold in IDR.",
    standard: "gold",
    notesAr: "تعتمد نظاماً مؤسسياً رقمياً شاملاً لإدارة الزكاة على مستوى الجمهورية.",
    notesEn: "Nationwide digital platform for institutional zakat management.",
    portalUrl: "https://baznas.go.id",
    portalNameAr: "الهيئة الوطنية للزكاة (BAZNAS)",
  },
  GB: {
    countryCode: "GB",
    authorityAr: "مؤسسة الزكاة الوطنية في بريطانيا (NZF UK)",
    authorityEn: "National Zakat Foundation (NZF UK)",
    rulingAr:
      "تعتمد NZF نصاب الفضة (595 جراماً) كمعيار أساسي لزكاة الأموال النقدية بالجنيه الإسترليني عملاً بمذهب جمهور الفقهاء لصالح المستحقين، مع إتاحة خيار الذهب لمن يتبناه.",
    rulingEn:
      "NZF UK adopts silver (595g) as the default nisab in GBP to benefit the needy, while offering gold standard.",
    standard: "silver",
    notesAr: "المنظمة الرائدة لإيتاء الزكاة وتوزيعها على المسلمين المحتاجين داخل المملكة المتحدة.",
    notesEn: "Leading UK charity for local zakat collection and distribution.",
    portalUrl: "https://nzf.org.uk",
    portalNameAr: "National Zakat Foundation UK",
  },
  US: {
    countryCode: "US",
    authorityAr: "مجمع فقهاء الشريعة بأمريكا ومؤسسة الزكاة الأمريكية (ZFA)",
    authorityEn: "Fiqh Council of North America & Zakat Foundation of America",
    rulingAr:
      "يرجح مجمع فقهاء الشريعة بأمريكا نصاب الفضة (595 جراماً) لأموال النقد لكونه أنفع للفقراء، بينما يأخذ بعض الفقهاء بنصاب الذهب (85 جراماً) نظراً لتبدل القوة الشرائية للفضة.",
    rulingEn: "Scholars discuss silver (595g) vs gold (85g), with guidance provided in USD.",
    standard: "lower",
    notesAr:
      "توفر المؤسسات الإسلامية الأمريكية حاسبات دقيقة تراعي حسابات 401k والأسهم والعملات المشفرة.",
    notesEn: "Provides guidance on retirement accounts (401k), stocks, and crypto assets.",
    portalUrl: "https://www.zakat.org",
    portalNameAr: "Zakat Foundation of America",
  },
};

export function getOfficialFatwa(countryCode: string): OfficialFatwaInfo {
  const code = countryCode.toUpperCase();
  if (OFFICIAL_FATWAS[code]) {
    return OFFICIAL_FATWAS[code];
  }
  const country = COUNTRIES.find((c) => c.code === code);
  return {
    countryCode: code,
    authorityAr: `الهيئة الشرعية المعتمدة في ${country?.ar ?? code}`,
    authorityEn: `Recognized Sharia Authority in ${country?.en ?? code}`,
    rulingAr: `يُحسب النصاب الشرعي على أساس 85 جراماً من الذهب الخالص (عيار 24) أو 595 جراماً من الفضة الخالصة بعملة ${country?.currency ?? "المحلية"}. ويرجح جمهور العلماء الأخذ بالأحوط والأنفع للفقراء.`,
    rulingEn: `Calculated based on 85g of pure gold or 595g of silver in ${country?.currency ?? "local currency"}. Scholars recommend using the lower threshold to benefit the poor.`,
    standard: "lower",
    notesAr: `تأكد من مراجعة دار الإفتاء أو لجان الزكاة المعتمدة في دولتك للتفاصيل المحلية.`,
    notesEn: `Check local Islamic institutions in your country for specific local guidance.`,
  };
}
