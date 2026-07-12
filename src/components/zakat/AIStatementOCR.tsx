import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Upload, Loader2, FileText, Info, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ZAKAT_RATE } from "@/lib/zakat";

interface ExtractedItem {
  category: string;
  label: string;
  amount: number;
  zakatable: boolean;
  confidence: number;
  note?: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  cash: "نقد وما في حكمه",
  receivables_strong: "ذمم مرجوّة",
  inventory: "مخزون للمتاجرة",
  murabaha: "ذمم مرابحة",
  ijara: "ذمم إجارة",
  istisna: "ذمم استصناع",
  sukuk_trading: "صكوك للمتاجرة",
  equity_trading: "أسهم للمتاجرة",
  mudaraba_share: "حصة مضاربة",
  musharaka_share: "حصة مشاركة",
  precious_metals: "ذهب/فضة",
  fixed_assets_use: "أصول ثابتة للاستخدام",
  intangibles: "أصول غير ملموسة",
  psia: "ودائع مضاربة (PSIA)",
  takaful_participants: "صندوق المشتركين",
  current_payables: "التزامات مستحقة",
  doubtful_provision: "مخصّص ديون مشكوك فيها",
  unclassified: "غير مصنّف — يحتاج مراجعة",
};

export default function AIStatementOCR() {
  const [text, setText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ExtractedItem[]>([]);

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("الحد الأقصى 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const b64 = result.split(",")[1] || "";
      setImageBase64(b64);
      setImageType(file.type);
      toast.success(`تم تحميل الصورة: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const onExtract = async () => {
    if (!text.trim() && !imageBase64) {
      toast.error("ألصق النص أو ارفع صورة أولاً");
      return;
    }
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        toast.error("يجب تسجيل الدخول لاستخدام الذكاء الاصطناعي");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/extract-statement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: text.trim() || undefined,
          imageBase64: imageBase64 || undefined,
          imageType: imageType || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `فشل الاستخراج (${res.status})`);
        setLoading(false);
        return;
      }

      const data = (await res.json()) as { items: ExtractedItem[] };
      setItems(data.items || []);
      toast.success(`تم استخراج ${data.items?.length || 0} بند`);
    } catch (e) {
      toast.error(`خطأ: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const totals = items.reduce(
    (acc, it) => {
      if (it.zakatable) acc.zakatable += it.amount;
      else if (it.category === "current_payables" || it.category === "doubtful_provision") acc.deductions += it.amount;
      else acc.excluded += it.amount;
      return acc;
    },
    { zakatable: 0, deductions: 0, excluded: 0 },
  );
  const base = Math.max(0, totals.zakatable - totals.deductions);
  const zakat = base * ZAKAT_RATE;

  const fmt = (n: number) => new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(n);

  const copyAsCsv = () => {
    if (items.length === 0) return;
    const header = "الفئة,البند,المبلغ,زكوي,ثقة\n";
    const rows = items
      .map((it) =>
        [
          CATEGORY_LABEL[it.category] || it.category,
          `"${it.label.replace(/"/g, '""')}"`,
          it.amount,
          it.zakatable ? "نعم" : "لا",
          it.confidence.toFixed(2),
        ].join(","),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-extract-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          استخراج الوعاء الزكوي بالذكاء الاصطناعي
          <Badge variant="outline">Vision + Text</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription className="text-xs">
            ألصق نص قائمة المركز المالي، أو ارفع صورة/سكرين شوت للقائمة، وسيقوم الذكاء الاصطناعي بتصنيف كل بند تلقائياً إلى
            فئات زكوية / مستبعَدة / خصومات وفق AAOIFI 35. راجع النتيجة قبل اعتمادها.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <FileText className="w-4 h-4" />
              النص المُلصق
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ألصق هنا محتوى قائمة المركز المالي (نصاً)…"
              rows={8}
              className="text-xs font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Upload className="w-4 h-4" />
              أو صورة/سكرين شوت
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={onPickImage}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {imageBase64 && (
              <div className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> جاهزة للإرسال ({Math.round((imageBase64.length * 3) / 4 / 1024)}KB)
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">حد أقصى 5MB. يمكن الجمع بين النص والصورة.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onExtract} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Sparkles className="w-4 h-4 ml-1" />}
            استخراج وتصنيف
          </Button>
          {items.length > 0 && (
            <Button variant="outline" onClick={copyAsCsv}>
              تنزيل CSV
            </Button>
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <Metric label="زكوي" value={fmt(totals.zakatable)} tone="ok" />
              <Metric label="خصومات" value={fmt(totals.deductions)} tone="warn" />
              <Metric label="مستبعَد" value={fmt(totals.excluded)} tone="mute" />
              <Metric label={`الزكاة (${(ZAKAT_RATE * 100).toFixed(1)}%)`} value={fmt(zakat)} tone="primary" />
            </div>

            <div className="overflow-x-auto rounded border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-2">الفئة</th>
                    <th className="text-right p-2">البند</th>
                    <th className="text-left p-2">المبلغ</th>
                    <th className="text-center p-2">زكوي</th>
                    <th className="text-center p-2">ثقة</th>
                    <th className="text-right p-2">ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 whitespace-nowrap">{CATEGORY_LABEL[it.category] || it.category}</td>
                      <td className="p-2">{it.label}</td>
                      <td className="p-2 text-left tabular-nums">{fmt(it.amount)}</td>
                      <td className="p-2 text-center">
                        {it.zakatable ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground inline" />
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant={it.confidence >= 0.8 ? "default" : "secondary"} className="text-[10px]">
                          {Math.round(it.confidence * 100)}%
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{it.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">
              ⚠️ النتيجة أوّليّة وتحتاج مراجعة محاسبي/شرعي معتمد قبل الاعتماد النهائي.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "mute" | "primary" }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : tone === "warn"
        ? "bg-amber-50 border-amber-200 text-amber-800"
        : tone === "primary"
          ? "bg-primary/5 border-primary/40 text-primary"
          : "bg-muted/40 border-muted";
  return (
    <div className={`rounded p-2 border ${cls}`}>
      <div className="text-[10px] opacity-80">{label}</div>
      <div className="font-bold tabular-nums">{value}</div>
    </div>
  );
}
