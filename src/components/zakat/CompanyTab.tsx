import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2, Calculator, Shield, Gavel, CheckSquare, AlertTriangle, Info, Scale,
  FileSpreadsheet, Upload, FileText, X, Printer, Save, Coins, Users,
} from "lucide-react";
import { ZAKAT_RATE, GOLD_NISAB_GRAMS, num, fmt, currency as cFmt } from "@/lib/zakat";
import { SectoralModels } from "./SectoralModels";
import { PurificationCalculator } from "./PurificationCalculator";
import { Button } from "@/components/ui/button";

function NumField({ label, value, onChange, unit, hint }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="number" min="0" step="0.01" value={value}
          onChange={(e) => onChange(e.target.value)} placeholder="0"
          className="pl-16" dir="ltr" style={{ textAlign: "right" }}
        />
        {unit && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ============ الدول والإطار القانوني ============
type CountryInfo = {
  code: string; name: string; flag: string; currency: string; symbol: string;
  law: string; authority: string; note?: string; companyTypes: string[];
};

const GENERIC_TYPES = [
  "شركة مساهمة مدرجة",
  "شركة مساهمة مقفلة (غير مدرجة)",
  "شركة ذات مسؤولية محدودة (ذ.م.م)",
  "شركة الشخص الواحد",
  "شركة تضامن",
  "شركة توصية بسيطة",
  "مؤسسة فردية",
];

const COUNTRIES: CountryInfo[] = [
  { code: "SA", name: "المملكة العربية السعودية", flag: "🇸🇦", currency: "SAR", symbol: "ر.س",
    law: "نظام الشركات السعودي 1443هـ", authority: "هيئة زاتكا — إلزامية | ZATCA-Z1", note: "الغرامة 1% شهرياً",
    companyTypes: ["شركة مساهمة عامة مدرجة (تداول)","شركة مساهمة مقفلة","شركة ذات مسؤولية محدودة","شركة الشخص الواحد","شركة تضامن","شركة توصية بسيطة","شركة مهنية","مؤسسة فردية"] },
  { code: "EG", name: "جمهورية مصر العربية", flag: "🇪🇬", currency: "EGP", symbol: "ج.م",
    law: "قانون الشركات المصري رقم 159 لسنة 1981", authority: "بيت الزكاة والصدقات المصري — اختيارية",
    companyTypes: ["شركة مساهمة (ق 159/1981)","شركة توصية بالأسهم","شركة ذات مسؤولية محدودة","شركة الشخص الواحد (ق 4/2018)","شركة تضامن","شركة توصية بسيطة","شركة محاصة","منشأة فردية"] },
  { code: "AE", name: "الإمارات العربية المتحدة", flag: "🇦🇪", currency: "AED", symbol: "د.إ",
    law: "قانون الشركات التجارية اتحادي رقم 32 لسنة 2021", authority: "صندوق الزكاة الإماراتي — اختيارية",
    companyTypes: ["شركة مساهمة عامة (PJSC)","شركة مساهمة خاصة (PrJSC)","شركة ذات مسؤولية محدودة (LLC)","شركة الشخص الواحد","شركة تضامن","شركة توصية بسيطة","منشأة في منطقة حرة (Free Zone)"] },
  { code: "KW", name: "دولة الكويت", flag: "🇰🇼", currency: "KWD", symbol: "د.ك",
    law: "قانون الشركات الكويتي رقم 1 لسنة 2016", authority: "بيت الزكاة الكويتي — إلزامية للشركات المساهمة 1%",
    companyTypes: ["شركة مساهمة كويتية (ك.م.ك.ع)","شركة مساهمة مقفلة","شركة ذات مسؤولية محدودة (W.L.L)","شركة الشخص الواحد","شركة تضامن","شركة توصية"] },
  { code: "QA", name: "دولة قطر", flag: "🇶🇦", currency: "QAR", symbol: "ر.ق",
    law: "قانون الشركات التجارية القطري رقم 11 لسنة 2015", authority: "صندوق الزكاة القطري — اختيارية",
    companyTypes: ["شركة مساهمة قطرية عامة (Q.P.S.C)","شركة مساهمة خاصة","شركة ذات مسؤولية محدودة","شركة الشخص الواحد","شركة تضامن","شركة توصية"] },
  { code: "BH", name: "مملكة البحرين", flag: "🇧🇭", currency: "BHD", symbol: "د.ب",
    law: "قانون الشركات التجارية البحريني رقم 21 لسنة 2001", authority: "صندوق الزكاة البحريني — اختيارية",
    companyTypes: ["شركة مساهمة بحرينية مقفلة (B.S.C)","شركة مساهمة بحرينية عامة","شركة ذات مسؤولية محدودة","مؤسسة فردية","شركة تضامن"] },
  { code: "OM", name: "سلطنة عُمان", flag: "🇴🇲", currency: "OMR", symbol: "ر.ع",
    law: "قانون الشركات التجارية العُماني رقم 18 لسنة 2019", authority: "بيت الزكاة العُماني — اختيارية",
    companyTypes: ["شركة مساهمة عامة (S.A.O.G)","شركة مساهمة مقفلة (S.A.O.C)","شركة ذات مسؤولية محدودة (LLC)","شركة الشخص الواحد","شركة تضامن"] },
  { code: "JO", name: "المملكة الأردنية الهاشمية", flag: "🇯🇴", currency: "JOD", symbol: "د.أ",
    law: "قانون الشركات الأردني رقم 22 لسنة 1997", authority: "صندوق الزكاة الأردني — اختيارية",
    companyTypes: ["شركة مساهمة عامة","شركة مساهمة خاصة","شركة ذات مسؤولية محدودة","شركة تضامن","شركة توصية بسيطة","مؤسسة فردية"] },
  { code: "MA", name: "المملكة المغربية", flag: "🇲🇦", currency: "MAD", symbol: "د.م",
    law: "قانون الشركات المغربي 17-95 و 5-96", authority: "بيت مال الزكاة — اختيارية",
    companyTypes: ["شركة مساهمة (SA)","ش. ذات مسؤولية محدودة (SARL)","ش. ذات مسؤولية محدودة بشريك وحيد","شركة التضامن","شركة التوصية"] },
  { code: "DZ", name: "الجزائر", flag: "🇩🇿", currency: "DZD", symbol: "د.ج",
    law: "القانون التجاري الجزائري", authority: "صندوق الزكاة الجزائري — اختيارية",
    companyTypes: ["شركة مساهمة (SPA)","ش. ذات مسؤولية محدودة (SARL)","ش. الشخص الوحيد (EURL)","شركة التضامن","شركة التوصية"] },
  { code: "TN", name: "الجمهورية التونسية", flag: "🇹🇳", currency: "TND", symbol: "د.ت",
    law: "مجلة الشركات التجارية التونسية", authority: "ديوان الزكاة — اختيارية",
    companyTypes: ["شركة خفية الاسم (SA)","ش. ذات مسؤولية محدودة (SARL)","ش. ذات شخص واحد (SUARL)","شركة التضامن"] },
  { code: "LY", name: "ليبيا", flag: "🇱🇾", currency: "LYD", symbol: "د.ل",
    law: "قانون النشاط التجاري رقم 23 لسنة 2010", authority: "صندوق الزكاة الليبي — إلزامية 2.5%",
    companyTypes: ["شركة مساهمة","شركة ذات مسؤولية محدودة","شركة تضامن","شركة توصية","مؤسسة فردية"] },
  { code: "MY", name: "ماليزيا", flag: "🇲🇾", currency: "MYR", symbol: "RM",
    law: "قانون الشركات الماليزي 2016", authority: "PPZ-MAIWP — إلزامية بأحكام الولايات",
    companyTypes: ["Public Limited (Berhad)","Private Limited (Sdn Bhd)","Limited Liability Partnership (LLP)","Sole Proprietorship","Partnership"] },
  { code: "TR", name: "تركيا", flag: "🇹🇷", currency: "TRY", symbol: "₺",
    law: "قانون التجارة التركي رقم 6102", authority: "اختيارية",
    companyTypes: ["شركة مساهمة (A.Ş.)","ش. ذات مسؤولية محدودة (Ltd. Şti.)","ش. التضامن","ش. التوصية","منشأة فردية"] },
];

// ============ القطاعات والربط بالنماذج ============
type Sector = { id: string; label: string; group: "primary" | "industrial" | "commercial" | "services"; model: string };
const SECTORS: Sector[] = [
  // أولى
  { id: "agri",     label: "زراعي (نباتي/حيواني)",         group: "primary",     model: "trade" },
  { id: "minerals", label: "استخراج معادن",                 group: "primary",     model: "minerals" },
  { id: "oilgas",   label: "استخراج بترول وغاز",            group: "primary",     model: "minerals" },
  { id: "fishing",  label: "صيد الأسماك / ثروة بحرية",     group: "primary",     model: "marine" },
  // صناعي
  { id: "manuf",    label: "صناعي تحويلي",                  group: "industrial",  model: "industry" },
  { id: "construct",label: "إنشاءات ومقاولات",              group: "industrial",  model: "industry" },
  // تجاري
  { id: "trade_w",  label: "تجارة جملة وتجزئة",             group: "commercial",  model: "trade" },
  { id: "import",   label: "استيراد وتصدير",                group: "commercial",  model: "trade" },
  // خدمي
  { id: "consult",  label: "استشارات وخدمات مهنية",         group: "services",    model: "services" },
  { id: "transport",label: "نقل ولوجستيات",                  group: "services",    model: "services" },
  { id: "software", label: "تقنية وبرمجيات",                 group: "services",    model: "services" },
  { id: "realestate",label:"عقارات ومُستغلات",              group: "services",    model: "mustaghal" },
];

const GROUP_LABELS: Record<Sector["group"], string> = {
  primary: "نشاط أولى (استخراجي/زراعي)",
  industrial: "نشاط صناعي",
  commercial: "نشاط تجاري",
  services: "نشاط خدمي",
};

// التبويبات المسموح بها في النموذج القطاعي حسب القطاع المحدد (مع تبويبات مساندة دائمة)
function getAllowedSectoralTabs(sectorId: string, group: Sector["group"]): string[] {
  const supporting = ["salary", "tax"]; // الأجور والضريبة مرتبطة دائماً
  let primary: string[] = [];
  switch (sectorId) {
    case "agri":      primary = ["trade"]; break;
    case "minerals":
    case "oilgas":    primary = ["minerals"]; break;
    case "fishing":   primary = ["marine"]; break;
    case "manuf":
    case "construct": primary = ["industry", "trade"]; break;
    case "trade_w":
    case "import":    primary = ["trade"]; break;
    case "realestate":primary = ["mustaghal", "services"]; break;
    case "consult":
    case "transport":
    case "software":  primary = ["services", "free"]; break;
    default:
      // افتراضي حسب المجموعة
      primary = group === "industrial" ? ["industry"]
        : group === "commercial" ? ["trade"]
        : group === "services" ? ["services"]
        : ["trade"];
  }
  return [...primary, ...supporting];
}


// تقريب التحويل الميلادي/الهجري
function gregorianToHijri(gYear: number) {
  return Math.round((gYear - 622) * 33 / 32);
}

// ============ قائمة التدقيق الشرعي ============
const COMPLIANCE_SECTIONS: { title: string; items: { id: string; label: string }[] }[] = [
  { title: "أولاً — الوثائق والقوائم المالية", items: [
    { id: "doc_audited", label: "اعتماد القوائم المالية الختامية المراجعة من مراقب حسابات قانوني" },
    { id: "doc_period", label: "تطابق الفترة المحاسبية مع الحول الشرعي (هجري/شمسي)" },
    { id: "doc_disclosure", label: "الإفصاح عن أسس وطريقة احتساب الزكاة في الإيضاحات" },
    { id: "doc_articles", label: "مراجعة عقد التأسيس والنظام الأساسي لتحديد طبيعة النشاط" },
    { id: "doc_minutes", label: "مراجعة محاضر الجمعية العمومية المتعلقة بإقرار الزكاة" },
  ]},
  { title: "ثانياً — تحديد الوعاء الزكوي (الموجودات)", items: [
    { id: "z_inventory_market", label: "تقييم المخزون بسعر البيع الجملة يوم وجوب الزكاة (لا بسعر التكلفة)" },
    { id: "z_inv_categories", label: "فصل مخزون الإنتاج التام وتحت التشغيل والمواد الخام بالقيمة السوقية" },
    { id: "z_securities", label: "تقييم الأوراق المالية والاستثمارات بالقيمة السوقية لا الدفترية" },
    { id: "z_fx", label: "تقويم العملات الأجنبية بسعر صرف يوم وجوب الزكاة" },
    { id: "z_receivables", label: "تصنيف الذمم (جيدة/مشكوك فيها/معدومة) وفق معايير واضحة" },
    { id: "z_exclude_fixed", label: "استبعاد الأصول الثابتة المُعدّة للاستخدام لا للتجارة" },
    { id: "z_exclude_intangibles", label: "استبعاد الأصول غير الملموسة (شهرة، براءات لأغراض الاستخدام)" },
    { id: "z_mustaghallat", label: "التمييز بين أصول التجارة وأصول المُستغلات (تُزكى غلتها لا قيمتها)" },
    { id: "z_prepaid", label: "استبعاد المصروفات المدفوعة مقدماً والتأمينات المستردة" },
  ]},
  { title: "ثالثاً — تحديد الخصوم القابلة للحسم", items: [
    { id: "l_short_term", label: "حسم الالتزامات قصيرة الأجل الحالة خلال السنة فقط" },
    { id: "l_loan_current", label: "حسم القسط الحال من القروض طويلة الأجل وليس كامل القرض" },
    { id: "l_provisions", label: "حسم المخصصات لمواجهة التزامات حالة فقط (لا المخصصات الاحتياطية)" },
    { id: "l_tax_due", label: "إدراج الضرائب المستحقة غير المدفوعة كالتزام زكوي" },
    { id: "l_no_fixed_debt", label: "عدم حسم القروض المستخدمة في تمويل الأصول الثابتة" },
    { id: "l_end_service", label: "حسم مخصص مكافأة نهاية الخدمة المستحقة الفعلية" },
  ]},
  { title: "رابعاً — الضوابط الشرعية للنشاط والموارد", items: [
    { id: "s_halal_activity", label: "التحقق من حلّ النشاط الأصلي للشركة شرعاً" },
    { id: "s_no_riba", label: "خلو موارد الشركة من الفوائد الربوية أو تطهيرها" },
    { id: "s_no_haram", label: "خلو الإيرادات من المصادر المحرمة (خمور، قمار، تأمين تجاري...)" },
    { id: "s_purification", label: "احتساب نسبة التطهير عن الإيرادات غير الحلال وتصريفها في مصارفها" },
    { id: "s_sharia_screen", label: "التحقق من مطابقة الشركة لمعايير المؤشرات الشرعية (AAOIFI/S&P)" },
    { id: "s_shariah_board", label: "وجود هيئة رقابة شرعية أو مستشار شرعي معتمد للشركة" },
    { id: "s_contracts", label: "مراجعة العقود التمويلية والاستثمارية للتأكد من خلوها من الربا والغرر" },
  ]},
  { title: "خامساً — الحول والنصاب والنسبة", items: [
    { id: "h_hawl", label: "التحقق من حولان الحول الكامل على الموجودات الزكوية" },
    { id: "h_nisab", label: "التحقق من بلوغ الوعاء النصاب (85 جراماً من الذهب)" },
    { id: "h_rate", label: "تطبيق النسبة الصحيحة: 2.5% قمري — 2.5775% شمسي" },
    { id: "h_unified_hawl", label: "توحيد تاريخ حول الزكاة سنوياً وعدم تأخيره" },
  ]},
  { title: "سادساً — حقوق الشركاء والمساهمين", items: [
    { id: "p_minorities", label: "احتساب حقوق الأقليات وحصص الشركاء بدقة" },
    { id: "p_per_share", label: "احتساب نصيب السهم الواحد من الزكاة" },
    { id: "p_govt_share", label: "استبعاد حصص الجهات الحكومية والوقفية من الوعاء" },
    { id: "p_non_muslim", label: "استبعاد حصص الشركاء غير المسلمين عند الاقتضاء" },
    { id: "p_inform", label: "إعلام المساهمين بنصيب السهم لمن يرغب في إخراج زكاته فردياً" },
  ]},
  { title: "سابعاً — الحوكمة والامتثال والإفصاح", items: [
    { id: "g_method_stable", label: "ثبات طريقة الاحتساب (صافي الموجودات / رأس المال العامل) سنوياً" },
    { id: "g_zakat_account", label: "وجود حساب مستقل في دفاتر الشركة للزكاة" },
    { id: "g_payment_proof", label: "توثيق سداد الزكاة لمستحقيها أو للجهة الشرعية المعتمدة" },
    { id: "g_external_audit", label: "اعتماد تقرير الزكاة من جهة تدقيق شرعي خارجي مستقل" },
    { id: "g_authority", label: "الالتزام بمتطلبات الجهة التنظيمية للزكاة في الدولة (زاتكا/بيت الزكاة...)" },
    { id: "g_kpi", label: "ربط الحوكمة الزكوية بمؤشرات الأداء والاستدامة (ESG)" },
  ]},
];
const ALL_ITEM_IDS = COMPLIANCE_SECTIONS.flatMap((s) => s.items.map((i) => i.id));

// ============ قسم رفع القوائم المالية ============
type StatementKey = "bs" | "is" | "cf" | "eq";
const STATEMENT_LABELS: Record<StatementKey, { title: string; desc: string }> = {
  bs: { title: "قائمة المركز المالي (الميزانية)", desc: "الأصول والخصوم وحقوق الملكية في تاريخ الحول" },
  is: { title: "قائمة الدخل (الأرباح والخسائر)", desc: "الإيرادات والمصروفات خلال السنة" },
  cf: { title: "قائمة التدفقات النقدية", desc: "تدفقات التشغيل والاستثمار والتمويل" },
  eq: { title: "قائمة التغيرات في حقوق الملكية", desc: "حركة رأس المال والاحتياطيات والأرباح المحتجزة" },
};

function FinancialUpload() {
  const [files, setFiles] = useState<Record<StatementKey, File | null>>({ bs: null, is: null, cf: null, eq: null });
  const [notes, setNotes] = useState<Record<StatementKey, string>>({ bs: "", is: "", cf: "", eq: "" });

  return (
    <div className="space-y-3">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          ارفع القوائم المالية للمراجعة والتدقيق (PDF / Excel / صورة). الملفات تبقى في متصفحك ولا تُرفع لأي خادم.
        </AlertDescription>
      </Alert>
      <div className="grid md:grid-cols-2 gap-3">
        {(Object.keys(STATEMENT_LABELS) as StatementKey[]).map((k) => {
          const f = files[k];
          return (
            <div key={k} className="rounded-lg border p-3 space-y-2 bg-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h5 className="text-sm font-semibold flex items-center gap-1.5"><FileText className="h-4 w-4 text-primary" />{STATEMENT_LABELS[k].title}</h5>
                  <p className="text-[11px] text-muted-foreground">{STATEMENT_LABELS[k].desc}</p>
                </div>
                {f && (
                  <button onClick={() => setFiles((p) => ({ ...p, [k]: null }))} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {f ? (
                <div className="text-xs bg-muted/50 rounded p-2 truncate">📎 {f.name} <span className="text-muted-foreground">({(f.size / 1024).toFixed(1)} KB)</span></div>
              ) : (
                <label className="flex items-center justify-center gap-2 text-xs rounded-md border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer py-3 transition">
                  <Upload className="h-4 w-4" /> رفع ملف
                  <input
                    type="file" className="hidden" accept=".pdf,.xls,.xlsx,.csv,image/*"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) setFiles((p) => ({ ...p, [k]: file })); }}
                  />
                </label>
              )}
              <Textarea
                placeholder="ملاحظات المراجع / بنود تحتاج تدقيق..."
                value={notes[k]} onChange={(e) => setNotes((p) => ({ ...p, [k]: e.target.value }))}
                className="text-xs min-h-[60px]"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompanyTab() {
  // ---- بيانات الشركة + الدولة والإطار القانوني ----
  const [countryCode, setCountryCode] = useState<string>("SA");
  const country = useMemo(() => COUNTRIES.find((c) => c.code === countryCode)!, [countryCode]);
  const [autoCurrency, setAutoCurrency] = useState(true);
  const [currencyName, setCurrencyName] = useState(country.symbol);

  const [companyType, setCompanyType] = useState<string>(country.companyTypes[0]);
  useEffect(() => {
    if (autoCurrency) setCurrencyName(country.symbol);
    if (!country.companyTypes.includes(companyType)) setCompanyType(country.companyTypes[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, autoCurrency]);

  const [companyName, setCompanyName] = useState("");
  const [crNumber, setCrNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [zakatId, setZakatId] = useState("");
  const [accountingStd, setAccountingStd] = useState<string>("IFRS");
  const [consolidated, setConsolidated] = useState(false);

  const [fiscalStart, setFiscalStart] = useState("");
  const [fiscalEnd, setFiscalEnd] = useState("");
  const [hawlStart, setHawlStart] = useState(""); // تاريخ ميلاد حول الزكاة المنفصل
  const [solarYear, setSolarYear] = useState<"hijri" | "solar">("hijri");

  const hijriEq = useMemo(() => {
    const g = fiscalEnd ? new Date(fiscalEnd).getFullYear() : (fiscalStart ? new Date(fiscalStart).getFullYear() : 0);
    return g ? gregorianToHijri(g) : 0;
  }, [fiscalEnd, fiscalStart]);

  // طبيعة المؤسسة والقطاع
  const [orgKind, setOrgKind] = useState<"profit" | "nonprofit">("profit");
  const [sectorId, setSectorId] = useState<string>("trade_w");
  const sector = useMemo(() => SECTORS.find((s) => s.id === sectorId)!, [sectorId]);

  // سعر جرام الذهب للتحقق من النصاب
  const [goldGramPrice, setGoldGramPrice] = useState("415");

  // هيكل المساهمين (نسب %)
  const [shGcc, setShGcc] = useState("100");      // سعودي/خليجي/مواطن مسلم → خاضع للزكاة
  const [shForeign, setShForeign] = useState(""); // أجنبي → ضريبة دخل لا زكاة
  const [shGovt, setShGovt] = useState("");       // حكومي → معفى
  const [shWaqf, setShWaqf] = useState("");       // وقفي → معفى
  const [shNonMuslim, setShNonMuslim] = useState(""); // غير مسلم → معفى من الزكاة

  // طريقة الحساب
  const [method, setMethod] = useState<"net_assets" | "working_capital">("net_assets");
  const [cash, setCash] = useState("");
  const [banks, setBanks] = useState("");
  const [receivablesCo, setReceivablesCo] = useState("");
  const [doubtfulDebts, setDoubtfulDebts] = useState(""); // ديون مشكوك فيها (تُخصم)
  const [inventoryCo, setInventoryCo] = useState("");
  const [investments, setInvestments] = useState("");
  const [subsidiaryInv, setSubsidiaryInv] = useState(""); // استثمارات في شركات تابعة (تُعامل خاصة)
  const [otherCurrent, setOtherCurrent] = useState("");
  const [stPayables, setStPayables] = useState("");
  const [accruals, setAccruals] = useState("");
  const [taxDue, setTaxDue] = useState("");
  const [stLoans, setStLoans] = useState("");
  const [equity, setEquity] = useState("");
  const [ltLiabilities, setLtLiabilities] = useState("");
  const [fixedAssets, setFixedAssets] = useState("");
  const [intangibles, setIntangibles] = useState("");
  const [losses, setLosses] = useState("");

  // الامتثال الشرعي
  const [compliance, setCompliance] = useState<Record<string, boolean>>({});
  const toggleC = (id: string) => setCompliance((p) => ({ ...p, [id]: !p[id] }));

  // ===== حفظ واسترجاع محلي =====
  const STORAGE_KEY = "zakat_company_v1";
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      const set = (fn: (v: string) => void, key: string) => d[key] !== undefined && fn(d[key]);
      set(setCountryCode, "countryCode"); set(setCompanyName, "companyName"); set(setCrNumber, "crNumber");
      set(setTaxId, "taxId"); set(setZakatId, "zakatId"); set(setFiscalStart, "fiscalStart");
      set(setFiscalEnd, "fiscalEnd"); set(setHawlStart, "hawlStart"); set(setSectorId, "sectorId");
      set(setGoldGramPrice, "goldGramPrice"); set(setShGcc, "shGcc"); set(setShForeign, "shForeign");
      set(setShGovt, "shGovt"); set(setShWaqf, "shWaqf"); set(setShNonMuslim, "shNonMuslim");
      set(setCash, "cash"); set(setBanks, "banks"); set(setReceivablesCo, "receivablesCo");
      set(setDoubtfulDebts, "doubtfulDebts"); set(setInventoryCo, "inventoryCo");
      set(setInvestments, "investments"); set(setSubsidiaryInv, "subsidiaryInv");
      set(setOtherCurrent, "otherCurrent"); set(setStPayables, "stPayables"); set(setAccruals, "accruals");
      set(setTaxDue, "taxDue"); set(setStLoans, "stLoans"); set(setEquity, "equity");
      set(setLtLiabilities, "ltLiabilities"); set(setFixedAssets, "fixedAssets");
      set(setIntangibles, "intangibles"); set(setLosses, "losses");
      if (d.compliance) setCompliance(d.compliance);
      if (d.accountingStd) setAccountingStd(d.accountingStd);
      if (typeof d.consolidated === "boolean") setConsolidated(d.consolidated);
      if (d.solarYear) setSolarYear(d.solarYear);
      if (d.orgKind) setOrgKind(d.orgKind);
      if (d.method) setMethod(d.method);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveLocal = () => {
    const payload = {
      countryCode, companyName, crNumber, taxId, zakatId, accountingStd, consolidated,
      fiscalStart, fiscalEnd, hawlStart, solarYear, orgKind, sectorId, goldGramPrice,
      shGcc, shForeign, shGovt, shWaqf, shNonMuslim,
      method, cash, banks, receivablesCo, doubtfulDebts, inventoryCo, investments, subsidiaryInv,
      otherCurrent, stPayables, accruals, taxDue, stLoans,
      equity, ltLiabilities, fixedAssets, intangibles, losses, compliance,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const calc = useMemo(() => {
    // الموجودات الزكوية مع خصم الديون المشكوك فيها
    const grossAssets = num(cash) + num(banks) + num(receivablesCo) + num(inventoryCo)
      + num(investments) + num(subsidiaryInv) + num(otherCurrent);
    const curAssets = grossAssets - num(doubtfulDebts);
    const curLiabs = num(stPayables) + num(accruals) + num(taxDue) + num(stLoans);
    const netAssets = curAssets - curLiabs;
    const workingCapital = num(equity) + num(ltLiabilities) - num(fixedAssets) - num(intangibles) - num(losses);
    const baseGross = method === "net_assets" ? netAssets : workingCapital;

    // استبعاد الحصص المعفاة من الوعاء
    const exemptPct = (num(shForeign) + num(shGovt) + num(shWaqf) + num(shNonMuslim)) / 100;
    const zakatableRatio = Math.max(0, 1 - exemptPct);
    const base = baseGross * zakatableRatio;

    // النصاب
    const nisabValue = num(goldGramPrice) * GOLD_NISAB_GRAMS;
    const reachesNisab = base >= nisabValue && nisabValue > 0;

    const rate = solarYear === "solar" ? 0.025775 : ZAKAT_RATE;
    const zakat = (orgKind === "nonprofit" || !reachesNisab) ? 0 : base > 0 ? base * rate : 0;

    const completed = Object.values(compliance).filter(Boolean).length;
    const complianceScore = Math.round((completed / ALL_ITEM_IDS.length) * 100);

    const totalShares = num(shGcc) + num(shForeign) + num(shGovt) + num(shWaqf) + num(shNonMuslim);
    const sharesBalanced = Math.abs(totalShares - 100) < 0.01;

    return {
      grossAssets, curAssets, curLiabs, netAssets, workingCapital, baseGross, base,
      rate, zakat, completed, complianceScore,
      nisabValue, reachesNisab, exemptPct, zakatableRatio, totalShares, sharesBalanced,
    };
  }, [
    cash, banks, receivablesCo, doubtfulDebts, inventoryCo, investments, subsidiaryInv, otherCurrent,
    stPayables, accruals, taxDue, stLoans,
    equity, ltLiabilities, fixedAssets, intangibles, losses,
    method, solarYear, compliance, orgKind, goldGramPrice,
    shGcc, shForeign, shGovt, shWaqf, shNonMuslim,
  ]);

  return (
    <Tabs defaultValue="zakat" className="space-y-6">
      <TabsList className="grid grid-cols-2 w-full max-w-2xl mx-auto h-auto">
        <TabsTrigger value="zakat" className="gap-2 text-sm py-2.5">
          <Calculator className="h-4 w-4" /> حساب زكاة الشركة
        </TabsTrigger>
        <TabsTrigger value="audit" className="gap-2 text-sm py-2.5">
          <Gavel className="h-4 w-4" /> التدقيق والامتثال والحوكمة الشرعية
        </TabsTrigger>
      </TabsList>

      {/* ======================= تبويب الحساب ======================= */}
      <TabsContent value="zakat" className="grid lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2 space-y-6">
          {/* بيانات الشركة + الدولة والإطار القانوني (مدمج) */}
          <Card className="shadow-soft border-primary/20">
            <CardHeader className="bg-gradient-to-l from-primary/10 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                بيانات الشركة والإطار القانوني
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                تتحدد العملة وأنواع الشركات المتاحة وفقاً للدولة وقانون الشركات المعمول به.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* الدولة والعملة */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Scale className="h-3.5 w-3.5" />الدولة</Label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="ml-2">{c.flag}</span> {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center justify-between">
                    <span>عملة القوائم المالية</span>
                    <label className="flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground">
                      <Checkbox checked={autoCurrency} onCheckedChange={(v) => setAutoCurrency(!!v)} className="h-3.5 w-3.5" />
                      تلقائي حسب الدولة ({country.currency})
                    </label>
                  </Label>
                  <Input
                    value={currencyName}
                    onChange={(e) => { setAutoCurrency(false); setCurrencyName(e.target.value); }}
                  />
                </div>
              </div>

              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">
                  <b>{country.flag} {country.law}</b>
                  <br />
                  <span className="text-muted-foreground">{country.authority}{country.note ? ` — ${country.note}` : ""}</span>
                </AlertDescription>
              </Alert>

              {/* الاسم والنوع */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>اسم الشركة</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="مثال: شركة النخبة للتجارة" />
                </div>
                <div className="space-y-1.5">
                  <Label>نوع الشركة (وفق قانون {country.name})</Label>
                  <Select value={companyType} onValueChange={setCompanyType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {country.companyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      {GENERIC_TYPES.filter((g) => !country.companyTypes.includes(g)).map((t) => (
                        <SelectItem key={t} value={t}>{t} (عام)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* أرقام تعريفية + معيار محاسبي */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">رقم السجل التجاري</Label>
                  <Input value={crNumber} onChange={(e) => setCrNumber(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">الرقم الضريبي (TIN)</Label>
                  <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">الرقم الزكوي</Label>
                  <Input value={zakatId} onChange={(e) => setZakatId(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">المعيار المحاسبي</Label>
                  <Select value={accountingStd} onValueChange={setAccountingStd}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IFRS">IFRS — المعايير الدولية</SelectItem>
                      <SelectItem value="SOCPA">SOCPA — السعودي</SelectItem>
                      <SelectItem value="AAOIFI">AAOIFI — المالية الإسلامية</SelectItem>
                      <SelectItem value="EAS">EAS — المصري</SelectItem>
                      <SelectItem value="GAAP">US GAAP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={consolidated} onCheckedChange={(v) => setConsolidated(!!v)} />
                قوائم مالية مُوحّدة (Consolidated) — تشمل الشركات التابعة
              </label>

              {/* السنة المالية */}
              <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                <Label className="font-semibold">السنة المالية</Label>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">بداية السنة المالية</Label>
                    <Input type="date" value={fiscalStart} onChange={(e) => setFiscalStart(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">نهاية السنة المالية</Label>
                    <Input type="date" value={fiscalEnd} onChange={(e) => setFiscalEnd(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">نوع السنة المحاسبية</Label>
                    <RadioGroup value={solarYear} onValueChange={(v) => setSolarYear(v as "hijri" | "solar")} className="flex gap-3 pt-1.5">
                      <div className="flex items-center gap-1.5"><RadioGroupItem value="hijri" id="hij" /><Label htmlFor="hij" className="text-xs">قمرية 2.5%</Label></div>
                      <div className="flex items-center gap-1.5"><RadioGroupItem value="solar" id="sol" /><Label htmlFor="sol" className="text-xs">شمسية 2.5775%</Label></div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-1.5 md:col-span-3">
                    <Label className="text-xs">تاريخ ميلاد حول الزكاة (إن اختلف عن السنة المالية)</Label>
                    <Input type="date" value={hawlStart} onChange={(e) => setHawlStart(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground">العبرة في وجوب الزكاة بحولان الحول الهجري على المال، لا بالسنة المالية للشركة.</p>
                  </div>
                </div>
                {hijriEq > 0 && (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline">ما يعادله هجرياً</Badge>
                    السنة الميلادية {new Date(fiscalEnd || fiscalStart).getFullYear()} ≈ <b>{hijriEq}هـ</b>
                  </div>
                )}
              </div>

              {/* طبيعة المؤسسة + قطاع النشاط */}
              <div className="space-y-3">
                <div>
                  <Label className="mb-2 block">طبيعة المؤسسة</Label>
                  <RadioGroup value={orgKind} onValueChange={(v) => setOrgKind(v as "profit" | "nonprofit")} className="flex flex-wrap gap-3">
                    <label className={`flex items-center gap-2 rounded-md border-2 px-4 py-2 cursor-pointer transition ${orgKind === "profit" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <RadioGroupItem value="profit" id="pf" /><span>ربحية</span>
                    </label>
                    <label className={`flex items-center gap-2 rounded-md border-2 px-4 py-2 cursor-pointer transition ${orgKind === "nonprofit" ? "border-destructive bg-destructive/5" : "border-border"}`}>
                      <RadioGroupItem value="nonprofit" id="np" /><span>غير ربحية</span>
                    </label>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="mb-2 block">قطاع النشاط</Label>
                  <Select value={sectorId} onValueChange={setSectorId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["primary","industrial","commercial","services"] as const).map((g) => (
                        <div key={g}>
                          <div className="px-2 py-1 text-[11px] font-bold text-primary bg-primary/5">{GROUP_LABELS[g]}</div>
                          {SECTORS.filter((s) => s.group === g).map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    <Info className="h-3 w-3 inline mr-1" />
                    سيتم فتح النموذج القطاعي المناسب تلقائياً أدناه: <b>{sector.label}</b>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {orgKind === "nonprofit" && (
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs">
                المؤسسات غير الربحية لا تجب عليها الزكاة في الأصل (لانتفاء الملك التام والقصد التجاري). يبقى التدقيق الشرعي لازماً لمواردها ومصارفها.
              </AlertDescription>
            </Alert>
          )}

          {/* هيكل المساهمين والإعفاءات */}
          <Card className="shadow-soft border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                هيكل المساهمين والإعفاءات الزكوية
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                تطبيق نظام {country.flag} {country.name}: حصص المسلمين الخليجيين/المواطنين خاضعة للزكاة،
                وحصص الأجانب تخضع لضريبة الدخل، وحصص الجهات الحكومية والوقفية وغير المسلمين معفاة من الزكاة.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <NumField label="حصة المواطنين/الخليجيين المسلمين" value={shGcc} onChange={setShGcc} unit="%" hint="خاضعة للزكاة" />
                <NumField label="حصة الأجانب" value={shForeign} onChange={setShForeign} unit="%" hint="ضريبة دخل بدلاً من الزكاة" />
                <NumField label="حصة الجهات الحكومية" value={shGovt} onChange={setShGovt} unit="%" hint="معفاة" />
                <NumField label="حصة الجهات الوقفية" value={shWaqf} onChange={setShWaqf} unit="%" hint="معفاة" />
                <NumField label="حصة غير المسلمين" value={shNonMuslim} onChange={setShNonMuslim} unit="%" hint="معفاة من الزكاة" />
              </div>
              <div className={`rounded-lg p-3 text-sm flex items-center justify-between ${calc.sharesBalanced ? "bg-primary/5 border border-primary/20" : "bg-destructive/5 border border-destructive/30"}`}>
                <span>إجمالي الحصص:</span>
                <b>{fmt(calc.totalShares)}% {!calc.sharesBalanced && <span className="text-destructive text-xs"> — يجب أن يساوي 100%</span>}</b>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                <div className="flex justify-between"><span>نسبة الحصص المعفاة:</span><b>{(calc.exemptPct * 100).toFixed(2)}%</b></div>
                <div className="flex justify-between text-primary"><span>نسبة الوعاء الخاضع للزكاة:</span><b>{(calc.zakatableRatio * 100).toFixed(2)}%</b></div>
              </div>
            </CardContent>
          </Card>

          {/* النصاب */}
          <Card className="shadow-soft border-gold/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-gold" />
                التحقق من النصاب الشرعي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <NumField label="سعر جرام الذهب عيار 24 اليوم" value={goldGramPrice} onChange={setGoldGramPrice} unit={currencyName} hint="يُستخدم لحساب نصاب 85 جرام" />
                <div className="rounded-lg bg-muted/40 p-3 text-sm flex flex-col justify-center">
                  <div className="flex justify-between"><span>قيمة النصاب (85 جرام ذهب):</span><b>{cFmt(calc.nisabValue, currencyName)}</b></div>
                  <div className="flex justify-between mt-1">
                    <span>حالة الوعاء:</span>
                    <Badge variant={calc.reachesNisab ? "default" : "destructive"}>
                      {calc.reachesNisab ? "بلغ النصاب — تجب الزكاة" : "لم يبلغ النصاب — لا زكاة"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* طريقة حساب الزكاة */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                طريقة حساب زكاة الشركة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={method} onValueChange={(v) => setMethod(v as "net_assets" | "working_capital")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="net_assets">صافي الموجودات الزكوية</TabsTrigger>
                  <TabsTrigger value="working_capital">رأس المال العامل</TabsTrigger>
                </TabsList>

                <TabsContent value="net_assets" className="space-y-4 pt-4">
                  <Alert className="border-primary/20 bg-primary/5">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <b>الموجودات المتداولة الزكوية − المطلوبات المتداولة</b> ثم تُضرب الناتج × 2.5%. تستخدمها هيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية (AAOIFI).
                    </AlertDescription>
                  </Alert>
                  <div>
                    <h4 className="font-semibold mb-3 text-primary">الموجودات المتداولة الزكوية</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <NumField label="النقدية في الصندوق" value={cash} onChange={setCash} unit={currencyName} />
                      <NumField label="أرصدة البنوك" value={banks} onChange={setBanks} unit={currencyName} />
                      <NumField label="العملاء والمدينون" value={receivablesCo} onChange={setReceivablesCo} unit={currencyName} hint="بعد استبعاد المشكوك" />
                      <NumField label="المخزون (بسعر السوق)" value={inventoryCo} onChange={setInventoryCo} unit={currencyName} />
                      <NumField label="استثمارات قصيرة الأجل" value={investments} onChange={setInvestments} unit={currencyName} hint="للمضاربة — تُزكى بالقيمة السوقية" />
                      <NumField label="استثمارات في شركات تابعة/شقيقة" value={subsidiaryInv} onChange={setSubsidiaryInv} unit={currencyName} hint="نصيب المستثمر من زكاتها يُضاف هنا" />
                      <NumField label="الديون المشكوك في تحصيلها (تُخصم)" value={doubtfulDebts} onChange={setDoubtfulDebts} unit={currencyName} hint="تُحسم من العملاء" />
                      <NumField label="أصول متداولة أخرى" value={otherCurrent} onChange={setOtherCurrent} unit={currencyName} />
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 text-destructive">المطلوبات المتداولة (تُخصم)</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <NumField label="موردون ودائنون" value={stPayables} onChange={setStPayables} unit={currencyName} />
                      <NumField label="مصروفات مستحقة" value={accruals} onChange={setAccruals} unit={currencyName} />
                      <NumField label="ضرائب مستحقة" value={taxDue} onChange={setTaxDue} unit={currencyName} />
                      <NumField label="قروض قصيرة الأجل" value={stLoans} onChange={setStLoans} unit={currencyName} />
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
                    <div className="flex justify-between"><span>إجمالي الموجودات الزكوية:</span><b>{cFmt(calc.curAssets, currencyName)}</b></div>
                    <div className="flex justify-between"><span>إجمالي المطلوبات المتداولة:</span><b>{cFmt(calc.curLiabs, currencyName)}</b></div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-primary"><span>صافي الوعاء الزكوي:</span><b>{cFmt(calc.netAssets, currencyName)}</b></div>
                  </div>
                </TabsContent>

                <TabsContent value="working_capital" className="space-y-4 pt-4">
                  <Alert className="border-primary/20 bg-primary/5">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <b>(حقوق الملكية + المطلوبات طويلة الأجل) − (الأصول الثابتة + الأصول غير الملموسة + الخسائر)</b> ثم × 2.5%. تعتمدها مصلحة الزكاة السعودية (هيئة الزكاة والضريبة والجمارك).
                    </AlertDescription>
                  </Alert>
                  <div className="grid md:grid-cols-2 gap-4">
                    <NumField label="حقوق الملكية" value={equity} onChange={setEquity} unit={currencyName} />
                    <NumField label="المطلوبات طويلة الأجل" value={ltLiabilities} onChange={setLtLiabilities} unit={currencyName} />
                    <NumField label="الأصول الثابتة (تُخصم)" value={fixedAssets} onChange={setFixedAssets} unit={currencyName} />
                    <NumField label="الأصول غير الملموسة (تُخصم)" value={intangibles} onChange={setIntangibles} unit={currencyName} />
                    <NumField label="الخسائر المتراكمة (تُخصم)" value={losses} onChange={setLosses} unit={currencyName} />
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-sm">
                    <div className="flex justify-between text-primary"><span>الوعاء الزكوي (رأس المال العامل):</span><b>{cFmt(calc.workingCapital, currencyName)}</b></div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* النموذج القطاعي مرتبط بقطاع النشاط المحدد */}
          <Card className="shadow-soft border-gold/30">
            <CardHeader className="bg-gradient-to-l from-gold/10 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                النموذج القطاعي التفصيلي
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                مرتبط بقطاع النشاط المختار أعلاه: <b>{sector.label}</b> — يمكنك تغيير التبويب القطاعي بحرية للمقارنة.
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <SectoralModels activeTab={sector.model} defaultCurrency={currencyName} />
            </CardContent>
          </Card>

          {/* حاسبة التطهير الشرعي */}
          <PurificationCalculator currencyName={currencyName} />
        </div>

        {/* النتيجة الجانبية */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="flex gap-2 print:hidden">
            <Button onClick={saveLocal} variant="outline" size="sm" className="flex-1 gap-1.5">
              <Save className="h-3.5 w-3.5" /> حفظ
            </Button>
            <Button onClick={() => window.print()} variant="outline" size="sm" className="flex-1 gap-1.5">
              <Printer className="h-3.5 w-3.5" /> تصدير PDF
            </Button>
          </div>

          <Card className="bg-gradient-primary text-primary-foreground shadow-gold border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary-foreground">
                <Calculator className="h-5 w-5" /> زكاة الشركة المستحقة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tight">
                {fmt(calc.zakat)}
                <span className="text-lg font-medium opacity-80 mr-2">{currencyName}</span>
              </div>
              {!calc.reachesNisab && calc.base > 0 && (
                <p className="text-xs mt-2 bg-destructive/30 rounded px-2 py-1">⚠️ الوعاء لم يبلغ النصاب ({cFmt(calc.nisabValue, currencyName)})</p>
              )}
              <p className="text-xs opacity-80 mt-3">النسبة: <b>{(calc.rate * 100).toFixed(4)}%</b> ({solarYear === "hijri" ? "قمري" : "شمسي"})</p>
              <p className="text-xs opacity-80">الطريقة: <b>{method === "net_assets" ? "صافي الموجودات" : "رأس المال العامل"}</b></p>
              <p className="text-xs opacity-80 mt-1">{country.flag} {country.name} — {companyType}</p>
              <p className="text-xs opacity-80">{GROUP_LABELS[sector.group]} — {sector.label}</p>
              {companyName && <p className="text-xs opacity-80 mt-1 font-bold">{companyName}</p>}
              <p className="text-[10px] opacity-60 mt-2">المعيار: {accountingStd}{consolidated ? " — موحّدة" : ""}</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CheckSquare className="h-4 w-4" />ملخص الوعاء</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">الوعاء الإجمالي:</span><b>{cFmt(calc.baseGross, currencyName)}</b></div>
              {calc.exemptPct > 0 && (
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">حصص معفاة:</span><b className="text-destructive">−{(calc.exemptPct * 100).toFixed(1)}%</b></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">الوعاء الخاضع:</span><b>{cFmt(calc.base, currencyName)}</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">النصاب:</span><b>{cFmt(calc.nisabValue, currencyName)}</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">النسبة:</span><b>{(calc.rate * 100).toFixed(4)}%</b></div>
              <Separator />
              <div className="flex justify-between text-primary"><span>الزكاة الواجبة:</span><b>{cFmt(calc.zakat, currencyName)}</b></div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ======================= تبويب التدقيق والامتثال ======================= */}
      <TabsContent value="audit" className="grid lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2 space-y-6">
          {/* رفع القوائم المالية */}
          <Card className="shadow-soft border-primary/20">
            <CardHeader className="bg-gradient-to-l from-primary/10 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                رفع القوائم المالية للمراجعة والتدقيق
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                ارفق قائمة المركز المالي وقائمة الدخل وقائمة التدفقات النقدية وقائمة التغيرات في حقوق الملكية لمراجعة بنود الوعاء الزكوي والامتثال الشرعي.
              </p>
            </CardHeader>
            <CardContent>
              <FinancialUpload />
            </CardContent>
          </Card>

          {/* قائمة التدقيق الشرعي */}
          <Card className="border-primary/30 shadow-soft">
            <CardHeader className="bg-gradient-to-l from-primary/10 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-primary" />
                قائمة التدقيق والامتثال الشرعي الشاملة
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                قائمة مهنية مرجعية وفق معايير AAOIFI والمعايير الفقهية للهيئات الشرعية وهيئات الزكاة المعتمدة.
              </p>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {COMPLIANCE_SECTIONS.map((section) => {
                const done = section.items.filter((i) => compliance[i.id]).length;
                return (
                  <div key={section.title} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-primary text-sm">{section.title}</h4>
                      <Badge variant="outline" className="text-xs">{done} / {section.items.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {section.items.map((item) => (
                        <label key={item.id} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/40 transition-colors">
                          <Checkbox checked={!!compliance[item.id]} onCheckedChange={() => toggleC(item.id)} className="mt-0.5" />
                          <span className="text-sm leading-relaxed">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" /> مؤشر الامتثال الشرعي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-bold text-primary">{calc.complianceScore}%</span>
                <Badge variant={calc.complianceScore >= 80 ? "default" : calc.complianceScore >= 50 ? "secondary" : "destructive"}>
                  {calc.complianceScore >= 80 ? "ممتاز" : calc.complianceScore >= 50 ? "مقبول" : "يحتاج مراجعة"}
                </Badge>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-l from-primary to-gold transition-all" style={{ width: `${calc.complianceScore}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{calc.completed} من {ALL_ITEM_IDS.length} بند مُحقَّق</p>
              {calc.complianceScore < 80 && (
                <Alert className="mt-3 border-destructive/30 bg-destructive/5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-xs">
                    يُنصح بإكمال بنود المراجعة لضمان صحة احتساب الزكاة شرعاً ومحاسبياً.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />سياق المنشأة</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1.5 text-muted-foreground">
              <div>{country.flag} <b className="text-foreground">{country.name}</b></div>
              <div>الإطار: {country.law}</div>
              <div>الجهة: {country.authority}</div>
              {companyName && <div>الشركة: <b className="text-foreground">{companyName}</b></div>}
              <div>النوع: {companyType}</div>
              <div>القطاع: {GROUP_LABELS[sector.group]} — {sector.label}</div>
              {hijriEq > 0 && <div>السنة المالية ≈ {hijriEq}هـ</div>}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
