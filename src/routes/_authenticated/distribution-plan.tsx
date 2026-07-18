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
import { Trash2, Plus, HeartHandshake, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/distribution-plan")({
  head: () => ({
    meta: [
      { title: "خطة توزيع الزكاة على المصارف الثمانية — نصاب" },
      {
        name: "description",
        content:
          "خطط توزيع زكاتك على المصارف الشرعية الثمانية مع تسجيل المستحقين وتوليد إيصالات دفع قابلة للطباعة.",
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

interface Recipient {
  id: string;
  channel: ChannelId;
  name: string;
  amount: number;
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

  const distributed = useMemo(
    () => recipients.reduce((s, r) => s + (r.amount || 0), 0),
    [recipients],
  );

  const addRecipient = () =>
    setRecipients((prev) => [
      ...prev,
      { id: crypto.randomUUID(), channel: "poor", name: "", amount: 0 },
    ]);

  const remaining = total - distributed;

  const exportPlan = () => {
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>خطة توزيع الزكاة</title>
      <style>body{font-family:system-ui;padding:24px;color:#111}table{border-collapse:collapse;width:100%;margin-top:12px}td,th{border:1px solid #ddd;padding:8px;text-align:right}</style>
      </head><body><h1>خطة توزيع الزكاة</h1>
      <p>الإجمالي: <b>${total.toLocaleString()}</b></p>
      <h2>النسب حسب المصارف</h2>
      <table><tr><th>المصرف</th><th>النسبة</th><th>المبلغ</th></tr>
      ${CHANNELS.map((c) => `<tr><td>${c.label}</td><td>${pct[c.id]}%</td><td>${perChannel[c.id].toLocaleString()}</td></tr>`).join("")}
      </table>
      <h2>المستفيدون</h2>
      <table><tr><th>الاسم</th><th>المصرف</th><th>المبلغ</th><th>ملاحظة</th></tr>
      ${recipients.map((r) => `<tr><td>${r.name || "—"}</td><td>${CHANNELS.find((c) => c.id === r.channel)?.label}</td><td>${r.amount.toLocaleString()}</td><td>${r.note ?? ""}</td></tr>`).join("")}
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
          يُشترط ألا يقل الفقراء والمساكين عن أغلب المصرف عند وجود الحاجة. اطلع على تفاصيل كل مصرف من
          {" "}
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
          {CHANNELS.map((c) => (
            <div key={c.id} className="grid grid-cols-[120px_1fr_100px_120px] items-center gap-3">
              <div className="text-sm">{c.label}</div>
              <Slider
                value={[pct[c.id]]}
                max={100}
                step={1}
                onValueChange={(v) => setPct((prev) => ({ ...prev, [c.id]: v[0] }))}
              />
              <Badge variant="outline">{pct[c.id]}%</Badge>
              <div className="text-sm font-semibold">{perChannel[c.id].toLocaleString()}</div>
            </div>
          ))}
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
          <CardTitle className="text-base">المستفيدون</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addRecipient}>
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
              لم تُضف مستفيدين بعد. ابدأ بإضافة أول مستفيد.
            </p>
          )}
          {recipients.map((r) => (
            <div key={r.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_1fr_40px] items-center">
              <Input
                value={r.name}
                placeholder="اسم المستفيد"
                onChange={(e) =>
                  setRecipients((prev) => prev.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))
                }
              />
              <select
                value={r.channel}
                className="h-9 rounded-md border bg-background px-3 text-sm"
                onChange={(e) =>
                  setRecipients((prev) => prev.map((x) => (x.id === r.id ? { ...x, channel: e.target.value as ChannelId } : x)))
                }
              >
                {CHANNELS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <Input
                type="number"
                value={r.amount}
                onChange={(e) =>
                  setRecipients((prev) => prev.map((x) => (x.id === r.id ? { ...x, amount: Number(e.target.value) || 0 } : x)))
                }
              />
              <Input
                value={r.note ?? ""}
                placeholder="ملاحظة"
                onChange={(e) =>
                  setRecipients((prev) => prev.map((x) => (x.id === r.id ? { ...x, note: e.target.value } : x)))
                }
              />
              <Button
                size="icon" variant="ghost" aria-label="حذف"
                onClick={() => setRecipients((prev) => prev.filter((x) => x.id !== r.id))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
