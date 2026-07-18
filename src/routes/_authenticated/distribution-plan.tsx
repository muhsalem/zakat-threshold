import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, HeartHandshake, Download, CalendarIcon, FileDown } from "lucide-react";
import { exportHtmlToPdf, pdfWrap } from "@/lib/export/pdf";

export const Route = createFileRoute("/_authenticated/distribution-plan")({
  head: () => ({
    meta: [
      { title: "خطة توزيع الزكاة على المصارف الثمانية — نصاب" },
      {
        name: "description",
        content:
          "خطط توزيع زكاتك على المصارف الشرعية الثمانية، قسّم المبلغ على عدة مستحقين بنسب أو مبالغ مع تواريخ صرف اختيارية.",
      },
    ],
  }),
  component: DistributionPlanPage,
});

const CHANNELS = [
  { id: "poor", label: "الفقراء" },
  { id: "needy", label: "المساكين" },
  { id: "collectors", label: "العاملون عليها" },
  { id: "reconciled", label: "المؤلفة قلوبهم" },
  { id: "slaves", label: "في الرقاب" },
  { id: "debtors", label: "الغارمون" },
  { id: "fisabilillah", label: "في سبيل الله" },
  { id: "wayfarer", label: "ابن السبيل" },
] as const;

type ChannelId = (typeof CHANNELS)[number]["id"];
type Mode = "amount" | "percent";

interface Recipient {
  id: string;
  channel: ChannelId;
  name: string;
  mode: Mode;
  /** المبلغ الثابت عند mode=amount */
  amount: number;
  /** النسبة من مبلغ المصرف عند mode=percent (0-100) */
  sharePct: number;
  /** تاريخ الصرف الاختياري (YYYY-MM-DD) */
  disburseDate?: string;
  note?: string;
}

function DistributionPlanPage() {
  const [total, setTotal] = useState(10000);
  const [pct, setPct] = useState<Record<ChannelId, number>>({
    poor: 40, needy: 30, collectors: 0, reconciled: 0,
    slaves: 0, debtors: 10, fisabilillah: 15, wayfarer: 5,
  });
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  const sumPct = useMemo(
    () => Object.values(pct).reduce((a, b) => a + b, 0),
    [pct],
  );

  const perChannel = useMemo(() => {
    const map: Record<ChannelId, number> = { ...pct };
    (Object.keys(map) as ChannelId[]).forEach((k) => {
      map[k] = +(total * (pct[k] / 100)).toFixed(2);
    });
    return map;
  }, [total, pct]);

  /** المبلغ الفعلي لكل مستحق بحسب الوضع */
  const effectiveAmount = (r: Recipient) =>
    r.mode === "percent"
      ? +((perChannel[r.channel] ?? 0) * (r.sharePct / 100)).toFixed(2)
      : +(r.amount || 0).toFixed(2);

  const distributed = useMemo(
    () => recipients.reduce((s, r) => s + effectiveAmount(r), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipients, perChannel],
  );

  /** توزيع لكل مصرف: (مخصص، مصروف، متبقٍ، تنبيه تجاوز) */
  const channelSummary = useMemo(() => {
    const out: Record<ChannelId, { alloc: number; spent: number; remaining: number; over: boolean }> =
      Object.create(null);
    for (const c of CHANNELS) {
      const alloc = perChannel[c.id];
      const spent = recipients
        .filter((r) => r.channel === c.id)
        .reduce((s, r) => s + effectiveAmount(r), 0);
      const remaining = +(alloc - spent).toFixed(2);
      out[c.id] = { alloc, spent: +spent.toFixed(2), remaining, over: spent - alloc > 0.005 };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipients, perChannel]);

  const addRecipient = (channel: ChannelId = "poor") =>
    setRecipients((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        channel,
        name: "",
        mode: "amount",
        amount: 0,
        sharePct: 0,
      },
    ]);

  const splitChannelEqually = (channel: ChannelId, parts: number) => {
    const n = Math.max(1, Math.floor(parts));
    const share = +(100 / n).toFixed(2);
    setRecipients((prev) => [
      ...prev.filter((r) => r.channel !== channel),
      ...Array.from({ length: n }, () => ({
        id: crypto.randomUUID(),
        channel,
        name: "",
        mode: "percent" as Mode,
        amount: 0,
        sharePct: share,
      })),
    ]);
    toast.success(`تم تقسيم مصرف "${CHANNELS.find(c => c.id === channel)?.label}" إلى ${n} مستحقين بالتساوي`);
  };

  const remaining = +(total - distributed).toFixed(2);

  const updateR = (id: string, patch: Partial<Recipient>) =>
    setRecipients((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const exportPlan = () => {
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>خطة توزيع الزكاة</title>
      <style>body{font-family:system-ui;padding:24px;color:#111}table{border-collapse:collapse;width:100%;margin-top:12px}td,th{border:1px solid #ddd;padding:8px;text-align:right}h2{margin-top:24px}</style>
      </head><body><h1>خطة توزيع الزكاة</h1>
      <p>الإجمالي: <b>${total.toLocaleString()}</b> — الموزَّع: <b>${distributed.toLocaleString()}</b> — المتبقي: <b>${remaining.toLocaleString()}</b></p>
      <h2>النسب حسب المصارف</h2>
      <table><tr><th>المصرف</th><th>النسبة</th><th>المخصَّص</th><th>المصروف</th><th>المتبقي</th></tr>
      ${CHANNELS.map((c) => `<tr><td>${c.label}</td><td>${pct[c.id]}%</td><td>${perChannel[c.id].toLocaleString()}</td><td>${channelSummary[c.id].spent.toLocaleString()}</td><td>${channelSummary[c.id].remaining.toLocaleString()}</td></tr>`).join("")}
      </table>
      <h2>المستفيدون</h2>
      <table><tr><th>الاسم</th><th>المصرف</th><th>النسبة/المبلغ</th><th>المبلغ الفعلي</th><th>تاريخ الصرف</th><th>ملاحظة</th></tr>
      ${recipients.map((r) => `<tr><td>${r.name || "—"}</td><td>${CHANNELS.find((c) => c.id === r.channel)?.label}</td><td>${r.mode === "percent" ? r.sharePct + "% من المصرف" : "مبلغ ثابت"}</td><td>${effectiveAmount(r).toLocaleString()}</td><td>${r.disburseDate ?? "—"}</td><td>${r.note ?? ""}</td></tr>`).join("")}
      </table></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) setTimeout(() => w.print(), 500);
    toast.success("جاهز للطباعة");
  };

  return (
    <div className="container mx-auto max-w-5xl p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <HeartHandshake className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold">خطة توزيع الزكاة على المصارف الثمانية</h1>
      </div>

      <Alert>
        <AlertDescription>
          استند التوزيع إلى الآية <b>﴿إنما الصدقات للفقراء والمساكين…﴾</b> [التوبة: 60].
          يمكنك الآن تقسيم مبلغ كل مصرف على عدة مستحقين بنسبة مئوية من المصرف أو بمبلغ ثابت،
          مع إضافة تاريخ صرف اختياري لكل مستحق. تفاصيل كل مصرف من{" "}
          <Link to="/eight-channels" className="text-primary underline">صفحة المصارف الثمانية</Link>.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4">
          <Label className="text-xs">إجمالي الزكاة</Label>
          <Input type="number" value={total} onChange={(e) => setTotal(Number(e.target.value) || 0)} />
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className={`text-2xl font-bold ${sumPct === 100 ? "text-green-600" : "text-amber-600"}`}>{sumPct}%</div>
          <div className="text-xs text-muted-foreground">مجموع النسب</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{distributed.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">وُزّع على مستفيدين</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className={`text-2xl font-bold ${remaining === 0 ? "text-green-600" : "text-primary"}`}>{remaining.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">المتبقي للتوزيع</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">النسب حسب المصارف</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {CHANNELS.map((c) => {
            const s = channelSummary[c.id];
            return (
              <div key={c.id} className="space-y-1">
                <div className="grid grid-cols-[110px_1fr_70px_110px_auto] items-center gap-2">
                  <div className="text-sm">{c.label}</div>
                  <Slider
                    value={[pct[c.id]]}
                    max={100}
                    step={1}
                    onValueChange={(v) => setPct((prev) => ({ ...prev, [c.id]: v[0] }))}
                  />
                  <Badge variant="outline">{pct[c.id]}%</Badge>
                  <div className="text-sm font-semibold">{perChannel[c.id].toLocaleString()}</div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => addRecipient(c.id)}>
                      <Plus className="h-3 w-3 ml-1" /> مستحق
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const n = Number(prompt(`عدد المستحقين للتقسيم بالتساوي في مصرف "${c.label}"?`, "3"));
                        if (n > 0) splitChannelEqually(c.id, n);
                      }}
                    >
                      تقسيم
                    </Button>
                  </div>
                </div>
                {pct[c.id] > 0 && (
                  <div className={`text-[11px] pr-[118px] ${s.over ? "text-destructive" : "text-muted-foreground"}`}>
                    مصروف: {s.spent.toLocaleString()} · متبقٍ: {s.remaining.toLocaleString()}
                    {s.over && " · تجاوز مخصَّص المصرف"}
                  </div>
                )}
              </div>
            );
          })}
          {sumPct !== 100 && (
            <Alert>
              <AlertDescription>
                يجب أن يكون مجموع النسب 100% (الحالي {sumPct}%). عدّل الشرائح ليصل المجموع للنسبة الكاملة.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">المستفيدون ({recipients.length})</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => addRecipient()}>
              <Plus className="h-4 w-4 ml-1" /> إضافة مستفيد
            </Button>
            <Button size="sm" onClick={exportPlan}>
              <Download className="h-4 w-4 ml-1" /> طباعة الخطة
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {recipients.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              لم تُضف مستفيدين بعد. أضِف مستحقاً من هنا أو من زر "مستحق" بجوار كل مصرف.
            </p>
          )}
          {recipients.map((r) => {
            const eff = effectiveAmount(r);
            return (
              <div
                key={r.id}
                className="grid gap-2 sm:grid-cols-[1fr_140px_120px_140px_150px_1fr_36px] items-center border rounded-md p-2"
              >
                <Input
                  value={r.name}
                  placeholder="اسم المستحق"
                  maxLength={120}
                  onChange={(e) => updateR(r.id, { name: e.target.value })}
                />
                <Select value={r.channel} onValueChange={(v) => updateR(r.id, { channel: v as ChannelId })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={r.mode} onValueChange={(v) => updateR(r.id, { mode: v as Mode })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">مبلغ ثابت</SelectItem>
                    <SelectItem value="percent">نسبة من المصرف</SelectItem>
                  </SelectContent>
                </Select>
                {r.mode === "percent" ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      value={r.sharePct}
                      onChange={(e) => updateR(r.id, { sharePct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                    />
                    <span className="text-xs">%</span>
                  </div>
                ) : (
                  <Input
                    type="number"
                    min={0}
                    value={r.amount}
                    onChange={(e) => updateR(r.id, { amount: Math.max(0, Number(e.target.value) || 0) })}
                  />
                )}
                <div className="relative">
                  <CalendarIcon className="absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={r.disburseDate ?? ""}
                    onChange={(e) => updateR(r.id, { disburseDate: e.target.value || undefined })}
                    className="pe-7"
                    aria-label="تاريخ الصرف"
                  />
                </div>
                <Input
                  value={r.note ?? ""}
                  placeholder="ملاحظة"
                  maxLength={200}
                  onChange={(e) => updateR(r.id, { note: e.target.value })}
                />
                <Button
                  size="icon" variant="ghost" aria-label="حذف"
                  onClick={() => setRecipients((prev) => prev.filter((x) => x.id !== r.id))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <div className="col-span-full text-[11px] text-muted-foreground pr-1">
                  المبلغ الفعلي: <b className="text-foreground">{eff.toLocaleString()}</b>
                  {r.mode === "percent" && ` (${r.sharePct}% من ${perChannel[r.channel].toLocaleString()})`}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
