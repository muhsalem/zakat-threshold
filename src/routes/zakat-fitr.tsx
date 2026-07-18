import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Wheat, Calculator, BookOpen, ShieldCheck, ArrowLeft, Users, FileDown, Archive, Trash2, BarChart3, Save } from "lucide-react";
import { exportHtmlToPdf, pdfWrap } from "@/lib/export/pdf";
import { toast } from "sonner";

type FitrArchiveEntry = {
  id: string;
  year: number;
  savedAt: string;
  peopleCount: number;
  stapleId: string;
  stapleLabel: string;
  kgPerSaa: number;
  pricePerKg: number;
  currency: string;
  totalKg: number;
  totalCash: number;
};

const ARCHIVE_KEY = "zakat-fitr-archive-v1";

function loadArchive(): FitrArchiveEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ARCHIVE_KEY);
    return raw ? (JSON.parse(raw) as FitrArchiveEntry[]) : [];
  } catch { return []; }
}
function saveArchive(list: FitrArchiveEntry[]) {
  try { window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export const Route = createFileRoute("/zakat-fitr")({
  head: () => ({
    meta: [
      { title: "زكاة الفطر — احسبها لكل فرد بالكيلو أو بالنقد | نِصاب" },
      {
        name: "description",
        content:
          "حاسبة زكاة الفطر لكل أفراد الأسرة: صاع من غالب قوت البلد (~2.5 كجم) أو ما يعادله نقداً وفق مذهب الحنفية والمعاصرين.",
      },
      { property: "og:title", content: "زكاة الفطر — الحاسبة الشاملة" },
      { property: "og:description", content: "احسب زكاة الفطر لعائلتك بالكيلو أو بالقيمة النقدية." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ZakatFitrPage,
});

type StapleId = "wheat" | "rice" | "barley" | "dates" | "raisins";
const STAPLES: { id: StapleId; label: string; kgPerSaa: number; suggestedPricePerKg: number }[] = [
  { id: "wheat",   label: "قمح / دقيق", kgPerSaa: 2.5, suggestedPricePerKg: 1.2 },
  { id: "rice",    label: "أرز",         kgPerSaa: 2.5, suggestedPricePerKg: 1.5 },
  { id: "barley",  label: "شعير",        kgPerSaa: 2.5, suggestedPricePerKg: 1.0 },
  { id: "dates",   label: "تمر",         kgPerSaa: 2.5, suggestedPricePerKg: 4.0 },
  { id: "raisins", label: "زبيب",        kgPerSaa: 2.5, suggestedPricePerKg: 5.0 },
];

function ZakatFitrPage() {
  const [peopleCount, setPeopleCount] = useState<number>(4);
  const [staple, setStaple] = useState<StapleId>("wheat");
  const [pricePerKg, setPricePerKg] = useState<number>(1.2);
  const [currency, setCurrency] = useState<string>("USD");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [archive, setArchive] = useState<FitrArchiveEntry[]>([]);

  useEffect(() => { setArchive(loadArchive()); }, []);

  const active = STAPLES.find((s) => s.id === staple)!;
  const totalKg = useMemo(() => peopleCount * active.kgPerSaa, [peopleCount, active.kgPerSaa]);
  const totalCash = useMemo(() => totalKg * (pricePerKg || 0), [totalKg, pricePerKg]);

  function pickStaple(id: StapleId) {
    setStaple(id);
    const s = STAPLES.find((x) => x.id === id)!;
    setPricePerKg(s.suggestedPricePerKg);
  }

  function archiveCurrent() {
    const entry: FitrArchiveEntry = {
      id: `${year}-${Date.now()}`,
      year,
      savedAt: new Date().toISOString(),
      peopleCount,
      stapleId: active.id,
      stapleLabel: active.label,
      kgPerSaa: active.kgPerSaa,
      pricePerKg,
      currency,
      totalKg,
      totalCash,
    };
    // Replace previous entry for same year+currency to keep comparison clean
    const next = [entry, ...archive.filter((e) => !(e.year === year && e.currency === currency))]
      .sort((a, b) => b.year - a.year);
    setArchive(next);
    saveArchive(next);
    toast.success(`تم حفظ زكاة الفطر لسنة ${year}`);
  }

  function removeEntry(id: string) {
    const next = archive.filter((e) => e.id !== id);
    setArchive(next);
    saveArchive(next);
  }

  function clearArchive() {
    if (!confirm("حذف كل السجلات المؤرشفة؟")) return;
    setArchive([]);
    saveArchive([]);
  }

  const comparison = useMemo(() => {
    // group by currency, sort by year asc
    const groups: Record<string, FitrArchiveEntry[]> = {};
    for (const e of archive) (groups[e.currency] ||= []).push(e);
    for (const k of Object.keys(groups)) groups[k].sort((a, b) => a.year - b.year);
    return groups;
  }, [archive]);

  return (

    <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6" dir="rtl">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">الرئيسية</Link>{" "}· <span>زكاة الفطر</span>
      </nav>

      <header className="space-y-3">
        <Badge variant="outline" className="gap-1">
          <Wheat className="h-3 w-3" /> زكاة الفطر
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight">
          زكاة الفطر — احسبها لكل أفراد الأسرة
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          تجب زكاة الفطر على كل مسلم صغير أو كبير، ذكر أو أنثى، حرّ أو عبد، بمقدار{" "}
          <b>صاع (~2.5 كجم)</b> من غالب قوت البلد. يجوز إخراجها طعاماً، وأجاز الحنفية
          والمعاصرون إخراجها نقداً بقيمة الصاع من الطعام.
        </p>
      </header>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" /> احسب زكاة الفطر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="people" className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> عدد أفراد الأسرة
              </Label>
              <Input
                id="people"
                type="number"
                min={1}
                value={peopleCount}
                onChange={(e) => setPeopleCount(Math.max(1, Number(e.target.value) || 1))}
              />
              <p className="text-xs text-muted-foreground">
                تشمل الزوج والزوجة والأبناء ومن تلزمك نفقته.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>نوع القوت</Label>
              <Select value={staple} onValueChange={(v) => pickStaple(v as StapleId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAPLES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                الصاع من هذا القوت ≈ <b>{active.kgPerSaa} كجم</b> لكل فرد.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="price">سعر الكيلو في السوق</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step="0.1"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency">العملة</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 5))}
                placeholder="USD / SAR / EGP..."
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border bg-primary/5 p-4">
              <div className="text-xs text-muted-foreground">إخراجها طعاماً</div>
              <div className="text-2xl font-bold mt-1">
                {totalKg.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} كجم
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                = {peopleCount} صاع × {active.kgPerSaa} كجم
              </div>
            </div>
            <div className="rounded-lg border bg-primary/10 p-4">
              <div className="text-xs text-muted-foreground">إخراجها نقداً</div>
              <div className="text-2xl font-bold mt-1">
                {totalCash.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} {currency}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                = {totalKg.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} كجم × {pricePerKg}{" "}
                {currency}/كجم
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button asChild size="lg" className="gap-1.5">
              <Link to="/distribution-plan">
                <Calculator className="h-4 w-4" /> خطة توزيع الزكاة
              </Link>
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={async () => {
                try {
                  const body = `
                    <h2 style="font-size:15px;margin:0 0 8px;color:#0d766e">ملخص الإدخال</h2>
                    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">
                      <tr><td style="border:1px solid #ddd;padding:6px;background:#f6f8f7;width:40%">عدد أفراد الأسرة</td><td style="border:1px solid #ddd;padding:6px"><b>${peopleCount}</b></td></tr>
                      <tr><td style="border:1px solid #ddd;padding:6px;background:#f6f8f7">نوع القوت</td><td style="border:1px solid #ddd;padding:6px">${active.label} — ${active.kgPerSaa} كجم لكل صاع</td></tr>
                      <tr><td style="border:1px solid #ddd;padding:6px;background:#f6f8f7">سعر الكيلو</td><td style="border:1px solid #ddd;padding:6px">${pricePerKg} ${currency}</td></tr>
                    </table>
                    <h2 style="font-size:15px;margin:0 0 8px;color:#0d766e">النتيجة</h2>
                    <table style="width:100%;border-collapse:collapse;font-size:13px">
                      <tr>
                        <td style="border:1px solid #ddd;padding:10px;width:50%">إخراجها طعاماً<br/><b style="font-size:18px">${totalKg.toLocaleString("ar-EG",{maximumFractionDigits:2})} كجم</b></td>
                        <td style="border:1px solid #ddd;padding:10px">إخراجها نقداً<br/><b style="font-size:18px">${totalCash.toLocaleString("ar-EG",{maximumFractionDigits:2})} ${currency}</b></td>
                      </tr>
                    </table>
                    <p style="font-size:11px;color:#666;margin-top:10px">
                      = ${peopleCount} صاع × ${active.kgPerSaa} كجم = ${totalKg.toLocaleString("ar-EG",{maximumFractionDigits:2})} كجم
                      × ${pricePerKg} ${currency}/كجم = ${totalCash.toLocaleString("ar-EG",{maximumFractionDigits:2})} ${currency}
                    </p>`;
                  await exportHtmlToPdf(
                    pdfWrap("تقرير زكاة الفطر", body),
                    `zakat-fitr-${new Date().toISOString().slice(0, 10)}.pdf`,
                  );
                  toast.success("تم تصدير PDF");
                } catch {
                  toast.error("تعذّر تصدير PDF");
                }
              }}
            >
              <FileDown className="h-4 w-4" /> تصدير PDF
            </Button>
            <Button asChild variant="outline">
              <Link to="/advisor">اسأل المستشار الشرعي</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid md:grid-cols-2 gap-4">
        <InfoBlock
          title="وقت الوجوب والإخراج"
          body="تجب بغروب شمس آخر يوم من رمضان، ويُستحب إخراجها قبل صلاة العيد. يجوز تعجيلها من أول رمضان."
        />
        <InfoBlock
          title="على من تجب؟"
          body="على كل مسلم يملك قوت يومه وليلته، ويُخرجها الرجل عن نفسه وعمن تلزمه نفقتهم من زوجة وأولاد."
        />
        <InfoBlock
          title="طعاماً أم نقداً؟"
          body="الجمهور: طعاماً من غالب قوت البلد. الحنفية وكثير من المعاصرين أجازوا القيمة النقدية لأنها أنفع للفقير اليوم."
        />
        <InfoBlock
          title="مصارفها"
          body="تُصرف للفقراء والمساكين من المسلمين خاصة، ولا تُصرف في بقية المصارف الثمانية على الراجح."
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" /> الأدلة الشرعية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            • عن ابن عمر رضي الله عنهما:{" "}
            <span className="text-foreground">
              «فرض رسول الله ﷺ زكاة الفطر صاعاً من تمر، أو صاعاً من شعير، على العبد
              والحر، والذكر والأنثى، والصغير والكبير من المسلمين»
            </span>{" "}
            — متفق عليه.
          </p>
          <p>
            • قوله ﷺ:{" "}
            <span className="text-foreground">
              «أغنوهم عن السؤال في هذا اليوم»
            </span>{" "}
            — رواه الدارقطني والبيهقي.
          </p>
          <p>• معيار AAOIFI 35 — بند زكاة الفطر: تُقدَّر بصاع من غالب قوت البلد.</p>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-primary/5 p-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-5 w-5 text-primary" /> النتيجة تقديرية استرشادية —
          يمكن اعتماد تسعيرة اللجنة الشرعية في بلدك.
        </div>
        <Button asChild variant="ghost" className="gap-1">
          <Link to="/faq">أسئلة زكاة الفطر</Link>
        </Button>
      </div>

      <div className="pt-4">
        <Button asChild variant="ghost" className="gap-1">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> عودة للرئيسية
          </Link>
        </Button>
      </div>
    </main>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border p-4 bg-card">
      <h3 className="font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
