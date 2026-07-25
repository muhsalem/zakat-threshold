import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { BookOpen, Copy, Download, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { fmt } from "@/lib/zakat";
import { toast } from "sonner";

interface ZakatJournalEntriesGeneratorProps {
  zakatAmount?: number;
  currencyName?: string;
  fiscalYear?: number;
}

export function ZakatJournalEntriesGenerator({
  zakatAmount = 45000,
  currencyName = "ر.س",
  fiscalYear = 2026,
}: ZakatJournalEntriesGeneratorProps) {
  const [copied, setCopied] = useState(false);

  const journalEntries = [
    {
      accountCode: "5900",
      accountName: "مصروف زكاة الفترة (Zakat Expense)",
      type: "Debit (مدين)",
      debit: zakatAmount,
      credit: 0,
      description: `اثبات مصروف الزكاة المستحقة عن الحول المالي ${fiscalYear}`,
    },
    {
      accountCode: "2250",
      accountName: "مخصص مستحق الزكاة الشرعية (Zakat Payable)",
      type: "Credit (دائن)",
      debit: 0,
      credit: zakatAmount,
      description: `اثبات التزام مخصص الزكاة عن الحول المالي ${fiscalYear}`,
    },
  ];

  const copyAsJson = () => {
    navigator.clipboard.writeText(JSON.stringify(journalEntries, null, 2));
    setCopied(true);
    toast.success("تم نسخ القيود المحاسبية بصيغة JSON لترحيلها إلى الـ ERP");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-indigo-500/30 bg-card shadow-sm" dir="rtl">
      <CardHeader className="bg-indigo-500/5 border-b pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              المولد الآلي للقيود المحاسبية التعديلية (Journal Entries Generator)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              قيود استحقاق الزكاة المعتمدة لترحيلها المباشر إلى دفتر الأستاذ بنظام الـ ERP (Odoo / SAP / دفترة).
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-indigo-500/40 text-indigo-700 dark:text-indigo-300 text-xs w-fit">
            جاهز للترحيل بالـ ERP
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="rounded-xl border overflow-hidden">
          <Table dir="rtl" className="text-xs">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-right font-bold">كود الحساب</TableHead>
                <TableHead className="text-right font-bold">اسم الحساب (General Ledger)</TableHead>
                <TableHead className="text-right font-bold">مدين (Debit)</TableHead>
                <TableHead className="text-right font-bold">دائن (Credit)</TableHead>
                <TableHead className="text-right font-bold">البيان (Memo)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalEntries.map((e, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono font-bold">{e.accountCode}</TableCell>
                  <TableCell className="font-semibold text-foreground">{e.accountName}</TableCell>
                  <TableCell className="font-mono font-bold text-emerald-600">{e.debit > 0 ? `${fmt(e.debit)} ${currencyName}` : "—"}</TableCell>
                  <TableCell className="font-mono font-bold text-indigo-600">{e.credit > 0 ? `${fmt(e.credit)} ${currencyName}` : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-muted-foreground">
            إجمالي المدين: <strong className="text-foreground">{fmt(zakatAmount)} {currencyName}</strong> | إجمالي الدائن: <strong className="text-foreground">{fmt(zakatAmount)} {currencyName}</strong> (متوازن 100%)
          </div>

          <Button size="sm" variant="outline" onClick={copyAsJson} className="gap-1.5 text-xs border-indigo-500/40 text-indigo-700 dark:text-indigo-300">
            <Copy className="h-3.5 w-3.5" /> {copied ? "تم النسخ!" : "نسخ القيود بصيغة JSON للـ ERP"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
