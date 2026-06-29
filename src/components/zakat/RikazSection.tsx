import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Gem, Pickaxe, FlaskConical, Fish, Drumstick, Info, Calculator,
} from "lucide-react";
import { num, fmt, currency, ZAKAT_RATE } from "@/lib/zakat";

/**
 * زكاة الركاز والمعادن والعسل والثروات المستحدثة
 *
 * المراجع الشرعية:
 * - الركاز: «وفي الركاز الخُمس» (متفق عليه) — 20% فوراً بلا نصاب ولا حول.
 * - المعادن: 2.5% عند الجمهور (مالك والشافعي وأحمد) على الذهب والفضة بعد بلوغ النصاب،
 *   و 20% عند أبي حنيفة قياساً على الركاز. والمختار في الفتوى المعاصرة (AAOIFI):
 *   2.5% على صافي قيمة المعدن المستخرج بعد خصم تكاليف الاستخراج.
 * - العسل: 10% عند أبي حنيفة وأحمد إن بلغ النصاب (≈ 653 كجم أو ما يساوي قيمة 5 أوسق من غالب القوت)
 *   قياساً على الزروع. ولا زكاة فيه عند الشافعية.
 * - الثروة السمكية والدواجن: عند المعاصرين تُعامل معاملة عروض التجارة (2.5% على صافي
 *   قيمة الأصول المتداولة بعد خصم التكاليف والديون) إذا كانت بقصد التجارة.
 *   انظر: قرار المجمع الفقهي رقم 28، وفتاوى دار الإفتاء المصرية.
 */

const RIKAZ_RATE = 0.20;
const MINERALS_RATE_HANAFI = 0.20;
const HONEY_RATE = 0.10;
const HONEY_NISAB_KG = 653; // قياساً على نصاب الزروع

interface NumFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  hint?: string;
}
function NumField({ label, value, onChange, unit, hint }: NumFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="number" min="0" step="0.01" inputMode="decimal"
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="0" className="pl-16" dir="ltr"
          style={{ textAlign: "right" }}
        />
        {unit && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export type RikazMode = "all" | "rikaz-metals" | "agri-extras";

interface RikazProps {
  mode?: RikazMode;
  currency?: string;
  onTradeBaseChange?: (amount: number) => void;
  /** يُرسل إجمالي زكاة الركاز والمعادن والملحقات إلى الأب عند التغيير. */
  onTotalChange?: (amount: number) => void;
}

export function RikazSection({ mode = "all", currency: currencyProp, onTradeBaseChange, onTotalChange }: RikazProps = {}) {
  const showRikaz = mode === "all" || mode === "rikaz-metals";
  const showMinerals = mode === "all" || mode === "rikaz-metals";
  const showHoney = mode === "all" || mode === "agri-extras";
  const showFish = mode === "all" || mode === "agri-extras";
  const showPoultry = mode === "all" || mode === "agri-extras";

  // ① الركاز (كنوز الجاهلية المدفونة)
  const [rikazValue, setRikazValue] = useState("");

  // ② المعادن المستخرجة
  const [mineralsValue, setMineralsValue] = useState("");
  const [mineralsCost, setMineralsCost] = useState("");
  const [mineralsOpinion, setMineralsOpinion] = useState<"jumhur" | "hanafi">("jumhur");

  // ③ العسل
  const [honeyKg, setHoneyKg] = useState("");
  const [honeyPricePerKg, setHoneyPricePerKg] = useState("");

  // ④ الثروة السمكية / مزارع الأسماك
  const [fishValue, setFishValue] = useState("");
  const [fishCost, setFishCost] = useState("");

  // ⑤ مزارع الدواجن
  const [poultryValue, setPoultryValue] = useState("");
  const [poultryCost, setPoultryCost] = useState("");

  const calc = useMemo(() => {
    const rikazZakat = num(rikazValue) * RIKAZ_RATE;

    const mineralsNet = Math.max(0, num(mineralsValue) - num(mineralsCost));
    const mineralsRate = mineralsOpinion === "hanafi" ? MINERALS_RATE_HANAFI : ZAKAT_RATE;
    const mineralsZakat = mineralsNet * mineralsRate;

    const honeyEligible = num(honeyKg) >= HONEY_NISAB_KG;
    const honeyValue = num(honeyKg) * num(honeyPricePerKg);
    const honeyZakat = honeyEligible ? honeyValue * HONEY_RATE : 0;

    const fishNet = Math.max(0, num(fishValue) - num(fishCost));
    const fishZakat = fishNet * ZAKAT_RATE;

    const poultryNet = Math.max(0, num(poultryValue) - num(poultryCost));
    const poultryZakat = poultryNet * ZAKAT_RATE;

    const total = rikazZakat + mineralsZakat + honeyZakat + fishZakat + poultryZakat;

    return {
      rikazZakat, mineralsNet, mineralsZakat, mineralsRate,
      honeyEligible, honeyValue, honeyZakat,
      fishNet, fishZakat, poultryNet, poultryZakat, total,
    };
  }, [
    rikazValue, mineralsValue, mineralsCost, mineralsOpinion,
    honeyKg, honeyPricePerKg, fishValue, fishCost, poultryValue, poultryCost,
  ]);

  // إعلام الأب بقاعدة عروض التجارة (العسل + الأسماك + الدواجن) عند تفعيل التبويب الزراعي الملحق
  useEffect(() => {
    if (!onTradeBaseChange) return;
    const base =
      (showHoney && calc.honeyEligible ? calc.honeyValue : 0) +
      (showFish ? calc.fishNet : 0) +
      (showPoultry ? calc.poultryNet : 0);
    onTradeBaseChange(base);
  }, [onTradeBaseChange, showHoney, showFish, showPoultry, calc.honeyEligible, calc.honeyValue, calc.fishNet, calc.poultryNet]);

  // إعلام الأب بإجمالي زكاة هذا القسم (لإدراجها في التقرير الإجمالي) — لا يُنقل للملحقات الزراعية لتجنب الازدواج مع عروض التجارة
  useEffect(() => {
    if (!onTotalChange || mode === "agri-extras") return;
    onTotalChange(calc.total);
  }, [onTotalChange, calc.total, mode]);

  const activeCurrency = currencyProp ?? "SAR";
  const cur = (n: number) => currency(n, activeCurrency);

  return (
    <div dir="rtl" className="grid lg:grid-cols-3 gap-6 text-right">
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gem className="h-5 w-5 text-primary" />
              {mode === "rikaz-metals"
                ? "زكاة الركاز والمعادن"
                : mode === "agri-extras"
                  ? "العسل والثروة السمكية ومزارع الدواجن"
                  : "زكاة الركاز والمعادن والثروات المستحدثة"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-primary/30 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs leading-relaxed">
                {mode === "rikaz-metals"
                  ? <>هذا القسم يحسب <b>الركاز</b> (الكنوز المدفونة من الجاهلية — الخُمس 20%) و<b>المعادن</b> المستخرجة من باطن الأرض.</>
                  : mode === "agri-extras"
                    ? <>أنواع زراعية وحيوانية تُلحق بزكاة الزروع والثمار: <b>العسل</b> (10% عند بلوغ النصاب) و<b>الثروة السمكية</b> و<b>مزارع الدواجن</b> المعدّة للتجارة (2.5%).</>
                    : <>هذا القسم يجمع أنواع الزكاة التي يقلّ السؤال عنها لكنها <b>واجبة شرعاً</b> متى تحققت شروطها.</>}
              </AlertDescription>
            </Alert>

            {mode === "agri-extras" && (
              <Alert className="border-gold/40 bg-gold/5">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">
                  <b>تنبيه محاسبي:</b> صافي قيمة <b>العسل</b> (إن بلغ النصاب) و<b>الثروة السمكية</b> و<b>مزارع الدواجن</b>
                  تُضمّ تلقائياً إلى قاعدة <b>عروض التجارة</b> في الحساب الإجمالي للزكاة (نسبة 2.5%) ولا تُحسب مرتين.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {mode !== "agri-extras" && (
          <Card className="shadow-soft border-primary/20">
            <CardContent className="p-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 grid md:grid-cols-4 gap-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">الركاز (20%)</div>
                  <div className="font-bold text-primary">{cur(calc.rikazZakat)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">المعادن ({(calc.mineralsRate * 100).toFixed(1)}%)</div>
                  <div className="font-bold text-primary">{cur(calc.mineralsZakat)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">الملحقات الزراعية (2.5% / 10%)</div>
                  <div className="font-bold text-primary">{cur(calc.honeyZakat + calc.fishZakat + calc.poultryZakat)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">إجمالي الزكاة</div>
                  <div className="font-bold text-primary text-lg">{cur(calc.total)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Accordion type="multiple" defaultValue={[showRikaz ? "rikaz" : showHoney ? "honey" : ""]} className="space-y-3">
          {showRikaz && (
          <AccordionItem value="rikaz" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Pickaxe className="h-5 w-5 text-gold" /> ① هل اكتشفت ركازاً (كنزاً مدفوناً)؟ — الخُمس (20%)
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">
                  <b>الركاز:</b> ما وُجد مدفوناً من كنوز الجاهلية (قبل الإسلام). فيه <b>الخُمس (20%) فوراً</b>
                  بلا اشتراط نصاب ولا حول، لقوله ﷺ: «وفي الركاز الخُمس» (متفق عليه).
                  وإن كانت عليه علامات الإسلام فهو لُقطة تُعامل معاملتها.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs leading-relaxed">
                <div className="font-semibold text-primary">أسئلة استرشادية قبل الإقرار:</div>
                <ol className="list-decimal pr-5 space-y-1">
                  <li>هل وجدتَ الكنز في <b>أرض مملوكة لك</b> أم في أرضٍ <b>موات</b> (لا مالك لها)؟ — الركاز في الأرض المملوكة للغير يُرجع لمالكها.</li>
                  <li>هل عليه <b>علامات إسلامية</b> (نقوش/كتابة عربية/شهادتان)؟ إن نعم فهو <b>لُقطة</b> لا ركاز.</li>
                  <li>هل وثَّقتَ تاريخ ووصف وموقع الاكتشاف لدى الجهة المختصة؟</li>
                  <li>هل قُومت قيمتُه بالقيمة السوقية <b>يوم اكتشافه</b> بشهادة خبير مُثمِّن؟</li>
                </ol>
              </div>

              <NumField
                label="إجمالي القيمة السوقية للركاز يوم اكتشافه"
                value={rikazValue} onChange={setRikazValue}
                unit={country.currency}
                hint="القيمة المُثمَّنة بشهادة خبير، لا قيمة الذهب الخام فقط"
              />
              {num(rikazValue) > 0 && (
                <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm">
                  الزكاة المستحقة: <b className="text-primary">{cur(calc.rikazZakat)}</b> (20% — تُخرج فور الاكتشاف بلا حول ولا نصاب)
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
          )}

          {showMinerals && (
          <AccordionItem value="minerals" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <FlaskConical className="h-5 w-5 text-primary" /> ② هل تستخرج معادن من باطن الأرض؟
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">
                  المعادن النفيسة (ذهب، فضة، نحاس، حديد، بترول، فوسفات…) المستخرجة من باطن الأرض.
                  <b> الجمهور:</b> فيها 2.5% على صافي القيمة بعد خصم التكاليف.
                  <b> أبو حنيفة:</b> فيها 20% قياساً على الركاز.
                  المختار محاسبياً (AAOIFI): قول الجمهور لأنه أرفق وأقرب لطبيعة النشاط الاستثماري.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs leading-relaxed">
                <div className="font-semibold text-primary">أسئلة استرشادية للفرد المُستخرِج:</div>
                <ol className="list-decimal pr-5 space-y-1">
                  <li>هل استخراجك <b>فردي عرضي</b> (مثلاً غسل ذهب من نهر) أم <b>مشروع تجاري قائم</b>؟ النشاط التجاري يدخل في تبويب الشركات.</li>
                  <li>هل بلغت قيمة المعدن الصافية <b>نصاب الذهب (85 جم)</b>؟ النصاب شرط عند الجمهور للزكاة (2.5%).</li>
                  <li>هل احتسبتَ <b>تكاليف الاستخراج المباشرة</b> (معدات/أجور/نقل) وخصمتَها قبل الزكاة؟</li>
                  <li>هل المعدن <b>مُسيَّل/مُنقَّى</b> أم خامٌ يحتاج معالجة؟ تُقوَّم قيمتُه السوقية بعد التنقية.</li>
                  <li>هل سدَّدتَ <b>رسوم التراخيص الحكومية</b>؟ هذه ليست بديلاً عن الزكاة شرعاً.</li>
                </ol>
              </div>

              <div>
                <Label className="mb-2 block text-xs">القول المختار</Label>
                <div className="flex flex-wrap gap-3">
                  <Badge
                    variant={mineralsOpinion === "jumhur" ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1.5"
                    onClick={() => setMineralsOpinion("jumhur")}
                  >
                    الجمهور — 2.5% (مع اشتراط النصاب)
                  </Badge>
                  <Badge
                    variant={mineralsOpinion === "hanafi" ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1.5"
                    onClick={() => setMineralsOpinion("hanafi")}
                  >
                    الحنفية — 20% (بلا اشتراط نصاب)
                  </Badge>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <NumField label="إجمالي قيمة المعدن المستخرج (بعد التنقية)" value={mineralsValue} onChange={setMineralsValue} unit={country.currency} hint="بالقيمة السوقية يوم الإخراج" />
                <NumField label="تكاليف الاستخراج والتنقية المباشرة" value={mineralsCost} onChange={setMineralsCost} unit={country.currency} hint="معدات، أجور عمالة، نقل، طاقة، تنقية" />
              </div>
              {calc.mineralsNet > 0 && (
                <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm space-y-1">
                  <div>الصافي الزكوي بعد خصم التكاليف: <b>{cur(calc.mineralsNet)}</b></div>
                  <div>الزكاة المستحقة: <b className="text-primary">{cur(calc.mineralsZakat)}</b> ({(calc.mineralsRate * 100).toFixed(1)}%)</div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
          )}

          {showHoney && (
          <AccordionItem value="honey" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <FlaskConical className="h-5 w-5 text-gold" /> ③ هل تملك إنتاج عسل؟ — العُشر (10%)
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">
                  ذهب أبو حنيفة وأحمد إلى وجوب العُشر (10%) في العسل إذا بلغ النصاب قياساً على الزروع،
                  والنصاب التقريبي <b>653 كجم</b> (ما يعادل 5 أوسق من غالب القوت).
                  وذهب الشافعي إلى أنه لا زكاة فيه. والأحوط الإخراج.
                </AlertDescription>
              </Alert>
              <div className="grid md:grid-cols-2 gap-4">
                <NumField label="كمية العسل المُنتَجة" value={honeyKg} onChange={setHoneyKg} unit="كجم" hint={`النصاب: ${HONEY_NISAB_KG} كجم`} />
                <NumField label="سعر الكيلو" value={honeyPricePerKg} onChange={setHoneyPricePerKg} unit={country.currency} />
              </div>
              {num(honeyKg) > 0 && (
                <div className={`rounded-lg p-3 text-sm border ${calc.honeyEligible ? "bg-primary/10 border-primary/30" : "bg-muted/40 border-border"}`}>
                  {calc.honeyEligible ? (
                    <>
                      <div>قيمة العسل: <b>{cur(calc.honeyValue)}</b></div>
                      <div>الزكاة المستحقة: <b className="text-primary">{cur(calc.honeyZakat)}</b> (10%)</div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">لم يبلغ النصاب ({HONEY_NISAB_KG} كجم) — لا زكاة.</span>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
          )}

          {showFish && (
          <AccordionItem value="fish" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Fish className="h-5 w-5 text-primary" /> ④ هل تملك ثروة سمكية أو مزرعة أسماك للتجارة؟
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">
                  لا زكاة في الأسماك إن كانت لغير التجارة. أما إن كانت <b>مُعدَّة للبيع</b> (مزارع تجارية أو
                  صيد تجاري) فتُعامل معاملة <b>عروض التجارة (2.5%)</b> على صافي قيمة المخزون والإيرادات
                  بعد خصم التكاليف والديون المستحقة، وذلك بعد بلوغ النصاب وحولان الحول.
                </AlertDescription>
              </Alert>
              <div className="grid md:grid-cols-2 gap-4">
                <NumField label="قيمة المخزون السمكي وإيرادات البيع" value={fishValue} onChange={setFishValue} unit={country.currency} />
                <NumField label="التكاليف والمصاريف المباشرة" value={fishCost} onChange={setFishCost} unit={country.currency} hint="أعلاف، عمالة، صيانة" />
              </div>
              {calc.fishNet > 0 && (
                <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm space-y-1">
                  <div>الصافي الزكوي: <b>{cur(calc.fishNet)}</b></div>
                  <div>الزكاة المستحقة: <b className="text-primary">{cur(calc.fishZakat)}</b> (2.5%)</div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
          )}

          {showPoultry && (
          <AccordionItem value="poultry" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Drumstick className="h-5 w-5 text-gold" /> ⑤ هل تملك مزرعة دواجن للتجارة؟
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">
                  الدواجن (دجاج، بط، إوز...) لا تدخل في نصاب الأنعام السائمة. تُزكَّى زكاة عروض التجارة (2.5%)
                  على صافي قيمة المخزون والإيرادات إذا كانت بقصد البيع. أما إن كانت للاستهلاك المنزلي فلا زكاة فيها.
                </AlertDescription>
              </Alert>
              <div className="grid md:grid-cols-2 gap-4">
                <NumField label="قيمة المخزون والإيرادات" value={poultryValue} onChange={setPoultryValue} unit={country.currency} />
                <NumField label="التكاليف والمصاريف المباشرة" value={poultryCost} onChange={setPoultryCost} unit={country.currency} />
              </div>
              {calc.poultryNet > 0 && (
                <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm space-y-1">
                  <div>الصافي الزكوي: <b>{cur(calc.poultryNet)}</b></div>
                  <div>الزكاة المستحقة: <b className="text-primary">{cur(calc.poultryZakat)}</b> (2.5%)</div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
          )}
        </Accordion>
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="bg-gradient-primary text-primary-foreground shadow-gold border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary-foreground">
              <Calculator className="h-5 w-5" /> إجمالي زكاة هذا القسم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tight">
              {fmt(
                (showRikaz ? calc.rikazZakat : 0) +
                (showMinerals ? calc.mineralsZakat : 0) +
                (showHoney ? calc.honeyZakat : 0) +
                (showFish ? calc.fishZakat : 0) +
                (showPoultry ? calc.poultryZakat : 0)
              )}
              <span className="text-lg font-medium opacity-80 mr-2">{country.currency}</span>
            </div>
            <p className="text-xs opacity-80 mt-2">
              {mode === "rikaz-metals" ? "مجموع زكاة الركاز والمعادن"
                : mode === "agri-extras" ? "مجموع زكاة العسل والثروة السمكية ومزارع الدواجن"
                : "مجموع زكاة الركاز والمعادن والثروات المستحدثة"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3"><CardTitle className="text-base">تفصيل النتيجة</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {showRikaz && <div className="flex justify-between"><span>الركاز (20%)</span><b>{cur(calc.rikazZakat)}</b></div>}
            {showMinerals && <div className="flex justify-between"><span>المعادن</span><b>{cur(calc.mineralsZakat)}</b></div>}
            {showHoney && <div className="flex justify-between"><span>العسل (10%)</span><b>{cur(calc.honeyZakat)}</b></div>}
            {showFish && <div className="flex justify-between"><span>الأسماك (2.5%)</span><b>{cur(calc.fishZakat)}</b></div>}
            {showPoultry && <div className="flex justify-between"><span>الدواجن (2.5%)</span><b>{cur(calc.poultryZakat)}</b></div>}
            <Separator className="my-2" />
            <div className="flex justify-between text-primary font-bold"><span>المجموع</span><span>{cur(
              (showRikaz ? calc.rikazZakat : 0) +
              (showMinerals ? calc.mineralsZakat : 0) +
              (showHoney ? calc.honeyZakat : 0) +
              (showFish ? calc.fishZakat : 0) +
              (showPoultry ? calc.poultryZakat : 0)
            )}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
