import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wheat, Users, Info, Calculator, CheckCircle2 } from "lucide-react";
import { num, fmt, currency, COUNTRY_PRICES } from "@/lib/zakat";

/**
 * زكاة الفطر
 * المرجع الشرعي:
 * - الحديث: «فرض رسول الله ﷺ زكاة الفطر صاعاً من تمرٍ أو صاعاً من شعير...» (متفق عليه).
 * - الصاع النبوي ≈ 2.176 كجم من القمح، ويُجزئ التقدير العملي بـ 2.5 كجم (احتياطاً) من غالب قوت البلد.
 * - تجزئ القيمة بالنقد عند جمهور الأحناف وفتوى دار الإفتاء المصرية ومجمع الفقه الإسلامي
 *   إذا تحقق الانتفاع للفقير ولم يفُت موعد الأداء (قبل صلاة العيد).
 */

interface Staple {
  key: string;
  name: string;
  saa_kg: number; // وزن الصاع من هذا الصنف بالكيلوجرام
  defaultPricePerKg: Record<string, number>; // سعر إرشادي للكيلو حسب الدولة
}

const STAPLES: Staple[] = [
  {
    key: "wheat",
    name: "قمح / دقيق",
    saa_kg: 2.176,
    defaultPricePerKg: {
      EG: 22,
      SA: 5,
      AE: 5,
      KW: 0.5,
      QA: 5,
      JO: 1,
      MA: 12,
      US: 1.2,
      EU: 1.1,
      GB: 0.95,
    },
  },
  {
    key: "rice",
    name: "أرز",
    saa_kg: 2.4,
    defaultPricePerKg: {
      EG: 38,
      SA: 8,
      AE: 8,
      KW: 0.85,
      QA: 8,
      JO: 1.6,
      MA: 18,
      US: 2,
      EU: 1.8,
      GB: 1.6,
    },
  },
  {
    key: "dates",
    name: "تمر",
    saa_kg: 2.5,
    defaultPricePerKg: {
      EG: 120,
      SA: 25,
      AE: 25,
      KW: 2.5,
      QA: 25,
      JO: 6,
      MA: 60,
      US: 8,
      EU: 7,
      GB: 6,
    },
  },
  {
    key: "barley",
    name: "شعير",
    saa_kg: 2.0,
    defaultPricePerKg: {
      EG: 18,
      SA: 4,
      AE: 4,
      KW: 0.4,
      QA: 4,
      JO: 0.8,
      MA: 10,
      US: 1,
      EU: 0.9,
      GB: 0.8,
    },
  },
  {
    key: "raisins",
    name: "زبيب",
    saa_kg: 2.3,
    defaultPricePerKg: {
      EG: 200,
      SA: 35,
      AE: 35,
      KW: 3.5,
      QA: 35,
      JO: 7,
      MA: 80,
      US: 10,
      EU: 9,
      GB: 8,
    },
  },
];

export function FitrCalculator() {
  const [countryCode, setCountryCode] = useState("EG");
  const country = COUNTRY_PRICES.find((c) => c.code === countryCode) ?? COUNTRY_PRICES[0];
  const [staple, setStaple] = useState<string>("wheat");
  const [familyCount, setFamilyCount] = useState("1");
  const [payMode, setPayMode] = useState<"food" | "cash">("cash");
  const [customPrice, setCustomPrice] = useState("");

  const selectedStaple = STAPLES.find((s) => s.key === staple) ?? STAPLES[0];

  const pricePerKg = useMemo(() => {
    if (num(customPrice) > 0) return num(customPrice);
    return selectedStaple.defaultPricePerKg[countryCode] ?? selectedStaple.defaultPricePerKg.EG;
  }, [customPrice, selectedStaple, countryCode]);

  const calc = useMemo(() => {
    const persons = Math.max(0, Math.floor(num(familyCount)));
    const saaPerPerson = selectedStaple.saa_kg;
    const totalKg = persons * saaPerPerson;
    const totalCash = totalKg * pricePerKg;
    return { persons, saaPerPerson, totalKg, totalCash };
  }, [familyCount, selectedStaple, pricePerKg]);

  const cur = (n: number) => currency(n, country.currency);

  return (
    <div dir="rtl" className="grid lg:grid-cols-3 gap-6 text-right">
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wheat className="h-5 w-5 text-primary" /> بيانات زكاة الفطر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Alert className="border-primary/30 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs leading-relaxed">
                <b>تجب على كل مسلم</b> (صغير وكبير، ذكر وأنثى، حر وعبد) ممن يملك قوت يومه وليلة
                العيد فاضلاً عن حاجته. ويُخرجها رب الأسرة عن نفسه وعن من تلزمه نفقتهم.{" "}
                <b>المقدار:</b> صاع نبوي ≈ 2.5 كجم احتياطاً من غالب قوت البلد، أو ما يعادله نقداً
                عند جمهور الأحناف ودار الإفتاء المصرية.
                <b>وقت الإخراج:</b> من غروب شمس آخر رمضان إلى ما قبل صلاة العيد، ويجوز تعجيلها يوماً
                أو يومين.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">الدولة</Label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRY_PRICES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name} ({c.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> عدد أفراد الأسرة
                </Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={familyCount}
                  onChange={(e) => setFamilyCount(e.target.value)}
                  dir="ltr"
                  style={{ textAlign: "right" }}
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">
                  جميع من تجب عليك نفقتهم (الزوجة، الأولاد، الوالدان عند العجز).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">غالب قوت البلد</Label>
                <Select value={staple} onValueChange={setStaple}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAPLES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.name} — صاع ≈ {s.saa_kg} كجم
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">سعر الكيلو (يمكن تعديله)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder={String(pricePerKg)}
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
                <p className="text-xs text-muted-foreground">
                  السعر المرجعي: <b>{cur(pricePerKg)}</b> للكيلو في {country.name}.
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="mb-2 block text-sm font-semibold">طريقة الإخراج</Label>
              <RadioGroup
                value={payMode}
                onValueChange={(v) => setPayMode(v as "food" | "cash")}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                  <RadioGroupItem value="food" id="pm-food" />
                  <Label htmlFor="pm-food" className="text-sm cursor-pointer">
                    طعاماً (الأصل عند الجمهور)
                  </Label>
                </div>
                <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                  <RadioGroupItem value="cash" id="pm-cash" />
                  <Label htmlFor="pm-cash" className="text-sm cursor-pointer">
                    قيمةً نقداً (الأحناف ودار الإفتاء)
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {payMode === "food"
                  ? "إخراج عين الطعام أحوط لتحقيق ما ورد في النص الشرعي، وأقرب لظاهر السنة."
                  : "الإخراج نقداً أرفق بالفقير في عصرنا لتنوع حاجاته، وقد أفتى به جمع من المحققين."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">ضوابط شرعية مهمة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex gap-2">
              <Badge variant="secondary" className="shrink-0">
                1
              </Badge>
              <span>
                تجب بغروب شمس آخر يوم من رمضان ولا تسقط بفوات الوقت بل تبقى ديناً في الذمة.
              </span>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="shrink-0">
                2
              </Badge>
              <span>
                تُصرف لفقراء المسلمين فقط (لا تُصرف لباقي مصارف الزكاة الثمانية على الراجح).
              </span>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="shrink-0">
                3
              </Badge>
              <span>يستحب إخراجها في بلد المُزكِّي، ويجوز نقلها إلى بلد آخر للحاجة.</span>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="shrink-0">
                4
              </Badge>
              <span>يجوز تعجيلها من أول رمضان عند الجمهور، والأفضل قبل صلاة العيد بساعات.</span>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="shrink-0">
                5
              </Badge>
              <span>
                تجب على الجنين عند ابن حنبل استحباباً، وعلى من وُلد قبل غروب آخر يوم من رمضان
                اتفاقاً.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="bg-gradient-primary text-primary-foreground shadow-gold border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary-foreground">
              <Calculator className="h-5 w-5" /> إجمالي زكاة الفطر
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payMode === "cash" ? (
              <>
                <div className="text-4xl font-black tracking-tight">
                  {fmt(calc.totalCash)}
                  <span className="text-lg font-medium opacity-80 mr-2">{country.currency}</span>
                </div>
                <p className="text-xs opacity-80 mt-2">
                  ما يعادل <b>{fmt(calc.totalKg)} كجم</b> من {selectedStaple.name}
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl font-black tracking-tight">
                  {fmt(calc.totalKg)}
                  <span className="text-lg font-medium opacity-80 mr-2">كجم</span>
                </div>
                <p className="text-xs opacity-80 mt-2">
                  من {selectedStaple.name} (ما يعادل <b>{cur(calc.totalCash)}</b> نقداً)
                </p>
              </>
            )}
            <p className="text-xs opacity-80 mt-2">
              عن <b>{calc.persons}</b> {calc.persons === 1 ? "فرد" : "أفراد"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">تفصيل النتيجة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>عدد الأفراد</span>
              <b>{calc.persons}</b>
            </div>
            <div className="flex justify-between">
              <span>صاع للفرد</span>
              <b>{fmt(calc.saaPerPerson)} كجم</b>
            </div>
            <div className="flex justify-between">
              <span>إجمالي الوزن</span>
              <b>{fmt(calc.totalKg)} كجم</b>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span>سعر الكيلو</span>
              <b>{cur(pricePerKg)}</b>
            </div>
            <div className="flex justify-between text-primary font-bold">
              <span>القيمة النقدية</span>
              <span>{cur(calc.totalCash)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-soft">
          <CardContent className="pt-6">
            <Alert className="border-gold/30 bg-gold/5">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-xs">
                تقبّل الله منا ومنكم صالح الأعمال، وكل عام وأنتم بخير.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
