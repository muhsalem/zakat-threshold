import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Wheat, Info, Scale } from "lucide-react";
import {
  CROPS_NISAB_KG,
  CROPS_RATE_NATURAL,
  CROPS_RATE_IRRIGATED,
  CROPS_RATE_MIXED,
  fmt,
  num,
} from "@/lib/zakat";

/**
 * زكاة الزروع والثمار — وفق الجمهور:
 * - النصاب: 5 أوسق ≈ 653 كجم من الحب أو الثمر بعد التصفية والتجفيف.
 * - المعدّل: 10% بالسقي الطبيعي (مطر/أنهار)، 5% بالسقي بكلفة (آلات/شراء ماء)،
 *   7.5% في حال الجمع بينهما.
 * - تُخرج عند الحصاد، لا يُشترط الحول.
 * - الزراعة الحديثة والبيوت المحمية تأخذ نفس الحكم؛ تكاليف التشغيل لا تُخصم
 *   من الوعاء بل تُؤثّر في تحديد فئة الري.
 */

type Irrigation = "natural" | "irrigated" | "mixed";

export function CropsZakatSection({ currencyName = "ج.م" }: { currencyName?: string }) {
  const [quantityKg, setQuantityKg] = useState("0");
  const [pricePerKg, setPricePerKg] = useState("0");
  const [irrigation, setIrrigation] = useState<Irrigation>("natural");

  const qty = num(quantityKg);
  const price = num(pricePerKg);

  const rate = useMemo(() => {
    if (irrigation === "natural") return CROPS_RATE_NATURAL;
    if (irrigation === "irrigated") return CROPS_RATE_IRRIGATED;
    return CROPS_RATE_MIXED;
  }, [irrigation]);

  const reached = qty >= CROPS_NISAB_KG;
  const zakatKg = reached ? qty * rate : 0;
  const zakatValue = zakatKg * price;

  return (
    <Card className="shadow-soft border-primary/20" dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wheat className="h-4 w-4 text-primary" />
          زكاة الزروع والثمار
          <Badge variant="outline" className="text-[10px] mr-auto">قول الجمهور</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            النصاب: <b>{CROPS_NISAB_KG} كجم</b> (5 أوسق) بعد التصفية والتجفيف.
            تُخرج عند الحصاد ولا يُشترط الحول. المعدّل يعتمد على طبيعة الري.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">إجمالي المحصول (كجم)</Label>
            <Input
              type="number" min="0" step="0.01"
              value={quantityKg}
              onChange={(e) => setQuantityKg(e.target.value)}
              dir="ltr" style={{ textAlign: "right" }} placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">سعر الكيلو ({currencyName}) — اختياري</Label>
            <Input
              type="number" min="0" step="0.01"
              value={pricePerKg}
              onChange={(e) => setPricePerKg(e.target.value)}
              dir="ltr" style={{ textAlign: "right" }} placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">طريقة الري</Label>
            <RadioGroup
              value={irrigation}
              onValueChange={(v) => setIrrigation(v as Irrigation)}
              className="flex flex-col gap-1 text-xs pt-1"
            >
              <label className="flex items-center gap-1.5">
                <RadioGroupItem value="natural" /> طبيعي (مطر/أنهار) — 10%
              </label>
              <label className="flex items-center gap-1.5">
                <RadioGroupItem value="irrigated" /> بكلفة (آلات/شراء) — 5%
              </label>
              <label className="flex items-center gap-1.5">
                <RadioGroupItem value="mixed" /> مشترك — 7.5%
              </label>
            </RadioGroup>
          </div>
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 grid md:grid-cols-4 gap-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">حالة النصاب</div>
            <div className={`font-bold ${reached ? "text-primary" : "text-destructive"}`}>
              {reached ? "بالغ النصاب ✓" : "دون النصاب"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">المعدّل المطبَّق</div>
            <div className="font-bold">{(rate * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">الزكاة عيناً</div>
            <div className="font-bold text-primary">{fmt(zakatKg)} كجم</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">الزكاة بالقيمة</div>
            <div className="font-bold text-primary text-lg">
              {fmt(zakatValue)} {currencyName}
            </div>
          </div>
        </div>

        <Alert className="border-muted">
          <Scale className="h-4 w-4" />
          <AlertDescription className="text-[11px] leading-relaxed">
            <b>مرجع:</b> «ليس فيما دون خمسة أوسق صدقة» — متفق عليه. والوسق ستون صاعاً (~130.6 كجم).
            البيوت المحمية والمحاصيل الحديثة كالعادي ما دامت من القوت أو الثمر الذي يُدَّخر.
            الخضروات والفواكه غير المُدَّخرة محل خلاف — الراجح عند الجمهور: لا زكاة فيها عيناً، وتدخل في عروض التجارة إن أُعِدّت للبيع.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default CropsZakatSection;
