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
import { Wheat, Calculator, BookOpen, ShieldCheck, ArrowLeft, Users, FileDown, Archive, Trash2, BarChart3, Save, Cloud, CloudOff, Share2, Link2Off } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createShareLink, revokeShareLink } from "@/lib/archive/share.functions";
import { exportHtmlToPdf, pdfWrap } from "@/lib/export/pdf";
import { toast } from "sonner";
import {
  listArchive,
  saveArchiveEntry,
  deleteArchiveEntry,
  clearArchive as clearCloudArchive,
  migrateLocalToCloud,
  type ArchiveRow,
} from "@/lib/archive/cloud";
import { supabase } from "@/integrations/supabase/client";

type FitrPayload = {
  peopleCount: number;
  stapleId: string;
  stapleLabel: string;
  kgPerSaa: number;
  pricePerKg: number;
  totalKg: number;
  totalCash: number;
  savedAt: string;
};

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

function rowToEntry(r: ArchiveRow<FitrPayload>): FitrArchiveEntry {
  const p = r.payload || ({} as FitrPayload);
  return {
    id: r.id,
    year: r.year ?? new Date().getFullYear(),
    savedAt: p.savedAt || r.updated_at,
    peopleCount: p.peopleCount ?? 0,
    stapleId: p.stapleId ?? "wheat",
    stapleLabel: p.stapleLabel ?? "قمح / دقيق",
    kgPerSaa: p.kgPerSaa ?? 2.5,
    pricePerKg: p.pricePerKg ?? 0,
    currency: r.currency ?? "USD",
    totalKg: p.totalKg ?? 0,
    totalCash: p.totalCash ?? 0,
  };
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
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  async function refreshArchive() {
    try {
      const rows = await listArchive<FitrPayload>("fitr");
      setArchive(rows.map(rowToEntry).sort((a, b) => b.year - a.year));
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const authed = !!data.user;
      setIsAuthed(authed);
      if (authed) {
        try {
          const migrated = await migrateLocalToCloud("fitr");
          if (migrated > 0) toast.success(`تمت مزامنة ${migrated} سجل إلى حسابك`);
        } catch (e) { console.error(e); }
      }
      await refreshArchive();
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        (async () => {
          const { data } = await supabase.auth.getUser();
          setIsAuthed(!!data.user);
          if (data.user) {
            try { await migrateLocalToCloud("fitr"); } catch (e) { console.error(e); }
          }
          await refreshArchive();
        })();
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const active = STAPLES.find((s) => s.id === staple)!;
  const totalKg = useMemo(() => peopleCount * active.kgPerSaa, [peopleCount, active.kgPerSaa]);
  const totalCash = useMemo(() => totalKg * (pricePerKg || 0), [totalKg, pricePerKg]);

  function pickStaple(id: StapleId) {
    setStaple(id);
    const s = STAPLES.find((x) => x.id === id)!;
    setPricePerKg(s.suggestedPricePerKg);
  }

  async function archiveCurrent() {
    setBusy(true);
    try {
      await saveArchiveEntry<FitrPayload>("fitr", {
        year,
        currency,
        payload: {
          peopleCount,
          stapleId: active.id,
          stapleLabel: active.label,
          kgPerSaa: active.kgPerSaa,
          pricePerKg,
          totalKg,
          totalCash,
          savedAt: new Date().toISOString(),
        },
      });
      await refreshArchive();
      toast.success(
        isAuthed
          ? `تم حفظ زكاة الفطر لسنة ${year} في حسابك`
          : `تم الحفظ محلياً — سجّل دخولك للمزامنة السحابية`,
      );
    } catch (e) {
      console.error(e);
      toast.error("تعذّر حفظ السجل");
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(id: string) {
    try {
      await deleteArchiveEntry("fitr", id);
      await refreshArchive();
    } catch (e) {
      console.error(e);
      toast.error("تعذّر حذف السجل");
    }
  }

  async function clearArchive() {
    if (!confirm("حذف كل السجلات المؤرشفة؟")) return;
    try {
      await clearCloudArchive("fitr");
      await refreshArchive();
    } catch (e) {
      console.error(e);
      toast.error("تعذّر حذف الأرشيف");
    }
  }

  const createShare = useServerFn(createShareLink);
  const revokeShare = useServerFn(revokeShareLink);

  async function shareEntry(id: string) {
    if (!isAuthed) {
      toast.error("سجّل الدخول لتفعيل روابط المشاركة السحابية");
      return;
    }
    try {
      const days = Number(prompt("مدة صلاحية الرابط بالأيام (اترك فارغاً لرابط دائم):", "30") || 0);
      const { token } = await createShare({ data: { id, expiresInDays: days || null } });
      const url = `${window.location.origin}/r/${token}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("تم نسخ رابط المشاركة", { description: url });
      } catch {
        toast.success("تم إنشاء الرابط", { description: url });
      }
    } catch (e) {
      console.error(e);
      toast.error("تعذّر إنشاء الرابط");
    }
  }

  async function revokeEntry(id: string) {
    if (!confirm("إلغاء رابط المشاركة لهذا التقرير؟")) return;
    try {
      await revokeShare({ data: { id } });
      toast.success("تم إلغاء الرابط");
    } catch (e) {
      console.error(e);
      toast.error("تعذّر إلغاء الرابط");
    }
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

            <div className="space-y-1.5">
              <Label htmlFor="year">السنة الميلادية</Label>
              <Input
                id="year"
                type="number"
                min={1900}
                max={2100}
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
              />
              <p className="text-xs text-muted-foreground">
                تُستخدم لأرشفة الحساب ومقارنته بالسنوات السابقة.
              </p>
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
            <Button variant="secondary" className="gap-1.5" onClick={archiveCurrent} disabled={busy}>
              <Save className="h-4 w-4" /> أرشفة نتيجة {year}
            </Button>
            <Button asChild variant="outline">
              <Link to="/advisor">اسأل المستشار الشرعي</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {archive.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Archive className="h-5 w-5 text-primary" /> الأرشيف ({archive.length})
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={clearArchive}>
              <Trash2 className="h-4 w-4" /> حذف الكل
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(comparison).map(([cur, entries]) => {
              const first = entries[0];
              const last = entries[entries.length - 1];
              const diff = entries.length > 1 ? last.totalCash - first.totalCash : 0;
              const pct = entries.length > 1 && first.totalCash > 0
                ? (diff / first.totalCash) * 100 : 0;
              return (
                <div key={cur} className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      مقارنة السنوات — {cur}
                    </div>
                    {entries.length > 1 && (
                      <Badge variant={diff >= 0 ? "default" : "secondary"} className="text-xs">
                        {diff >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% من {first.year} إلى {last.year}
                      </Badge>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted/50 text-xs">
                          <th className="border p-2 text-start">السنة</th>
                          <th className="border p-2 text-start">الأفراد</th>
                          <th className="border p-2 text-start">القوت</th>
                          <th className="border p-2 text-start">سعر/كجم</th>
                          <th className="border p-2 text-start">الوزن (كجم)</th>
                          <th className="border p-2 text-start">القيمة ({cur})</th>
                          <th className="border p-2 text-start">التغيّر</th>
                          <th className="border p-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e, i) => {
                          const prev = i > 0 ? entries[i - 1] : null;
                          const d = prev ? e.totalCash - prev.totalCash : 0;
                          const p = prev && prev.totalCash > 0 ? (d / prev.totalCash) * 100 : 0;
                          return (
                            <tr key={e.id} className="hover:bg-muted/30">
                              <td className="border p-2 font-semibold">{e.year}</td>
                              <td className="border p-2">{e.peopleCount}</td>
                              <td className="border p-2">{e.stapleLabel}</td>
                              <td className="border p-2">{e.pricePerKg}</td>
                              <td className="border p-2">{e.totalKg.toLocaleString("ar-EG", { maximumFractionDigits: 2 })}</td>
                              <td className="border p-2 font-bold">{e.totalCash.toLocaleString("ar-EG", { maximumFractionDigits: 2 })}</td>
                              <td className={`border p-2 text-xs ${d > 0 ? "text-emerald-600" : d < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                {prev ? `${d >= 0 ? "+" : ""}${p.toFixed(1)}%` : "—"}
                              </td>
                              <td className="border p-1 text-center whitespace-nowrap">
                                {isAuthed && !String(e.id).startsWith("local-") && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="مشاركة" onClick={() => shareEntry(e.id)}>
                                      <Share2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="إلغاء الرابط" onClick={() => revokeEntry(e.id)}>
                                      <Link2Off className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEntry(e.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground border-e-2 border-primary/40 pe-3 flex items-center gap-1.5">
              {isAuthed ? (
                <><Cloud className="h-3.5 w-3.5 text-primary" /> الأرشيف محفوظ في حسابك ويُزامن تلقائياً عبر أجهزتك.</>
              ) : (
                <><CloudOff className="h-3.5 w-3.5" /> الأرشيف محفوظ محلياً على هذا المتصفح — <Link to="/auth" className="underline hover:text-primary">سجّل الدخول</Link> لمزامنته سحابياً عبر أجهزتك.</>
              )}
            </p>
          </CardContent>
        </Card>
      )}


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
