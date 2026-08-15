import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Download, Trash2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import {
  listPdfReports,
  updateReportStatus,
  deletePdfReport,
  type ReportStatus,
} from "@/lib/pdf/reports.functions";
import type { TemplateKind } from "@/lib/pdf/types";

export const Route = createFileRoute("/_authenticated/reports-history")({
  head: () => ({
    meta: [
      { title: "سجل تقارير PDF · نِصاب" },
      { name: "description", content: "جميع تقارير الزكاة PDF المُولّدة والمُنزَّلة والمُعتمَدة." },
      { property: "og:title", content: "سجل تقارير PDF" },
      { property: "og:description", content: "بحث وتصفية وإدارة التقارير المُصدَرة." },
    ],
  }),
  component: ReportsHistoryPage,
});

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  generated: { label: "تم الإنشاء", color: "bg-blue-100 text-blue-800" },
  downloaded: { label: "تم التنزيل", color: "bg-success/10 text-success" },
  sent: { label: "تم الإرسال", color: "bg-purple-100 text-purple-800" },
  approved: { label: "معتمد", color: "bg-success/10 text-success" },
  canceled: { label: "ملغى", color: "bg-gray-200 text-gray-700" },
};

function ReportsHistoryPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPdfReports);
  const updFn = useServerFn(updateReportStatus);
  const delFn = useServerFn(deletePdfReport);

  const [status, setStatus] = useState<string>("");
  const [kind, setKind] = useState<string>("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: rows } = useQuery({
    queryKey: ["pdf-reports", status, kind, search, from, to],
    queryFn: () =>
      listFn({
        data: {
          status: status || undefined,
          kind: (kind as TemplateKind) || undefined,
          search: search || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      }),
  });

  const upd = useMutation({
    mutationFn: (v: { id: string; status: ReportStatus }) => updFn({ data: v }),
    onSuccess: () => {
      toast.success("تم تحديث الحالة");
      qc.invalidateQueries({ queryKey: ["pdf-reports"] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["pdf-reports"] });
    },
  });

  return (
    <div dir="rtl" className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">سجل تقارير PDF</h1>
        <p className="text-muted-foreground text-sm">
          كل تقرير تم إنشاؤه أو تنزيله عبر منصة نِصاب.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">تصفية</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <Label>الحالة</Label>
            <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="generated">تم الإنشاء</SelectItem>
                <SelectItem value="downloaded">تم التنزيل</SelectItem>
                <SelectItem value="sent">تم الإرسال</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="canceled">ملغى</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>النوع</Label>
            <Select value={kind || "all"} onValueChange={(v) => setKind(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="declaration">إقرار</SelectItem>
                <SelectItem value="compliance">امتثال</SelectItem>
                <SelectItem value="certified">معتمد</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>من تاريخ</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>إلى تاريخ</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>بحث (عنوان/رقم)</Label>
            <Input
              placeholder="RPT-2026-…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم التقرير</TableHead>
                <TableHead>العنوان</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الإصدار</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>آخر تنزيل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows ?? []).map((r) => {
                const s = STATUS_LABELS[r.status] ?? { label: r.status, color: "" };
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.report_uid}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.kind}</Badge>
                    </TableCell>
                    <TableCell>v{r.version}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(r.created_at).toLocaleString("ar-EG")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.last_downloaded_at
                        ? new Date(r.last_downloaded_at).toLocaleString("ar-EG")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={s.color}>{s.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="تحديث كمُنزَّل"
                          onClick={() => upd.mutate({ id: r.id, status: "downloaded" })}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="اعتماد"
                          onClick={() => upd.mutate({ id: r.id, status: "approved" })}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="إلغاء"
                          onClick={() => upd.mutate({ id: r.id, status: "canceled" })}
                        >
                          <XCircle className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="إعادة توليد"
                          onClick={() => toast.info("افتح الإقرار لإعادة توليد نسخة جديدة")}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="حذف"
                          onClick={() => {
                            if (confirm("حذف التقرير؟")) del.mutate(r.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!rows || rows.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    لا توجد تقارير مطابقة.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
