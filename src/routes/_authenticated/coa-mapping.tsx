import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Download, Upload, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coa-mapping")({
  head: () => ({
    meta: [
      { title: "ربط دليل الحسابات بالزكاة — نصاب" },
      {
        name: "description",
        content:
          "اربط حسابات دليلك المحاسبي (Chart of Accounts) بفئات الزكاة الشرعية لتوليد ميزان مراجعة زكوي تلقائي.",
      },
    ],
  }),
  component: CoaMappingPage,
});

type ZakatCategory =
  | "cash"
  | "receivables"
  | "inventory_trade"
  | "raw_materials"
  | "wip"
  | "finished_goods"
  | "short_term_investments"
  | "long_term_assets_excluded"
  | "fixed_assets_excluded"
  | "current_liabilities"
  | "long_term_liabilities_zakat_deductible"
  | "equity_excluded"
  | "revenue_excluded"
  | "expenses_excluded";

const CATEGORIES: { id: ZakatCategory; label: string; badge: "asset" | "liab" | "excl" }[] = [
  { id: "cash", label: "نقدية وما في حكمها", badge: "asset" },
  { id: "receivables", label: "مدينون قابلون للتحصيل", badge: "asset" },
  { id: "inventory_trade", label: "بضاعة للتجارة", badge: "asset" },
  { id: "raw_materials", label: "مواد خام (تدخل بشرط النية)", badge: "asset" },
  { id: "wip", label: "إنتاج تحت التشغيل", badge: "asset" },
  { id: "finished_goods", label: "منتج تام", badge: "asset" },
  { id: "short_term_investments", label: "استثمارات قصيرة الأجل", badge: "asset" },
  { id: "long_term_assets_excluded", label: "أصول طويلة الأجل — مستثناة", badge: "excl" },
  { id: "fixed_assets_excluded", label: "أصول ثابتة — مستثناة", badge: "excl" },
  { id: "current_liabilities", label: "التزامات متداولة (خصم)", badge: "liab" },
  {
    id: "long_term_liabilities_zakat_deductible",
    label: "التزامات طويلة الأجل — القسط السنوي فقط",
    badge: "liab",
  },
  { id: "equity_excluded", label: "حقوق ملكية — مستثناة", badge: "excl" },
  { id: "revenue_excluded", label: "إيرادات — مستثناة", badge: "excl" },
  { id: "expenses_excluded", label: "مصروفات — مستثناة", badge: "excl" },
];

interface Row {
  id: string;
  code: string;
  name: string;
  category: ZakatCategory | "";
  note?: string;
}

const STORAGE_KEY = "nisab_coa_mapping_v1";

function newRow(): Row {
  return { id: crypto.randomUUID(), code: "", name: "", category: "" };
}

function CoaMappingPage() {
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Row[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setRows(parsed);
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); } catch { /* noop */ }
  }, [rows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const mapped = rows.filter((r) => r.category && r.code.trim()).length;
    const missing = rows.filter((r) => r.code.trim() && !r.category).length;
    return { total, mapped, missing, coverage: total ? Math.round((mapped / total) * 100) : 0 };
  }, [rows]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q),
    );
  }, [rows, filter]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coa-mapping-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير الربط");
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("invalid");
      setRows(
        parsed.map((r) => ({
          id: crypto.randomUUID(),
          code: String(r.code ?? ""),
          name: String(r.name ?? ""),
          category: (r.category ?? "") as ZakatCategory | "",
          note: r.note ? String(r.note) : undefined,
        })),
      );
      toast.success("تم استيراد الربط");
    } catch {
      toast.error("ملف غير صالح");
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold">ربط دليل الحسابات بفئات الزكاة</h1>
      </div>

      <Alert>
        <AlertDescription>
          استورد دليل حساباتك من نظام ERP، ثم صنّف كل حساب ضمن فئة زكوية.
          يتم حفظ الربط تلقائياً على متصفحك ويمكن تصديره ومشاركته مع الفريق.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">حسابات</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.mapped}</div>
          <div className="text-xs text-muted-foreground">مربوطة</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.missing}</div>
          <div className="text-xs text-muted-foreground">تحتاج تصنيف</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{stats.coverage}%</div>
          <div className="text-xs text-muted-foreground">تغطية</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">جدول الحسابات</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="بحث عن رقم أو اسم"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-52"
            />
            <Button size="sm" variant="outline" onClick={() => setRows((r) => [...r, newRow()])}>
              <Plus className="h-4 w-4 ml-1" /> إضافة صف
            </Button>
            <Button size="sm" variant="outline" onClick={exportJson}>
              <Download className="h-4 w-4 ml-1" /> تصدير
            </Button>
            <label className="inline-flex items-center">
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importJson(f);
                  e.target.value = "";
                }}
              />
              <span className="inline-flex items-center gap-1 h-9 px-3 rounded-md border text-sm cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" /> استيراد
              </span>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">رقم الحساب</TableHead>
                <TableHead>اسم الحساب</TableHead>
                <TableHead className="w-72">التصنيف الزكوي</TableHead>
                <TableHead className="w-40">ملاحظات</TableHead>
                <TableHead className="w-14"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => {
                const cat = CATEGORIES.find((c) => c.id === r.category);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Input
                        value={r.code}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) => (x.id === r.id ? { ...x, code: e.target.value } : x)),
                          )
                        }
                        placeholder="1010"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={r.name}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)),
                          )
                        }
                        placeholder="النقدية في الصندوق"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={r.category || undefined}
                          onValueChange={(v) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.id === r.id ? { ...x, category: v as ZakatCategory } : x,
                              ),
                            )
                          }
                        >
                          <SelectTrigger><SelectValue placeholder="اختر تصنيفاً" /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {cat && (
                          <Badge
                            variant={cat.badge === "asset" ? "default" : cat.badge === "liab" ? "secondary" : "outline"}
                          >
                            {cat.badge === "asset" ? "أصل" : cat.badge === "liab" ? "خصم" : "مستثنى"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={r.note ?? ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) => (x.id === r.id ? { ...x, note: e.target.value } : x)),
                          )
                        }
                        placeholder="—"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="حذف"
                        onClick={() =>
                          setRows((prev) => (prev.length === 1 ? [newRow()] : prev.filter((x) => x.id !== r.id)))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
