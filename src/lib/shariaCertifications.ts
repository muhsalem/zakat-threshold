export type CertStatus = "certified" | "in_review" | "planned" | "informational";

export interface ShariaCertification {
  id: string;
  body: string;
  bodyEn: string;
  country: string;
  scope: string;
  status: CertStatus;
  reference?: string;
  url?: string;
  since?: string;
  notes?: string;
}

/**
 * سجل رسمي لهيئات الاعتماد الشرعي والمعايير التي يستند إليها المنتج.
 * يميّز بين: (certified) اعتماد رسمي مكتوب، (in_review) قيد المراجعة،
 * (planned) في خارطة الطريق، (informational) استناد معياري بلا اعتماد مباشر.
 */
export const SHARIA_CERTIFICATIONS: ShariaCertification[] = [
  {
    id: "aaoifi-ss35",
    body: "هيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية (AAOIFI)",
    bodyEn: "AAOIFI",
    country: "المنامة، البحرين",
    scope: "المعيار الشرعي رقم 35 (الزكاة) + المعيار المحاسبي FAS 9",
    status: "informational",
    reference: "SS 35 · FAS 9",
    url: "https://aaoifi.com",
    notes:
      "المنصة تطبّق المعيار الشرعي 35 كاملاً في جميع الحسابات المؤسسية، وتفتح ملف الاعتماد الرسمي بعد استكمال Audit شرعي داخلي.",
  },
  {
    id: "fiqh-academy-jeddah",
    body: "مجمع الفقه الإسلامي الدولي — منظمة التعاون الإسلامي",
    bodyEn: "International Islamic Fiqh Academy (OIC)",
    country: "جدة، السعودية",
    scope: "قرارات مجمع الفقه في زكاة الأسهم، الاستثمارات، الديون، الأنعام",
    status: "informational",
    reference: "قرارات 1، 3، 28، 143",
    url: "https://iifa-aifi.org",
    notes: "مصدر مرجعي للفتاوى المتخصّصة المدمجة في محرك الفتاوى.",
  },
  {
    id: "kuwait-zakat-house",
    body: "بيت الزكاة الكويتي",
    bodyEn: "Kuwait Zakat House",
    country: "الكويت",
    scope: "بروتوكول ربط API لتقارير الجمع/الصرف",
    status: "planned",
    notes: "مخطط للربط الرسمي ضمن مرحلة Government APIs (Q3 2026).",
  },
  {
    id: "zatca-saudi",
    body: "هيئة الزكاة والضريبة والجمارك (ZATCA)",
    bodyEn: "ZATCA — Saudi Arabia",
    country: "الرياض، السعودية",
    scope: "توليد رمز QR بصيغة TLV مطابقة لمواصفة الفوترة الإلكترونية المرحلة الأولى المنشورة",
    status: "informational",
    reference: "e-Invoicing Phase 1 TLV (مطابقة ذاتية، دون تسجيل أو اعتماد رسمي من ZATCA)",
    notes: "المنصة تولّد رمز TLV مطابقاً تقنياً للمواصفة العامة المنشورة. هذا تطابق ذاتي (self-conformance) وليس تسجيلاً أو اعتماداً رسمياً كمزوّد حلول من ZATCA — هذا الأخير يتطلب تسجيلاً واختباراً فعلياً عبر بوابتها لم يتم بعد.",
  },
  {
    id: "dar-alifta-egypt",
    body: "دار الإفتاء المصرية",
    bodyEn: "Dar Al-Ifta Al-Misriyyah",
    country: "القاهرة، مصر",
    scope: "استشارة على الحالات الخاصة (زكاة الرواتب، شركات التأمين)",
    status: "planned",
    url: "https://www.dar-alifta.org",
  },
  {
    id: "azhar-fatwa",
    body: "مركز الأزهر العالمي للفتوى الإلكترونية",
    bodyEn: "Al-Azhar Global Fatwa Center",
    country: "القاهرة، مصر",
    scope: "مراجعة نصوص الفتاوى العربية وأدلّة الاستدلال",
    status: "planned",
  },
  {
    id: "shariyah-review-bureau",
    body: "مكتب المراجعة الشرعية (Shariyah Review Bureau)",
    bodyEn: "Shariyah Review Bureau (SRB)",
    country: "البحرين",
    scope: "اعتماد شرعي مستقل للحسابات ومخرجات المنتج",
    status: "planned",
    url: "https://shariyah.net",
    notes: "لم يبدأ تواصل رسمي بعد — مرشَّح للتعاقد لبدء عملية الاعتماد الشرعي الرسمي.",
  },
  {
    id: "aliment-uae",
    body: "هيئة الإمارات للأوقاف وشؤون القاصرين",
    bodyEn: "Awqaf & Minors Affairs Foundation (UAE)",
    country: "الإمارات",
    scope: "بروتوكول ربط لتقارير الوقف والزكاة",
    status: "planned",
  },
  {
    id: "iso-27001",
    body: "المنظمة الدولية للتقييس — أمن المعلومات",
    bodyEn: "ISO/IEC 27001",
    country: "دولي",
    scope: "شهادة إدارة أمن المعلومات",
    status: "planned",
    reference: "ISO/IEC 27001:2022",
    notes: "بعض الضوابط الأمنية (RLS، تشفير النقل) مطبّقة عملياً، لكن التدقيق الخارجي الرسمي لم يبدأ بعد — مخطَّط ضمن Wave 3.",
  },
  {
    id: "iso-27701",
    body: "المنظمة الدولية للتقييس — الخصوصية",
    bodyEn: "ISO/IEC 27701",
    country: "دولي",
    scope: "شهادة إدارة خصوصية المعلومات (PIMS)",
    status: "planned",
  },
  {
    id: "soc2",
    body: "AICPA — SOC 2 Type II",
    bodyEn: "AICPA SOC 2 Type II",
    country: "الولايات المتحدة",
    scope: "تدقيق ضوابط الأمن والتوفّر والسرية",
    status: "planned",
  },
];

export const CERT_STATUS_LABEL: Record<CertStatus, { ar: string; className: string }> = {
  certified: {
    ar: "معتمد رسمياً",
    className: "bg-success text-success border-success",
  },
  in_review: { ar: "قيد المراجعة", className: "bg-warning text-warning border-warning" },
  planned: { ar: "مخطّط", className: "bg-sky-100 text-sky-800 border-sky-300" },
  informational: { ar: "استناد معياري", className: "bg-slate-100 text-slate-700 border-slate-300" },
};
