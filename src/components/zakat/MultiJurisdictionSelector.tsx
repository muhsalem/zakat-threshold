import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, ShieldCheck, CheckCircle2, Landmark } from "lucide-react";
import { toast } from "sonner";

export interface JurisdictionConfig {
  code: string;
  name: string;
  flag: string;
  authority: string;
  defaultMadhab: string;
  nisabPriority: "silver" | "gold";
  taxExemptNote: string;
}

export const JURISDICTIONS: JurisdictionConfig[] = [
  {
    code: "SA",
    name: "المملكة العربية السعودية",
    flag: "🇸🇦",
    authority: "هيئة الزكاة والضريبة والجمارك (ZATCA) · هيئة كبار العلماء",
    defaultMadhab: "حنبلي / معاصر",
    nisabPriority: "silver",
    taxExemptNote: "تُحسب الزكاة كالتزام رسمي إلزامي للشركات الوطنية ومؤسسات الأعمال.",
  },
  {
    code: "EG",
    name: "جمهورية مصر العربية",
    flag: "🇪🇬",
    authority: "دار الإفتاء المصرية · بيت الزكاة والصدقات (إشراف الأزهر)",
    defaultMadhab: "شافعي / حنفي",
    nisabPriority: "silver",
    taxExemptNote: "تعتبر الزكاة اختيارية وتُخصم من التكاليف واجبة الخصم ضريبياً في حدود النسبة القانونية.",
  },
  {
    code: "AE",
    name: "الإمارات العربية المتحدة",
    flag: "🇦🇪",
    authority: "صندوق الزكاة الإماراتي · الهيئة العامة للشؤون الإسلامية",
    defaultMadhab: "مالكي / معاصر",
    nisabPriority: "silver",
    taxExemptNote: "تُقبل التقرير الإقراري وتخصم تبرعات الجمعيات المعتمدة رسمياً.",
  },
  {
    code: "KW",
    name: "دولة الكويت",
    flag: "🇰🇼",
    authority: "بيت الزكاة الكويتي · وزارة الأوقاف",
    defaultMadhab: "مالكي / شافعي",
    nisabPriority: "silver",
    taxExemptNote: "يخضع لقوانين تحصيل زكاة الشركات المساهمة العامة والمغلقة (قانون 46/2006).",
  },
  {
    code: "MY",
    name: "ماليزيا (Malaysia)",
    flag: "🇲🇾",
    authority: "Majlis Agama Islam (JAKIM / PPZ)",
    defaultMadhab: "شافعي معتمد",
    nisabPriority: "silver",
    taxExemptNote: "Rebat Zakat - يُخصم اقتطاع الزكاة بالكامل من الضريبة الشخصية والمؤسسية (Tax Rebate).",
  },
  {
    code: "GLOBAL",
    name: "الدولي / معايير AAOIFI",
    flag: "🌐",
    authority: "هيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية (AAOIFI Standard 35)",
    defaultMadhab: "الفقه المقارن المعتمد",
    nisabPriority: "silver",
    taxExemptNote: "المعيار المحاسبي الدولي الشامل المعترف به في المؤسسات والبنوك الإسلامية عالمياً.",
  },
];

interface MultiJurisdictionSelectorProps {
  /** اختياري: يجعل المكوّن مُتحكَّماً به من الحاسبة (دولة الحساب الفعلية) */
  selectedCode?: string;
  onSelectJurisdiction?: (config: JurisdictionConfig) => void;
}

export function MultiJurisdictionSelector({
  selectedCode: controlledCode,
  onSelectJurisdiction,
}: MultiJurisdictionSelectorProps) {
  const [internalCode, setInternalCode] = useState<string>("SA");
  const selectedCode = controlledCode ?? internalCode;
  const setSelectedCode = setInternalCode;

  const currentConfig = JURISDICTIONS.find((j) => j.code === selectedCode) || JURISDICTIONS[0];

  const handleChange = (code: string) => {
    setSelectedCode(code);
    const config = JURISDICTIONS.find((j) => j.code === code) || JURISDICTIONS[0];
    if (onSelectJurisdiction) {
      onSelectJurisdiction(config);
      toast.success(`تم ضبط التشريعات والأنصبة بحسب ${config.name} ${config.flag}`);
    } else {
      toast.info(`عرض مرجعي للتشريعات المعتمدة في ${config.name} ${config.flag}`);
    }
  };

  return (
    <Card className="border-indigo-500/30 bg-card shadow-sm" dir="rtl">
      <CardHeader className="bg-indigo-500/5 border-b pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-600" />
              محدد التشريعات والولايات القضائية الزكوية (Multi-Jurisdiction Selector)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              حدد دولة التكليف لتطبيق المعايير الفقهية والضريبية والهيئات الرسمية المعتمدة محلياً ودولياً.
            </CardDescription>
          </div>

          <Select value={selectedCode} onValueChange={handleChange}>
            <SelectTrigger className="w-[200px] h-9 text-xs">
              <SelectValue placeholder="اختر الدولة" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {JURISDICTIONS.map((j) => (
                <SelectItem key={j.code} value={j.code} className="text-xs">
                  {j.flag} {j.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold">
            <span className="text-foreground flex items-center gap-1.5">
              <Landmark className="h-4 w-4 text-indigo-600" />
              الهيئة الفقهية والرسمية المعتمدة:
            </span>
            <Badge variant="outline" className="text-indigo-700 border-indigo-500/40 text-[10px]">
              {currentConfig.flag} {currentConfig.name}
            </Badge>
          </div>

          <p className="text-indigo-900 dark:text-indigo-200 font-semibold">{currentConfig.authority}</p>

          <div className="pt-1 border-t text-[11px] text-muted-foreground leading-relaxed flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
            <span>{currentConfig.taxExemptNote}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
