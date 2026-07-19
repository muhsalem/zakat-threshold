import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Play, Download, Plus, Trash2 } from "lucide-react";
import { ZAKAT_RATE } from "@/lib/zakat";

export const Route = createFileRoute("/_authenticated/bulk-clients")({
  head: () => ({
    meta: [
      { title: "معالجة زكاة العملاء دفعة واحدة — نصاب" },
      {
        name: "description",
        content:
          "استورد بيانات عشرات العملاء (نقد، مدينون، مخزون، خصوم) وشغّل حساب الزكاة الجماعي مع تصدير تقرير Excel واحد.",
      },
    ],
  }),
  component: BulkClientsPage,
});

type Currency = "SAR" | "USD" | "EGP" | "AED";

interface ClientRow {
  id: string;
  client_name: string;
  currency: Currency;
  cash: number;
  receivables: number;
  inventory: number;
  investments: number;
  liabilities: number;
  nisab: number;
  status: "pending" | "done" | "below_nisab";
  zakat_due?: number;
  net?: number;
}

function newRow(): ClientRow {
  return {
    id: crypto.randomUUID(),
    client_name: "",
    currency: "SAR",
    cash: 0,
    receivables: 0,
    inventory: 0,
    investments: 0,
    liabilities: 0,
    nisab: 20000,
    status: "pending",
  };
}

function BulkClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>(() =>
    Array.from({ length: 3 }, () => newRow()),
  );
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const totals = useMemo(() => {
    const done = rows.filter((r) => r.status === "done");
    const totalZakat = done.reduce((s, r) => s + (r.zakat_due ?? 0), 0);
    const totalAssets = rows.reduce(
      (s, r) => s + r.cash + r.receivables + r.inventory + r.investments,
      0,
    );
    return { done: done.length, totalZakat, totalAssets };
  }, [rows]);

  const update = (id: string, patch: Partial<ClientRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const runAll = async () => {
    setRunning(true);
    setProgress(0);
    const list = [...rows];
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (!r.client_name.trim()) {
        update(r.id, { status: "pending" });
      } else {
        const net = r.cash + r.receivables + r.inventory + r.investments - r.liabilities;
        if (net < r.nisab) {
          update(r.id, { status: "below_nisab", zakat_due: 0, net });
        } else {
          const zakat = +(net * ZAKAT_RATE).toFixed(2);
          update(r.id, { status: "done", zakat_due: zakat, net });
        }
      }
      setProgress(Math.round(((i + 1) / list.length) * 100));
      await new Promise((res) => setTimeout(res, 40));
    }
    setRunning(false);
    toast.success(`تم حساب زكاة ${list.length} عميل`);
  };

  const exportCsv = () => {
    const header = [
      "العميل", "العملة", "نقد", "مدينون", "مخزون", "استثمارات",
      "خصوم", "الصافي", "النصاب", "الزكاة المستحقة", "الحالة",
    ].join(",");
    const lines = rows.map((r) =>
      [
        r.client_name, r.currency, r.cash, r.receivables, r.inventory,
        r.investments, r.liabilities, r.net ?? "", r.nisab,
        r.zakat_due ?? "", r.status,
      ].join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-zakat-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold">معالجة زكاة العملاء الجماعية</h1>
      </div>

      <Alert>
        <AlertDescription>
          أدخل بيانات ميزان المراجعة لكل عميل، ثم اضغط "تشغيل الكل" لحساب الزكاة دفعة واحدة.
          البيانات لا تُرسل إلى الخادم في هذا المعالج السريع.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{rows.length}</div>
          <div className="text-xs text-muted-foreground">عملاء</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{totals.done}</div>
          <div className="text-xs text-muted-foreground">تم الحساب</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{totals.totalZakat.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">إجمالي زكاة (مختلط)</div>
        </CardContent></Card>
      </div>

      {running && <Progress value={progress} />}

      <div className="flex flex-wrap gap-2">
        <Button onClick={runAll} disabled={running}>
          <Play className="h-4 w-4 ml-1" /> تشغيل الكل
        </Button>
        <Button variant="outline" onClick={() => setRows((r) => [...r, newRow()])}>
          <Plus className="h-4 w-4 ml-1" /> إضافة عميل
        </Button>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 ml-1" /> تصدير CSV
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">قائمة العملاء</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead className="w-24">العملة</TableHead>
                <TableHead>نقد</TableHead>
                <TableHead>مدينون</TableHead>
                <TableHead>مخزون</TableHead>
                <TableHead>استثمارات</TableHead>
                <TableHead>خصوم</TableHead>
                <TableHead>النصاب</TableHead>
                <TableHead>الزكاة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Input value={r.client_name} onChange={(e) => update(r.id, { client_name: e.target.value })} placeholder="اسم العميل" />
                  </TableCell>
                  <TableCell>
                    <Select value={r.currency} onValueChange={(v) => update(r.id, { currency: v as Currency })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EGP">EGP</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {(["cash", "receivables", "inventory", "investments", "liabilities", "nisab"] as const).map((k) => (
                    <TableCell key={k}>
                      <Input
                        type="number"
                        value={r[k]}
                        onChange={(e) => update(r.id, { [k]: Number(e.target.value) || 0 } as Partial<ClientRow>)}
                        className="w-24"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="font-semibold">
                    {r.zakat_due !== undefined ? r.zakat_due.toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>
                    {r.status === "done" && <Badge variant="default">مكتمل</Badge>}
                    {r.status === "below_nisab" && <Badge variant="secondary">دون النصاب</Badge>}
                    {r.status === "pending" && <Badge variant="outline">في الانتظار</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" aria-label="حذف" onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={8} className="text-left">إجمالي الأصول (مختلط)</TableCell>
                <TableCell className="font-bold">{totals.totalAssets.toLocaleString()}</TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
