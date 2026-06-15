import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { fmt } from "@/lib/zakat";

export interface TrialBalanceMapped {
  cash: number;
  receivables: number;
  inventory: number;
  shortTermInvest: number;
  fixedAssets: number;
  shortTermDebt: number;
  totals: { debit: number; credit: number };
  rowCount: number;
}

interface Props {
  onMapped?: (data: TrialBalanceMapped) => void;
}

// كلمات مفتاحية للتعرف على الحسابات (عربي/إنجليزي)
const KEYWORDS = {
  cash: ["نقد", "صندوق", "بنك", "cash", "bank"],
  receivables: ["مدين", "ذمم", "عملاء", "مستحقات", "receivable", "debtor", "ar"],
  inventory: ["مخزون", "بضاعة", "inventory", "stock", "goods"],
  shortTermInvest: ["أوراق مالية", "استثمارات قصيرة", "أسهم متاحة", "investment", "securities"],
  fixedAssets: ["أصول ثابتة", "عقار", "آلات", "مباني", "سيارات", "fixed asset", "ppe", "property"],
  shortTermDebt: ["دائن", "موردين", "قروض قصيرة", "مستحقات دفع", "payable", "creditor", "ap"],
};

function classify(label: string): keyof typeof KEYWORDS | null {
  const l = label.toLowerCase();
  for (const key of Object.keys(KEYWORDS) as Array<keyof typeof KEYWORDS>) {
    if (KEYWORDS[key].some((k) => l.includes(k.toLowerCase()))) return key;
  }
  return null;
}

function parseCSV(text: string): string[][] {
  // مُحلل بسيط يدعم الفواصل والتنصيص
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { cur.push(cell); cell = ""; continue; }
    if ((c === "\n" || c === "\r") && !inQ) {
      if (cell.length || cur.length) { cur.push(cell); rows.push(cur); }
      cur = []; cell = "";
      if (c === "\r" && text[i + 1] === "\n") i++;
      continue;
    }
    cell += c;
  }
  if (cell.length || cur.length) { cur.push(cell); rows.push(cur); }
  return rows.filter((r) => r.some((x) => x.trim().length));
}

export function TrialBalanceImport({ onMapped }: Props) {
  const [result, setResult] = useState<TrialBalanceMapped | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setError(null); setUnmapped([]);
    try {
      const isExcel = /\.(xlsx|xls)$/i.test(f.name);
      let rows: string[][];
      if (isExcel) {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
        rows = aoa.map((r) => r.map((c) => String(c ?? "")));
      } else {
        const text = await f.text();
        rows = parseCSV(text);
      }
      if (rows.length < 2) throw new Error("الملف فارغ أو لا يحتوي صفوف بيانات");

      // اكتشف أعمدة الاسم/المدين/الدائن من رأس الجدول
      const header = rows[0].map((h) => h.trim().toLowerCase());
      let nameIdx = header.findIndex((h) => /name|account|اسم|حساب|بيان/.test(h));
      let debitIdx = header.findIndex((h) => /debit|مدين|له/.test(h));
      let creditIdx = header.findIndex((h) => /credit|دائن|عليه/.test(h));
      if (nameIdx === -1) nameIdx = 0;
      if (debitIdx === -1) debitIdx = 1;
      if (creditIdx === -1) creditIdx = 2;

      const acc: TrialBalanceMapped = {
        cash: 0, receivables: 0, inventory: 0, shortTermInvest: 0,
        fixedAssets: 0, shortTermDebt: 0,
        totals: { debit: 0, credit: 0 }, rowCount: 0,
      };
      const unknown: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const label = (r[nameIdx] || "").trim();
        if (!label) continue;
        const debit = parseFloat((r[debitIdx] || "0").replace(/[,\s]/g, "")) || 0;
        const credit = parseFloat((r[creditIdx] || "0").replace(/[,\s]/g, "")) || 0;
        acc.totals.debit += debit;
        acc.totals.credit += credit;
        acc.rowCount++;
        const cat = classify(label);
        if (!cat) { unknown.push(label); continue; }
        const amount = Math.abs(debit - credit);
        if (cat === "shortTermDebt") acc.shortTermDebt += amount;
        else acc[cat] += amount;
      }

      setResult(acc);
      setUnmapped(unknown.slice(0, 10));
      onMapped?.(acc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل قراءة الملف");
    }
  };

  const downloadSample = () => {
    const sample =
      "اسم الحساب,مدين,دائن\n" +
      "النقد بالصندوق,50000,0\n" +
      "البنك الأهلي,250000,0\n" +
      "عملاء (ذمم مدينة),120000,0\n" +
      "مخزون بضاعة,400000,0\n" +
      "أوراق مالية للمتاجرة,80000,0\n" +
      "أصول ثابتة - مباني,1500000,0\n" +
      "موردون (ذمم دائنة),0,90000\n" +
      "قروض قصيرة الأجل,0,150000\n";
    const blob = new Blob(["\uFEFF" + sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "trial-balance-sample.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-soft border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          استيراد ميزان المراجعة (CSV) لتغذية الوعاء الزكوي تلقائيًا
          <Badge variant="outline" className="text-[10px] mr-auto">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-primary/20 bg-primary/5">
          <AlertDescription className="text-xs leading-relaxed">
            ارفع ميزان مراجعة بصيغة CSV بالأعمدة: <b>اسم الحساب · مدين · دائن</b>.
            ستُصنَّف الحسابات تلقائيًا (نقد، ذمم، مخزون، أصول ثابتة، ديون) بناءً على الكلمات المفتاحية.
            راجع الحسابات غير المصنّفة وأضفها يدويًا.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => fileRef.current?.click()} size="sm" className="gap-1.5">
            <Upload className="h-4 w-4" /> رفع ملف CSV
          </Button>
          <Button onClick={downloadSample} size="sm" variant="outline" className="gap-1.5">
            <Download className="h-4 w-4" /> تحميل قالب نموذجي
          </Button>
          <input
            ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-primary">
              <CheckCircle2 className="h-4 w-4" />
              تم استيراد {result.rowCount} صف. إجمالي مدين: {fmt(result.totals.debit)} · إجمالي دائن: {fmt(result.totals.credit)}
              {Math.abs(result.totals.debit - result.totals.credit) > 1 && (
                <span className="text-destructive">— تحذير: الميزان غير متوازن!</span>
              )}
            </div>
            <div className="grid md:grid-cols-3 gap-2 text-xs">
              <Row label="النقد والبنوك" v={result.cash} />
              <Row label="الذمم المدينة" v={result.receivables} />
              <Row label="المخزون" v={result.inventory} />
              <Row label="استثمارات قصيرة" v={result.shortTermInvest} />
              <Row label="أصول ثابتة (مستثناة)" v={result.fixedAssets} muted />
              <Row label="ديون قصيرة الأجل" v={result.shortTermDebt} negative />
            </div>
            {unmapped.length > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[11px]">
                <b>حسابات لم تُصنَّف ({unmapped.length}):</b> {unmapped.join(" · ")}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, v, muted, negative }: { label: string; v: number; muted?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between rounded-md border p-2 ${muted ? "border-muted text-muted-foreground" : negative ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}>
      <span>{label}</span>
      <b>{fmt(v)}</b>
    </div>
  );
}

export default TrialBalanceImport;
