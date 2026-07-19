import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Search, Building2, Store, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EGY_SHOP_LICENSES,
  SHOP_CATEGORY_LABELS,
  type ShopLicenseCategory,
} from "@/lib/tradeClassifications";

export interface TradeActivitySelection {
  /** كود التصنيف (يُملأ من تبويب زكاة الشركات إن وُجد) */
  code: string;
  /** اسم النشاط */
  name: string;
  /** مجموعة النشاط */
  group: string;
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
  /** يُستدعى عند الضغط على «افتح زكاة الشركات» */
  onOpenCompanyTab?: () => void;
}

export default function TradeActivityClassification({ value, onChange, onOpenCompanyTab }: Props) {
  const startDateObj = value.startDate ? new Date(value.startDate) : undefined;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <ScrollText className="h-4 w-4" />
        بيانات النشاط التجاري للفرد
      </div>

      <Alert className="border-primary/15 bg-background">
        <AlertDescription className="text-xs leading-relaxed text-end">
          سجّل <b>تاريخ تشغيل النشاط</b> لاحتساب بدء الحول التجاري بدقة. إن كان نشاطك يخص
          <b> شركة قائمة</b> فعّل الخيار وانتقل إلى تبويب <b>«زكاة الشركات»</b> حيث يظهر تصنيف
          النشاط التلقائي حسب <b>دولة الشركة</b> والقطاع المختار.
        </AlertDescription>
      </Alert>

      {/* تاريخ تشغيل النشاط + ربط الشركة */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">تاريخ تشغيل النشاط التجاري</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-end font-normal",
                  !startDateObj && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="ms-2 h-4 w-4" />
                {startDateObj
                  ? startDateObj.toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
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
              فتح تبويب «زكاة الشركات» لاختيار التصنيف حسب الدولة والقطاع
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
      return r.nameAr.toLowerCase().includes(term) || (r.notes || "").toLowerCase().includes(term);
    });
  }, [cat, q]);

  return (
    <div className="rounded-lg border border-primary/15 bg-background p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Store className="h-4 w-4 text-primary" />
          دليل أنواع المحال العامة المصرية
        </div>
        <Badge variant="outline" className="text-[10px]">
          {EGY_SHOP_LICENSES.length} نوع محل
        </Badge>
      </div>

      <Alert className="border-primary/10 bg-muted/30">
        <AlertDescription className="text-xs leading-relaxed text-end">
          قائمة مرجعية لأنواع المحال التجارية والخدمية الشائعة في السوق المصري — تساعدك على{" "}
          <b>التعرف على طبيعة نشاطك</b> واختيار الاسم المناسب، ولتنبيهك على المحال{" "}
          <b>المحرّمة شرعًا</b> (كحوليات/قمار) كي تُستبعد من وعاء الزكاة ويُتخلَّص من كسبها.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم المحل أو النشاط…"
            className="pe-9"
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
              <TableHead className="text-end">المحل / النشاط</TableHead>
              <TableHead className="text-end">الفئة</TableHead>
              <TableHead className="text-end">إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">
                  لا توجد نتائج
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.nameAr}>
                  <TableCell className="text-xs">
                    <div className="font-medium">{r.nameAr}</div>
                    {r.notes && <div className="text-[10px] text-muted-foreground">{r.notes}</div>}
                  </TableCell>
                  <TableCell className="text-xs">{SHOP_CATEGORY_LABELS[r.category]}</TableCell>
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
