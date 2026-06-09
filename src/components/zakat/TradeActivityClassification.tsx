import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
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
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, BookOpen, Search, ExternalLink, Building2, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TRADE_ACTIVITIES, TRADE_GROUP_LABELS, CLASSIFICATION_REFS,
  EGY_SHOP_LICENSES, SHOP_CATEGORY_LABELS, SHOP_HAZARD_LABELS,
  type TradeActivityGroup, type TradeActivityRow,
  type ShopLicenseCategory,
} from "@/lib/tradeClassifications";

export interface TradeActivitySelection {
  /** كود التصنيف المختار */
  code: string;
  /** اسم النشاط */
  name: string;
  /** المجموعة */
  group: TradeActivityGroup | "";
  /** هل النشاط لشركة (لا فردي)؟ */
  isCompany: boolean;
  /** اسم الشركة (اختياري) */
  companyName: string;
  /** تاريخ تشغيل النشاط التجاري (YYYY-MM-DD) */
  startDate: string;
}

export function emptyTradeActivitySelection(): TradeActivitySelection {
  return { code: "", name: "", group: "", isCompany: false, companyName: "", startDate: "" };
}

interface Props {
  value: TradeActivitySelection;
  onChange: (next: TradeActivitySelection) => void;
  /** يُستدعى عند الضغط على «افتح زكاة الشركات» — لتمرير الانتقال للأعلى */
  onOpenCompanyTab?: () => void;
}

export default function TradeActivityClassification({ value, onChange, onOpenCompanyTab }: Props) {
  const [filter, setFilter] = useState<TradeActivityGroup | "all">("all");
  const [q, setQ] = useState("");

  const rows = useMemo<TradeActivityRow[]>(() => {
    const term = q.trim().toLowerCase();
    return TRADE_ACTIVITIES.filter((r) => {
      if (filter !== "all" && r.group !== filter) return false;
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
  }, [filter, q]);

  const selectedRow = useMemo(
    () => TRADE_ACTIVITIES.find((r) => r.egyCode === value.code) || null,
    [value.code],
  );

  const startDateObj = value.startDate ? new Date(value.startDate) : undefined;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <BookOpen className="h-4 w-4" />
          تصنيف النشاط التجاري (مصر — التصنيف الموحد ISIC Rev.4 وما يعادله دوليًا)
        </div>
        {value.code && (
          <Badge variant="secondary" className="text-[11px]">
            مختار: {value.code} — {value.name}
          </Badge>
        )}
      </div>

      <Alert className="border-primary/15 bg-background">
        <ClipboardCheck className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed text-right">
          اختر النشاط ليُحفظ ضمن سجل التدقيق الشرعي ويُربط بحساب الشركة عند الحاجة.
          الأكواد المصرية مطابقة لـ ISIC Rev.4 (تعتمده السعودية ودول الخليج والأردن).
          المقابلات: <b>NACE</b> (الاتحاد الأوروبي) — <b>NAICS</b> (الولايات المتحدة وكندا والمكسيك) — <b>UK SIC</b> (المملكة المتحدة).
        </AlertDescription>
      </Alert>

      {/* بحث وفلتر */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم النشاط أو الكود (مصر/ISIC/NACE/NAICS/UK SIC)…"
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

      {/* جدول التصنيفات */}
      <div className="rounded-md border bg-background max-h-72 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">النشاط</TableHead>
              <TableHead className="text-right">مصر</TableHead>
              <TableHead className="text-right">ISIC</TableHead>
              <TableHead className="text-right">NACE</TableHead>
              <TableHead className="text-right">NAICS</TableHead>
              <TableHead className="text-right">UK SIC</TableHead>
              <TableHead className="text-right">إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                  لا توجد نتائج مطابقة
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const isSelected = value.code === r.egyCode;
                return (
                  <TableRow key={r.egyCode} className={cn(isSelected && "bg-primary/10")}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{r.nameAr}</div>
                      <div className="text-[10px] text-muted-foreground">{TRADE_GROUP_LABELS[r.group]}</div>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{r.egyCode}</TableCell>
                    <TableCell className="text-xs tabular-nums">{r.isic}</TableCell>
                    <TableCell className="text-xs tabular-nums">{r.nace}</TableCell>
                    <TableCell className="text-xs tabular-nums">{r.naics}</TableCell>
                    <TableCell className="text-xs tabular-nums">{r.ukSic}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() =>
                          onChange({
                            ...value,
                            code: r.egyCode,
                            name: r.nameAr,
                            group: r.group,
                          })
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

      {/* ملاحظة زكوية مخصصة بناءً على النشاط */}
      {selectedRow?.zakatNote && (
        <Alert className="border-primary/20 bg-background">
          <AlertDescription className="text-xs leading-relaxed text-right">
            <b>ملاحظة زكوية:</b> {selectedRow.zakatNote}
          </AlertDescription>
        </Alert>
      )}

      {/* تاريخ تشغيل النشاط + ربط الشركة */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">تاريخ تشغيل النشاط التجاري</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-right font-normal", !startDateObj && "text-muted-foreground")}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {startDateObj
                  ? startDateObj.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
                  : "اختر التاريخ…"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDateObj}
                onSelect={(d) =>
                  onChange({
                    ...value,
                    startDate: d ? d.toISOString().slice(0, 10) : "",
                  })
                }
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <p className="text-[10px] text-muted-foreground">
            يُستخدم لاحتساب بدء الحول التجاري وللتوثيق في سجل التدقيق.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />
            هل النشاط يخص شركة قائمة؟
          </Label>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={value.isCompany ? "default" : "outline"}
              onClick={() => onChange({ ...value, isCompany: !value.isCompany })}
            >
              {value.isCompany ? "نعم — شركة" : "فردي / غير شركة"}
            </Button>
            {value.isCompany && (
              <Input
                value={value.companyName}
                onChange={(e) => onChange({ ...value, companyName: e.target.value })}
                placeholder="اسم الشركة"
                className="flex-1"
              />
            )}
          </div>
          {value.isCompany && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                if (onOpenCompanyTab) onOpenCompanyTab();
                else {
                  const el = document.getElementById("tab-company") as HTMLElement | null;
                  el?.click();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              فتح تبويب «زكاة الشركات» للمراجعة والتدقيق والامتثال
            </Button>
          )}
        </div>
      </div>

      {/* تصنيف المحال العامة المصري — قانون 154 لسنة 2019 */}
      <ShopLicensingTable
        onPick={(row) =>
          onChange({
            ...value,
            name: value.name || row.nameAr,
          })
        }
      />

      {/* مراجع التصنيفات الرسمية */}
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

/** ====== جدول تصنيف المحال العامة المصرية (قانون 154/2019) ====== */
function ShopLicensingTable({
  onPick,
}: {
  onPick: (row: (typeof EGY_SHOP_LICENSES)[number]) => void;
}) {
  const [cat, setCat] = useState<ShopLicenseCategory | "all">("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return EGY_SHOP_LICENSES.filter((r) => {
      if (cat !== "all" && r.category !== cat) return false;
      if (!term) return true;
      return (
        r.nameAr.toLowerCase().includes(term) ||
        r.authority.toLowerCase().includes(term) ||
        (r.notes || "").toLowerCase().includes(term)
      );
    });
  }, [cat, q]);

  const hazardBadge = (h: "low" | "medium" | "high") => {
    const map = {
      low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      high: "bg-red-500/15 text-red-700 dark:text-red-300",
    };
    return (
      <span className={cn("text-[10px] rounded px-1.5 py-0.5", map[h])}>
        {SHOP_HAZARD_LABELS[h]}
      </span>
    );
  };

  return (
    <div className="rounded-lg border border-primary/15 bg-background p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-4 w-4 text-primary" />
          تصنيف المحال العامة المصرية — قانون 154 لسنة 2019
        </div>
        <Badge variant="outline" className="text-[10px]">
          إجمالي: {EGY_SHOP_LICENSES.length} نوع محل
        </Badge>
      </div>

      <Alert className="border-primary/10 bg-muted/30">
        <AlertDescription className="text-xs leading-relaxed text-right">
          هذا تصنيف <b>ترخيصي</b> (وزارة التنمية المحلية والمحليات) — مختلف عن
          التصنيف الإحصائي ISIC أعلاه. يفيد في تحديد الجهة المُختصة بالترخيص
          والاشتراطات الصحية/البيئية، ويُربط بالزكاة لاستبعاد المحال
          المحرّمة شرعًا (كحوليات/قمار) وتقدير طبيعة الأصول.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم المحل أو الجهة المختصة…"
            className="pr-9"
          />
        </div>
        <Select value={cat} onValueChange={(v) => setCat(v as ShopLicenseCategory | "all")}>
          <SelectTrigger>
            <SelectValue placeholder="كل الفئات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفئات</SelectItem>
            {Object.entries(SHOP_CATEGORY_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-background max-h-72 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">المحل / النشاط</TableHead>
              <TableHead className="text-right">الفئة</TableHead>
              <TableHead className="text-right">الخطورة</TableHead>
              <TableHead className="text-right">الجهة المختصة</TableHead>
              <TableHead className="text-right">إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                  لا توجد نتائج
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.nameAr}>
                  <TableCell className="text-xs">
                    <div className="font-medium">{r.nameAr}</div>
                    {r.notes && (
                      <div className="text-[10px] text-muted-foreground">{r.notes}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{SHOP_CATEGORY_LABELS[r.category]}</TableCell>
                  <TableCell>{hazardBadge(r.hazard)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.authority}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => onPick(r)}>
                      استخدم الاسم
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
