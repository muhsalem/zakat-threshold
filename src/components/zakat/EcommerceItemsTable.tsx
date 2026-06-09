import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, ListPlus, Info } from "lucide-react";

export type EcommerceCategory = "physical" | "digital" | "service" | "receivable";

export interface EcommerceItem {
  id: string;
  name: string;
  category: EcommerceCategory;
  qty: string;
  price: string;     // سعر البيع للوحدة
  saleDate: string;  // تاريخ البيع / يوم الوجوب
  notes?: string;
}

export interface EcommerceTotals {
  physical: number;
  digital: number;
  service: number;
  receivable: number;
  total: number;
}

const CATEGORY_LABEL: Record<EcommerceCategory, string> = {
  physical: "منتج مادي",
  digital: "منتج رقمي",
  service: "خدمة رقمية",
  receivable: "مستحق على عميل",
};

const num = (v: string) => {
  const n = parseFloat((v || "").toString().replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function newItem(): EcommerceItem {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `it_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    category: "physical",
    qty: "1",
    price: "",
    saleDate: today,
    notes: "",
  };
}

export function computeEcommerceTotals(items: EcommerceItem[]): EcommerceTotals {
  const t: EcommerceTotals = { physical: 0, digital: 0, service: 0, receivable: 0, total: 0 };
  for (const it of items) {
    const v = Math.max(0, num(it.qty)) * Math.max(0, num(it.price));
    t[it.category] += v;
    t.total += v;
  }
  return t;
}

interface Props {
  items: EcommerceItem[];
  onItemsChange: (items: EcommerceItem[]) => void;
  currencyName: string;
  dueDateHint?: string; // يوم وجوب الزكاة (للتنبيه فقط)
  onTotalsChange?: (totals: EcommerceTotals) => void;
}

export function EcommerceItemsTable({
  items, onItemsChange, currencyName, dueDateHint, onTotalsChange,
}: Props) {
  const totals = useMemo(() => computeEcommerceTotals(items), [items]);

  useEffect(() => {
    onTotalsChange?.(totals);
  }, [totals, onTotalsChange]);

  const update = (id: string, patch: Partial<EcommerceItem>) =>
    onItemsChange(items.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const remove = (id: string) => onItemsChange(items.filter((x) => x.id !== id));

  const add = () => onItemsChange([...items, newItem()]);

  const fmt = (n: number) =>
    n.toLocaleString("ar", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ListPlus className="h-4 w-4 text-primary" />
          سجل المنتجات والخدمات (تُجمع تلقائيًا في قاعدة عروض التجارة)
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="h-4 w-4 me-1" /> إضافة بند
        </Button>
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed text-right">
          أدخل كل منتج/خدمة بقيمته السوقية يوم وجوب الزكاة. يُعتدّ بالكمية المتبقّية للبيع
          وسعر البيع لكل وحدة. يُغذّى الإجمالي تلقائيًا حسب التصنيف
          (مادي/رقمي/خدمة/مستحقات).
          {dueDateHint ? <> يوم الوجوب المرجعي: <b>{dueDateHint}</b>.</> : null}
        </AlertDescription>
      </Alert>

      {items.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-6">
          لا توجد بنود بعد — اضغط «إضافة بند» للبدء.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right min-w-[160px]">المنتج/الخدمة</TableHead>
                <TableHead className="text-right min-w-[130px]">التصنيف</TableHead>
                <TableHead className="text-right w-[90px]">الكمية</TableHead>
                <TableHead className="text-right min-w-[120px]">سعر البيع للوحدة ({currencyName})</TableHead>
                <TableHead className="text-right min-w-[150px]">تاريخ البيع / يوم الوجوب</TableHead>
                <TableHead className="text-right min-w-[110px]">الإجمالي</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => {
                const line = Math.max(0, num(it.qty)) * Math.max(0, num(it.price));
                return (
                  <TableRow key={it.id}>
                    <TableCell>
                      <Input
                        value={it.name}
                        placeholder="اسم المنتج أو الخدمة"
                        onChange={(e) => update(it.id, { name: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={it.category}
                        onValueChange={(v: EcommerceCategory) => update(it.id, { category: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(CATEGORY_LABEL) as EcommerceCategory[]).map((k) => (
                            <SelectItem key={k} value={k}>{CATEGORY_LABEL[k]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="decimal" value={it.qty}
                        onChange={(e) => update(it.id, { qty: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="decimal" value={it.price}
                        onChange={(e) => update(it.id, { price: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date" value={it.saleDate}
                        onChange={(e) => update(it.id, { saleDate: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="tabular-nums font-semibold">
                      {fmt(line)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button" size="icon" variant="ghost"
                        onClick={() => remove(it.id)}
                        aria-label="حذف"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        {(["physical", "digital", "service", "receivable"] as EcommerceCategory[]).map((k) => (
          <div key={k} className="rounded-md border bg-muted/30 p-2">
            <div className="text-muted-foreground">{CATEGORY_LABEL[k]}</div>
            <div className="font-bold tabular-nums">{fmt(totals[k])}</div>
          </div>
        ))}
        <div className="rounded-md border border-primary/40 bg-primary/10 p-2">
          <div className="text-primary">الإجمالي</div>
          <div className="font-bold tabular-nums text-primary">{fmt(totals.total)}</div>
        </div>
      </div>
    </div>
  );
}
