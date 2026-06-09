import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BookOpen, Search, ExternalLink, Globe2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TRADE_ACTIVITIES, TRADE_GROUP_LABELS, CLASSIFICATION_REFS,
  type TradeActivityGroup, type TradeActivityRow,
} from "@/lib/tradeClassifications";

export interface CompanyTradeClassificationValue {
  /** كود التصنيف المختار وفق معيار الدولة */
  code: string;
  /** اسم النشاط */
  name: string;
  /** المعيار المُستخدم */
  standard: "ISIC" | "CAPMAS" | "NACE" | "NAICS" | "UKSIC";
  /** المجموعة */
  group: TradeActivityGroup | "";
}

export function emptyCompanyTradeClassification(): CompanyTradeClassificationValue {
  return { code: "", name: "", standard: "ISIC", group: "" };
}

/** خريطة الدولة → معيار التصنيف الرسمي المعتمد لديها */
const COUNTRY_STANDARD: Record<string, CompanyTradeClassificationValue["standard"]> = {
  EG: "CAPMAS",
  SA: "ISIC", AE: "ISIC", KW: "ISIC", QA: "ISIC", BH: "ISIC", OM: "ISIC",
  JO: "ISIC", MA: "ISIC", DZ: "ISIC", TN: "ISIC", LY: "ISIC",
  MY: "ISIC", TR: "ISIC",
  GB: "UKSIC", UK: "UKSIC",
  US: "NAICS", CA: "NAICS", MX: "NAICS",
  FR: "NACE", DE: "NACE", IT: "NACE", ES: "NACE", NL: "NACE", BE: "NACE",
};

const STANDARD_LABELS: Record<CompanyTradeClassificationValue["standard"], string> = {
  CAPMAS: "التصنيف المصري الموحد (CAPMAS / ISIC Rev.4)",
  ISIC: "ISIC Rev.4 (الأمم المتحدة — الخليج/الأردن/أغلب الدول العربية)",
  NACE: "NACE Rev.2 (الاتحاد الأوروبي)",
  NAICS: "NAICS 2022 (الولايات المتحدة وكندا والمكسيك)",
  UKSIC: "UK SIC 2007 (المملكة المتحدة)",
};

/** ربط معرّف القطاع من تبويب الشركات بمجموعة الأنشطة لتقليل قائمة البحث */
const SECTOR_TO_GROUPS: Record<string, TradeActivityGroup[]> = {
  // أولى
  agri: ["agriculture"], livestock: ["agriculture"], forestry: ["agriculture"], fishing: ["agriculture"],
  minerals: ["industry"], oilgas: ["industry"], quarries: ["industry"],
  // صناعي
  manuf: ["industry"], food: ["industry", "food"], pharma: ["industry"], textile: ["industry"],
  auto: ["industry"], renewable: ["industry"], utilities: ["services", "industry"], construct: ["construction"],
  // تجاري
  trade_w: ["wholesale", "retail"], import: ["wholesale"],
  ecommerce: ["retail"], gold_trade: ["retail", "wholesale"], used_goods: ["retail"],
  // خدمي
  islamic_fin: ["services"], takaful: ["services"], consult: ["services"],
  health: ["services"], education: ["services"],
  tourism: ["tourism", "food"], transport: ["transport"],
  software: ["tech"], media: ["tech", "services"], realestate: ["services"],
};

interface Props {
  countryCode: string;
  countryName?: string;
  /** المعرف الفني للقطاع المختار في تبويب الشركات (لتقليل البحث) */
  sectorId?: string;
  /** التسمية البشرية للقطاع المختار (للعرض فقط) */
  sectorLabel?: string;
  value: CompanyTradeClassificationValue;
  onChange: (next: CompanyTradeClassificationValue) => void;
}

export default function CompanyTradeClassification({
  countryCode, countryName, sectorId, sectorLabel, value, onChange,
}: Props) {
  const standard = COUNTRY_STANDARD[countryCode] ?? "ISIC";
  const [filter, setFilter] = useState<TradeActivityGroup | "all">("all");
  const [q, setQ] = useState("");
  const [scopeToSector, setScopeToSector] = useState(true);

  // مزامنة المعيار تلقائيًا مع الدولة عند تغييرها
  if (value.standard !== standard && value.code === "") {
    // تحديث صامت — فقط عندما لا يوجد اختيار سابق
    queueMicrotask(() => onChange({ ...value, standard }));
  }

  const sectorGroups = sectorId ? SECTOR_TO_GROUPS[sectorId] : undefined;

  const rows = useMemo<TradeActivityRow[]>(() => {
    const term = q.trim().toLowerCase();
    return TRADE_ACTIVITIES.filter((r) => {
      if (filter !== "all" && r.group !== filter) return false;
      if (scopeToSector && sectorGroups && !sectorGroups.includes(r.group)) return false;
      if (!term) return true;
      return (
        r.nameAr.toLowerCase().includes(term) ||
        r.egyCode.includes(term) ||
        r.isic.includes(term) ||
        r.nace.toLowerCase().includes(term) ||
        r.naics.includes(term) ||
        r.ukSic.includes(term)
      );
    });
  }, [filter, q, scopeToSector, sectorGroups]);

  /** اختيار العمود المُبرز حسب معيار الدولة */
  const codeOf = (r: TradeActivityRow) => {
    switch (standard) {
      case "CAPMAS": return r.egyCode;
      case "NACE":   return r.nace;
      case "NAICS":  return r.naics;
      case "UKSIC":  return r.ukSic;
      default:       return r.isic;
    }
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <BookOpen className="h-4 w-4" />
          تصنيف نشاط الشركة — حسب الدولة والقطاع
        </div>
        {value.code && (
          <Badge variant="secondary" className="text-[11px]">
            مختار: {value.code} — {value.name}
          </Badge>
        )}
      </div>

      <Alert className="border-primary/15 bg-background">
        <Globe2 className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed text-right">
          المعيار المعتمد لدولة <b>{countryName ?? countryCode}</b> هو: <b>{STANDARD_LABELS[standard]}</b>.
          يتم تصفية الأنشطة تلقائيًا وفق <b>قطاع النشاط</b> المختار أعلاه{sectorLabel ? ` (${sectorLabel})` : ""}
          لتسريع الوصول، مع إمكانية البحث في كل الأنشطة.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم النشاط أو الكود…"
            className="pr-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as TradeActivityGroup | "all")}>
          <SelectTrigger>
            <SelectValue placeholder="كل المجموعات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المجموعات</SelectItem>
            {Object.entries(TRADE_GROUP_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sectorGroups && (
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={scopeToSector}
            onChange={(e) => setScopeToSector(e.target.checked)}
            className="accent-primary"
          />
          <Layers className="h-3.5 w-3.5 text-primary" />
          قصر النتائج على القطاع المختار{sectorLabel ? ` (${sectorLabel})` : ""}
        </label>
      )}

      <div className="rounded-md border bg-background max-h-72 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">النشاط</TableHead>
              <TableHead className="text-right">كود {standard === "CAPMAS" ? "مصر (CAPMAS)" : standard}</TableHead>
              <TableHead className="text-right">إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">
                  لا توجد نتائج مطابقة — جرّب إلغاء قصر القطاع
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const code = codeOf(r);
                const isSelected = value.code === code && value.standard === standard;
                return (
                  <TableRow key={r.egyCode} className={cn(isSelected && "bg-primary/10")}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{r.nameAr}</div>
                      <div className="text-[10px] text-muted-foreground">{TRADE_GROUP_LABELS[r.group]}</div>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums font-bold text-primary">{code}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() =>
                          onChange({ code, name: r.nameAr, standard, group: r.group })
                        }
                      >
                        {isSelected ? "مختار" : "اختر"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <details className="rounded-md border bg-background p-3 text-xs">
        <summary className="cursor-pointer font-semibold">المراجع الرسمية للتصنيفات الدولية</summary>
        <ul className="mt-2 space-y-1">
          {CLASSIFICATION_REFS.map((ref) => (
            <li key={ref.url} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{ref.country}</span>
              <a
                href={ref.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {ref.name} <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
