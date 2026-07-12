/**
 * قسم زكاة الذهب والفضة — استُخرج من IndividualTab.tsx كنموذج للتقسيم.
 *
 * كل الحالة (state) ما زالت في المكوّن الأب (IndividualTab) وتُمرَّر عبر props،
 * حفاظاً على السلوك الحالي بدون أي حذف أو تغيير في المنطق. الهدف الوحيد:
 * تقليل حجم الملف الأب وتوفير قالب واضح لبقية الأقسام (نقد، أوراق مالية…).
 */

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Coins, Info } from "lucide-react";
import HijriDateField from "../HijriDateField";
import { NumField } from "./shared";
import { GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS, num, fmt } from "@/lib/zakat";

type Setter<T> = (v: T) => void;
type Purpose = "storage" | "wear";
type Opinion = "hanafi" | "majority";

export interface GoldSilverCalc {
  sabaikGrams24: number;
  coinsGrams24: number;
  jewelryGrams24: number;
  jewelryGrams24Raw: number;
  otherGrams24: number;
  totalGold24: number;
  totalGoldValue: number;
  goldNisabValue: number;
  goldEligible: boolean;
  goldZakat: number;
  svSabaikG999: number;
  svCoinsG999: number;
  svJewelryG999: number;
  silverGrams: number;
  silverValue: number;
  silverNisabValue: number;
  silverEligible: boolean;
  silverZakat: number;
  moneyNisab: number;
}

export interface GoldSilverSectionProps {
  // ==== ذهب: سبائك ====
  sb24: string; setSb24: Setter<string>;
  sb22: string; setSb22: Setter<string>;
  sb21: string; setSb21: Setter<string>;
  sb18: string; setSb18: Setter<string>;
  sb14: string; setSb14: Setter<string>;
  sb9: string; setSb9: Setter<string>;
  ounces: string; setOunces: Setter<string>;
  sbHalal: boolean; setSbHalal: Setter<boolean>;
  sbFullyOwned: boolean; setSbFullyOwned: Setter<boolean>;
  sbAcquireDate: string; setSbAcquireDate: Setter<string>;

  // ==== ذهب: جنيهات وعملات ====
  coinFull: string; setCoinFull: Setter<string>;
  coinHalf: string; setCoinHalf: Setter<string>;
  coinQuarter: string; setCoinQuarter: Setter<string>;
  coinCustomKarat: string; setCoinCustomKarat: Setter<string>;
  coinCustomWeight: string; setCoinCustomWeight: Setter<string>;
  coinCustomQty: string; setCoinCustomQty: Setter<string>;
  coinHalal: boolean; setCoinHalal: Setter<boolean>;
  coinFullyOwned: boolean; setCoinFullyOwned: Setter<boolean>;
  coinAcquireDate: string; setCoinAcquireDate: Setter<string>;
  coinPurpose: Purpose; setCoinPurpose: Setter<Purpose>;

  // ==== ذهب: مجوهرات ====
  jw24: string; setJw24: Setter<string>;
  jw22: string; setJw22: Setter<string>;
  jw21: string; setJw21: Setter<string>;
  jw18: string; setJw18: Setter<string>;
  jw14: string; setJw14: Setter<string>;
  jw12: string; setJw12: Setter<string>;
  jw9: string; setJw9: Setter<string>;
  jwStoneGrams: string; setJwStoneGrams: Setter<string>;
  jewelryPurpose: Purpose; setJewelryPurpose: Setter<Purpose>;
  jwAcquireDate: string; setJwAcquireDate: Setter<string>;
  jewelryOpinion: Opinion; setJewelryOpinion: Setter<Opinion>;
  jwHaal: boolean; setJwHaal: Setter<boolean>;
  jwModeration: boolean; setJwModeration: Setter<boolean>;
  jwPermissible: boolean; setJwPermissible: Setter<boolean>;

  // ==== ذهب: مشغولات أخرى ====
  brk24: string; setBrk24: Setter<string>;
  brk21: string; setBrk21: Setter<string>;
  brk18: string; setBrk18: Setter<string>;
  brkOtherKarat: string; setBrkOtherKarat: Setter<string>;
  brkOtherWeight: string; setBrkOtherWeight: Setter<string>;
  brkStoneGrams: string; setBrkStoneGrams: Setter<string>;
  storageKarat: string; setStorageKarat: Setter<string>;
  storageWeight: string; setStorageWeight: Setter<string>;
  brkAcquireDate: string; setBrkAcquireDate: Setter<string>;

  // ==== فضة: سبائك ====
  sv999: string; setSv999: Setter<string>;
  sv960: string; setSv960: Setter<string>;
  sv925: string; setSv925: Setter<string>;
  sv900: string; setSv900: Setter<string>;
  sv835: string; setSv835: Setter<string>;
  sv800: string; setSv800: Setter<string>;
  sv750: string; setSv750: Setter<string>;
  svOunces: string; setSvOunces: Setter<string>;
  svAcquireDate: string; setSvAcquireDate: Setter<string>;

  // ==== فضة: عملات ====
  coinLira: string; setCoinLira: Setter<string>;
  coinRiyal: string; setCoinRiyal: Setter<string>;
  coinSvOtherKarat: string; setCoinSvOtherKarat: Setter<string>;
  coinSvOther: string; setCoinSvOther: Setter<string>;
  svCoinAcquireDate: string; setSvCoinAcquireDate: Setter<string>;

  // ==== فضة: مجوهرات ومشغولات ====
  svJewelry: string; setSvJewelry: Setter<string>;
  svJewelryKarat: string; setSvJewelryKarat: Setter<string>;
  svUtensils: string; setSvUtensils: Setter<string>;
  svUtensilsKarat: string; setSvUtensilsKarat: Setter<string>;
  svTools: string; setSvTools: Setter<string>;
  svToolsKarat: string; setSvToolsKarat: Setter<string>;
  silverPurpose: Purpose; setSilverPurpose: Setter<Purpose>;
  svJewelryAcquireDate: string; setSvJewelryAcquireDate: Setter<string>;
  silverOpinion: Opinion; setSilverOpinion: Setter<Opinion>;

  // ==== أسعار مرجعية ====
  goldPrice: string; setGoldPrice: Setter<string>;
  silverPrice: string; setSilverPrice: Setter<string>;

  // ==== مشترك ====
  calc: GoldSilverCalc;
  effectiveRate: number;
  currencyName: string;
  countryName: string;
  cur: (n: number) => string;
}

export function GoldSilverSection(props: GoldSilverSectionProps) {
  const {
    sb24, setSb24, sb22, setSb22, sb21, setSb21, sb18, setSb18,
    sb14, setSb14, sb9, setSb9, ounces, setOunces,
    sbHalal, setSbHalal, sbFullyOwned, setSbFullyOwned, sbAcquireDate, setSbAcquireDate,
    coinFull, setCoinFull, coinHalf, setCoinHalf, coinQuarter, setCoinQuarter,
    coinCustomKarat, setCoinCustomKarat, coinCustomWeight, setCoinCustomWeight,
    coinCustomQty, setCoinCustomQty,
    coinHalal, setCoinHalal, coinFullyOwned, setCoinFullyOwned,
    coinAcquireDate, setCoinAcquireDate, coinPurpose, setCoinPurpose,
    jw24, setJw24, jw22, setJw22, jw21, setJw21, jw18, setJw18,
    jw14, setJw14, jw12, setJw12, jw9, setJw9,
    jwStoneGrams, setJwStoneGrams, jewelryPurpose, setJewelryPurpose,
    jwAcquireDate, setJwAcquireDate, jewelryOpinion, setJewelryOpinion,
    jwHaal, setJwHaal, jwModeration, setJwModeration, jwPermissible, setJwPermissible,
    brk24, setBrk24, brk21, setBrk21, brk18, setBrk18,
    brkOtherKarat, setBrkOtherKarat, brkOtherWeight, setBrkOtherWeight,
    brkStoneGrams, setBrkStoneGrams, storageKarat, setStorageKarat,
    storageWeight, setStorageWeight, brkAcquireDate, setBrkAcquireDate,
    sv999, setSv999, sv960, setSv960, sv925, setSv925, sv900, setSv900,
    sv835, setSv835, sv800, setSv800, sv750, setSv750, svOunces, setSvOunces,
    svAcquireDate, setSvAcquireDate,
    coinLira, setCoinLira, coinRiyal, setCoinRiyal,
    coinSvOtherKarat, setCoinSvOtherKarat, coinSvOther, setCoinSvOther,
    svCoinAcquireDate, setSvCoinAcquireDate,
    svJewelry, setSvJewelry, svJewelryKarat, setSvJewelryKarat,
    svUtensils, setSvUtensils, svUtensilsKarat, setSvUtensilsKarat,
    svTools, setSvTools, svToolsKarat, setSvToolsKarat,
    silverPurpose, setSilverPurpose, svJewelryAcquireDate, setSvJewelryAcquireDate,
    silverOpinion, setSilverOpinion,
    goldPrice, setGoldPrice, silverPrice, setSilverPrice,
    calc, effectiveRate, currencyName, countryName, cur,
  } = props;

  return (
    <>
      <AccordionItem
        id="section-gold"
        value="gold"
        className="border rounded-xl shadow-soft bg-card px-4"
      >
        <AccordionTrigger className="hover:no-underline">
          <span className="flex items-center gap-2 text-base font-semibold">
            <Coins className="h-5 w-5 text-gold" /> زكاة الذهب
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-6 pb-4">
          {/* أ) السبائك والأونصات */}
          <div className="space-y-3 rounded-lg border border-gold/20 bg-gold/5 p-4">
            <div className="text-sm font-semibold text-primary">
              أ · السبائك والأونصات الذهبية
            </div>
            <p className="text-xs text-muted-foreground">
              أدخل الأوزان بالجرام فقط — السعر يُؤخذ للحساب أسفل هذا القسم
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumField label="سبائك 24" value={sb24} onChange={setSb24} unit="جم" />
              <NumField label="سبائك 22" value={sb22} onChange={setSb22} unit="جم" />
              <NumField label="سبائك 21" value={sb21} onChange={setSb21} unit="جم" />
              <NumField label="سبائك 18" value={sb18} onChange={setSb18} unit="جم" />
              <NumField label="سبائك 14" value={sb14} onChange={setSb14} unit="جم" />
              <NumField label="سبائك 9" value={sb9} onChange={setSb9} unit="جم" />
              <NumField
                label="أونصات"
                value={ounces}
                onChange={setOunces}
                unit="أوقية"
                hint="1 أونصة = 31.1 جم"
              />
              <div className="rounded-md border bg-background p-3 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground">
                  الوزن المكافئ بعيار 24
                </span>
                <span className="text-lg font-bold text-primary">
                  {fmt(calc.sabaikGrams24)} جم
                </span>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3 pt-2 border-t">
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label className="text-xs">من كسب حلال</Label>
                <Switch checked={sbHalal} onCheckedChange={setSbHalal} />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label className="text-xs">مملوكة ملكاً تاماً</Label>
                <Switch checked={sbFullyOwned} onCheckedChange={setSbFullyOwned} />
              </div>
              <HijriDateField
                compact
                label="تاريخ الاقتناء"
                value={sbAcquireDate}
                onChange={setSbAcquireDate}
              />
            </div>
          </div>

          {/* ب) الجنيهات والعملات الذهبية */}
          <div className="space-y-3 rounded-lg border border-gold/20 bg-gold/5 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm font-semibold text-primary">
                ب · الجنيهات والعملات الذهبية
              </div>
              <Badge variant="secondary" className="text-[10px]">
                الجنيه الكامل ≈ 8.5 جم عيار 21
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumField label="جنيه كامل" value={coinFull} onChange={setCoinFull} unit="قطعة" />
              <NumField label="نصف جنيه" value={coinHalf} onChange={setCoinHalf} unit="قطعة" />
              <NumField label="ربع جنيه" value={coinQuarter} onChange={setCoinQuarter} unit="قطعة" />
              <div className="rounded-md border bg-background p-3 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground">الوزن المكافئ بعيار 24</span>
                <span className="text-lg font-bold text-primary">
                  {fmt(calc.coinsGrams24)} جم
                </span>
              </div>
            </div>
            <div className="rounded-md border border-dashed p-3 space-y-2">
              <div className="text-xs text-muted-foreground">
                عملة ذهبية أو قطعة بعيار / وزن مختلف (اختياري)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">العيار</Label>
                  <Select value={coinCustomKarat} onValueChange={setCoinCustomKarat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["9", "12", "14", "18", "21", "22", "24"].map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <NumField
                  label="الوزن لكل قطعة (جم)"
                  value={coinCustomWeight}
                  onChange={setCoinCustomWeight}
                  unit="جم"
                />
                <NumField
                  label="عدد القطع"
                  value={coinCustomQty}
                  onChange={setCoinCustomQty}
                  unit="قطعة"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3 pt-2 border-t">
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label className="text-xs">من كسب حلال</Label>
                <Switch checked={coinHalal} onCheckedChange={setCoinHalal} />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label className="text-xs">مملوكة ملكاً تاماً</Label>
                <Switch checked={coinFullyOwned} onCheckedChange={setCoinFullyOwned} />
              </div>
              <HijriDateField
                compact
                label="تاريخ الاقتناء"
                value={coinAcquireDate}
                onChange={setCoinAcquireDate}
              />
              <div className="space-y-1.5">
                <Label className="text-xs">غرض الاقتناء</Label>
                <RadioGroup
                  value={coinPurpose}
                  onValueChange={(v) => setCoinPurpose(v as Purpose)}
                  className="flex gap-4 pt-1"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="wear" id="cp-w" />
                    <Label htmlFor="cp-w" className="text-sm">حلي وزينة</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="storage" id="cp-s" />
                    <Label htmlFor="cp-s" className="text-sm">ادخار وحفظ قيمة</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* ج) المجوهرات */}
          <div className="space-y-3 rounded-lg border border-gold/20 bg-gold/5 p-4">
            <div className="text-sm font-semibold text-primary">
              ج · المجوهرات الذهبية
            </div>
            <p className="text-xs text-muted-foreground">
              الخواتم · الدبل · السلاسل · الأساور · الحلقان · الأنسيالات · الكوليهات ·
              التيجان
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumField label="عيار 24" value={jw24} onChange={setJw24} unit="جم" />
              <NumField label="عيار 22" value={jw22} onChange={setJw22} unit="جم" />
              <NumField label="عيار 21" value={jw21} onChange={setJw21} unit="جم" />
              <NumField label="عيار 18" value={jw18} onChange={setJw18} unit="جم" />
              <NumField label="عيار 14" value={jw14} onChange={setJw14} unit="جم" />
              <NumField label="عيار 12" value={jw12} onChange={setJw12} unit="جم" />
              <NumField label="عيار 9" value={jw9} onChange={setJw9} unit="جم" />
              <div className="rounded-md border bg-background p-3 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground">المكافئ بعيار 24</span>
                <span className="text-lg font-bold text-primary">
                  {fmt(calc.jewelryGrams24Raw)} جم
                </span>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3 pt-2">
              <NumField
                label="وزن الأحجار الكريمة المُدمجة (للاستبعاد)"
                value={jwStoneGrams}
                onChange={setJwStoneGrams}
                unit="جم"
                hint="الألماس · الياقوت · الزمرد · اللؤلؤ — لا زكاة فيها لذاتها"
              />
              <div className="rounded-md border bg-primary/5 border-primary/20 p-3 text-[11px] leading-relaxed">
                <b className="text-primary">المصنعية مستبعَدة تلقائياً</b> — لأن الحساب
                يتم بوزن الذهب الصافي × سعر الجرام، فلا تدخل أجرة الصياغة في الوعاء.
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm">غرض الاقتناء</Label>
                <RadioGroup
                  value={jewelryPurpose}
                  onValueChange={(v) => setJewelryPurpose(v as Purpose)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="wear" id="jp-w" />
                    <Label htmlFor="jp-w" className="text-sm">حلي وزينة</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="storage" id="jp-s" />
                    <Label htmlFor="jp-s" className="text-sm">ادخار وحفظ قيمة</Label>
                  </div>
                </RadioGroup>
              </div>
              <HijriDateField
                compact
                label="تاريخ الاقتناء"
                value={jwAcquireDate}
                onChange={setJwAcquireDate}
              />
              {jewelryPurpose === "wear" && (
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm">
                      إخضاع حلي الزينة للزكاة (رأي الحنفية)
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      إيقافه = رأي الجمهور (لا زكاة على المستعمل بشروطه)
                    </p>
                  </div>
                  <Switch
                    checked={jewelryOpinion === "hanafi"}
                    onCheckedChange={(v) => setJewelryOpinion(v ? "hanafi" : "majority")}
                  />
                </div>
              )}
            </div>
            {jewelryPurpose === "wear" && jewelryOpinion === "majority" && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div className="text-xs font-semibold text-primary">
                  شروط إعفاء حلي الزينة (رأي الجمهور)
                </div>
                <div className="grid sm:grid-cols-3 gap-2">
                  <div className="flex items-center justify-between rounded-md border bg-background px-2.5 py-1.5">
                    <Label htmlFor="jw-haal" className="text-[11px]">
                      حال غير مؤجل (مستعمل فعلاً)
                    </Label>
                    <Switch id="jw-haal" checked={jwHaal} onCheckedChange={setJwHaal} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-background px-2.5 py-1.5">
                    <Label htmlFor="jw-mod" className="text-[11px]">
                      في حدود القصد والاعتدال
                    </Label>
                    <Switch
                      id="jw-mod"
                      checked={jwModeration}
                      onCheckedChange={setJwModeration}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-background px-2.5 py-1.5">
                    <Label htmlFor="jw-perm" className="text-[11px]">
                      استعمال مباح (لا تبرّج محرّم)
                    </Label>
                    <Switch
                      id="jw-perm"
                      checked={jwPermissible}
                      onCheckedChange={setJwPermissible}
                    />
                  </div>
                </div>
                {!(jwHaal && jwModeration && jwPermissible) && (
                  <p className="text-[11px] text-destructive leading-relaxed">
                    ⚠ لاختلال أحد الشروط الثلاثة يخضع الحلي للزكاة احتياطاً حتى على رأي
                    الجمهور.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* د) المشغولات الذهبية الأخرى */}
          <div className="space-y-3 rounded-lg border border-gold/20 bg-gold/5 p-4">
            <div className="text-sm font-semibold text-primary">
              د · المشغولات الذهبية الأخرى
            </div>
            <p className="text-xs text-muted-foreground">
              ذهب مستعمل وكسر (للتهشيم — قِدَم الطراز — مكسور) + ذهب ادخاري غير قابل للبس
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumField label="عيار 24" value={brk24} onChange={setBrk24} unit="جم" />
              <NumField label="عيار 21" value={brk21} onChange={setBrk21} unit="جم" />
              <NumField label="عيار 18" value={brk18} onChange={setBrk18} unit="جم" />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm">عيار آخر</Label>
                  <Select value={brkOtherKarat} onValueChange={setBrkOtherKarat}>
                    <SelectTrigger className="h-7 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["9", "12", "14", "22"].map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={brkOtherWeight}
                    onChange={(e) => setBrkOtherWeight(e.target.value)}
                    placeholder="0"
                    dir="ltr"
                    style={{ textAlign: "right" }}
                    className="pl-10"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    جم
                  </span>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <NumField
                label="وزن الأحجار الكريمة في المشغولات (للاستبعاد)"
                value={brkStoneGrams}
                onChange={setBrkStoneGrams}
                unit="جم"
              />
              <div className="rounded-md border bg-primary/5 border-primary/20 p-3 text-[11px] leading-relaxed flex items-center">
                <span>
                  <b className="text-primary">المصنعية مستبعَدة تلقائياً</b> — الحساب بوزن
                  الذهب الصافي فقط.
                </span>
              </div>
            </div>
            <div className="rounded-md border border-dashed p-3 space-y-2">
              <div className="text-xs text-muted-foreground">
                ذهب ادخاري غير قابل للبس (ميداليات · جُعَل · ألواح · قطع تذكارية)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">العيار</Label>
                  <Select value={storageKarat} onValueChange={setStorageKarat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["9", "12", "14", "18", "21", "22", "24"].map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <NumField
                  label="الوزن (جرام)"
                  value={storageWeight}
                  onChange={setStorageWeight}
                  unit="جم"
                />
                <div className="rounded-md border bg-background p-3 flex flex-col justify-center">
                  <span className="text-xs text-muted-foreground">المكافئ بعيار 24</span>
                  <span className="text-lg font-bold text-primary">
                    {fmt(calc.otherGrams24)} جم
                  </span>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3 pt-2 border-t">
              <HijriDateField
                compact
                label="تاريخ الاقتناء"
                value={brkAcquireDate}
                onChange={setBrkAcquireDate}
              />
            </div>
          </div>

          {/* الإجمالي وربط السعر */}
          <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-l from-primary/10 to-gold/10 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm font-bold text-primary">
                إجمالي الوعاء الزكوي من الذهب
              </div>
              {calc.goldEligible ? (
                <Badge className="bg-primary">بلغ النصاب</Badge>
              ) : (
                <Badge variant="secondary">دون النصاب ({GOLD_NISAB_GRAMS} جم)</Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-md bg-background border p-3">
                <div className="text-xs text-muted-foreground">سبائك وأونصات</div>
                <div className="font-bold">{fmt(calc.sabaikGrams24)} جم</div>
              </div>
              <div className="rounded-md bg-background border p-3">
                <div className="text-xs text-muted-foreground">جنيهات وعملات</div>
                <div className="font-bold">{fmt(calc.coinsGrams24)} جم</div>
              </div>
              <div className="rounded-md bg-background border p-3">
                <div className="text-xs text-muted-foreground">مجوهرات (خاضعة)</div>
                <div className="font-bold">{fmt(calc.jewelryGrams24)} جم</div>
              </div>
              <div className="rounded-md bg-background border p-3">
                <div className="text-xs text-muted-foreground">مشغولات أخرى</div>
                <div className="font-bold">{fmt(calc.otherGrams24)} جم</div>
              </div>
            </div>
            <Separator />
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">إجمالي الوزن بعيار 24</div>
                <div className="text-xl font-extrabold text-gold">
                  {fmt(calc.totalGold24)} جم
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  × سعر جرام عيار 24 اليوم
                </div>
                <div className="text-xl font-extrabold">{cur(num(goldPrice))}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">قيمة الوعاء الذهبي</div>
                <div className="text-xl font-extrabold text-primary">
                  {cur(calc.totalGoldValue)}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              تمت معادلة جميع الأعيرة (9 · 12 · 14 · 18 · 21 · 22) إلى عيار 24 بمعامل
              (العيار ÷ 24)، ثم ضُربت في سعر اليوم لجرام عيار 24.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* زكاة الفضة */}
      <AccordionItem
        id="section-silver"
        value="silver"
        className="border rounded-xl shadow-soft bg-card px-4"
      >
        <AccordionTrigger className="hover:no-underline">
          <span className="flex items-center gap-2 text-base font-semibold">
            <Coins className="h-5 w-5 text-muted-foreground" /> زكاة الفضة
            <Badge variant="secondary" className="text-[10px] mr-2">
              النصاب: {SILVER_NISAB_GRAMS} جم عيار 999
            </Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-6 pb-4">
          {/* أ) السبائك والأونصات الفضية */}
          <div className="space-y-3 rounded-lg border border-muted-foreground/20 bg-muted/30 p-4">
            <div className="text-sm font-semibold text-primary">
              أ · السبائك والأونصات الفضية
            </div>
            <p className="text-xs text-muted-foreground">
              أدخل الأوزان بالجرام — السعر يُؤخذ للحساب أسفل القسم
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumField label="عيار 999 (خالصة)" value={sv999} onChange={setSv999} unit="جم" />
              <NumField label="عيار 960" value={sv960} onChange={setSv960} unit="جم" />
              <NumField label="عيار 925 (استرلينج)" value={sv925} onChange={setSv925} unit="جم" />
              <NumField label="عيار 900" value={sv900} onChange={setSv900} unit="جم" />
              <NumField label="عيار 835" value={sv835} onChange={setSv835} unit="جم" />
              <NumField label="عيار 800" value={sv800} onChange={setSv800} unit="جم" />
              <NumField label="عيار 750" value={sv750} onChange={setSv750} unit="جم" />
              <NumField
                label="أونصات"
                value={svOunces}
                onChange={setSvOunces}
                unit="أوقية"
                hint="1 أونصة = 31.1 جم"
              />
            </div>
            <div className="rounded-md border bg-background p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                إجمالي وزن الفضة المكافئ بعيار 999 (جميع الأعيرة + الأونصات)
              </span>
              <span className="text-lg font-bold text-gold">
                {fmt(calc.svSabaikG999)} جم عيار 999
              </span>
            </div>
            <HijriDateField
              compact
              label="تاريخ الاقتناء"
              value={svAcquireDate}
              onChange={setSvAcquireDate}
            />
          </div>

          {/* ب) الجنيهات والعملات الفضية */}
          <div className="space-y-3 rounded-lg border border-muted-foreground/20 bg-muted/30 p-4">
            <div className="text-sm font-semibold text-primary">
              ب · الجنيهات والعملات الفضية
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <NumField
                label="ليرة عثمانية فضة"
                value={coinLira}
                onChange={setCoinLira}
                unit="قطعة"
                hint="≈ 12 جم عيار 830"
              />
              <NumField
                label="ريال فضة / مسكوكات (الوزن الكلي)"
                value={coinRiyal}
                onChange={setCoinRiyal}
                unit="جم"
                hint="افتراض عيار 900"
              />
            </div>
            <div className="rounded-md border border-dashed p-3 space-y-2">
              <div className="text-xs text-muted-foreground">
                عملات فضية أخرى — العيار والوزن الكلي
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">العيار</Label>
                  <Select value={coinSvOtherKarat} onValueChange={setCoinSvOtherKarat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["999", "960", "925", "900", "835", "800", "750"].map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <NumField
                  label="الوزن الكلي (جم)"
                  value={coinSvOther}
                  onChange={setCoinSvOther}
                  unit="جم"
                />
                <div className="rounded-md border bg-background p-3 flex flex-col justify-center">
                  <span className="text-xs text-muted-foreground">
                    إجمالي العملات بعيار 999
                  </span>
                  <span className="text-lg font-bold text-gold">
                    {fmt(calc.svCoinsG999)} جم
                  </span>
                </div>
              </div>
              <HijriDateField
                compact
                label="تاريخ الاقتناء"
                value={svCoinAcquireDate}
                onChange={setSvCoinAcquireDate}
              />
            </div>
          </div>

          {/* ج) المجوهرات والمشغولات */}
          <div className="space-y-3 rounded-lg border border-muted-foreground/20 bg-muted/30 p-4">
            <div className="text-sm font-semibold text-primary">
              ج · مجوهرات ومشغولات فضية
            </div>
            <Alert className="border-muted-foreground/30 bg-background">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs leading-relaxed">
                <b>متى تجب الزكاة على الحُلي الفضي؟</b> الجمهور: لا زكاة على الحلي
                المستعمل المباح. الحنفية: تجب إذا بلغ النصاب. أمّا المعدّ للادخار وحفظ
                القيمة فتجب فيه الزكاة باتفاق.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <NumField
                  label="وزن المجوهرات (خواتم · أساور · سلاسل · أقراط · دلايات · خلاخل)"
                  value={svJewelry}
                  onChange={setSvJewelry}
                  unit="جم"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">العيار</Label>
                <Select value={svJewelryKarat} onValueChange={setSvJewelryKarat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["999", "925", "900", "835", "800", "750"].map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <NumField
                  label="وزن المشغولات (ملاعق · صواني · فناجين · سبح)"
                  value={svUtensils}
                  onChange={setSvUtensils}
                  unit="جم"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">العيار</Label>
                <Select value={svUtensilsKarat} onValueChange={setSvUtensilsKarat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["999", "925", "900", "835", "800", "750"].map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <NumField
                  label="وزن الأدوات والتحف"
                  value={svTools}
                  onChange={setSvTools}
                  unit="جم"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">العيار</Label>
                <Select value={svToolsKarat} onValueChange={setSvToolsKarat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["999", "925", "900", "835", "800", "750"].map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm">غرض الاقتناء</Label>
                <RadioGroup
                  value={silverPurpose}
                  onValueChange={(v) => setSilverPurpose(v as Purpose)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="wear" id="sp-w" />
                    <Label htmlFor="sp-w" className="text-sm">حلي وزينة</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="storage" id="sp-s" />
                    <Label htmlFor="sp-s" className="text-sm">ادخار وحفظ قيمة</Label>
                  </div>
                </RadioGroup>
              </div>
              <HijriDateField
                compact
                label="تاريخ الاقتناء"
                value={svJewelryAcquireDate}
                onChange={setSvJewelryAcquireDate}
              />
              {silverPurpose === "wear" && (
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm">
                      إخضاع حلي الزينة للزكاة (رأي الحنفية)
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      إيقافه = رأي الجمهور
                    </p>
                  </div>
                  <Switch
                    checked={silverOpinion === "hanafi"}
                    onCheckedChange={(v) => setSilverOpinion(v ? "hanafi" : "majority")}
                  />
                </div>
              )}
            </div>

            <div className="rounded-md border bg-background p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                إجمالي المجوهرات والمشغولات (الخاضع للزكاة) بعيار 999
              </span>
              <span className="text-lg font-bold text-gold">
                {fmt(calc.svJewelryG999)} جم
              </span>
            </div>
          </div>

          {/* الإجمالي الفضي */}
          <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-l from-primary/10 to-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm font-bold text-primary">
                إجمالي الوعاء الزكوي من الفضة
              </div>
              {calc.silverEligible ? (
                <Badge className="bg-primary">بلغ النصاب</Badge>
              ) : (
                <Badge variant="secondary">دون النصاب ({SILVER_NISAB_GRAMS} جم)</Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-md bg-background border p-3">
                <div className="text-xs text-muted-foreground">سبائك وأونصات</div>
                <div className="font-bold">{fmt(calc.svSabaikG999)} جم</div>
              </div>
              <div className="rounded-md bg-background border p-3">
                <div className="text-xs text-muted-foreground">عملات</div>
                <div className="font-bold">{fmt(calc.svCoinsG999)} جم</div>
              </div>
              <div className="rounded-md bg-background border p-3">
                <div className="text-xs text-muted-foreground">مجوهرات (خاضعة)</div>
                <div className="font-bold">{fmt(calc.svJewelryG999)} جم</div>
              </div>
            </div>
            <Separator />
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">
                  إجمالي الوزن بعيار 999
                </div>
                <div className="text-xl font-extrabold text-gold">
                  {fmt(calc.silverGrams)} جم
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">× سعر جرام عيار 999</div>
                <div className="text-xl font-extrabold">{cur(num(silverPrice))}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">قيمة الوعاء الفضي</div>
                <div className="text-xl font-extrabold text-primary">
                  {cur(calc.silverValue)}
                </div>
              </div>
            </div>
          </div>

          {/* إجمالي وعاء الذهب + الفضة + الأسعار المرجعية */}
          <div className="rounded-xl border-2 border-gold/50 bg-gold/10 p-4 space-y-3">
            <div className="text-sm font-bold text-gold flex items-center gap-2">
              <Coins className="h-4 w-4" /> إجمالي وعاء زكاة الذهب والفضة
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between border-b border-dashed py-1.5">
                <span>الوعاء من الذهب</span>
                <span className="font-bold">{cur(calc.totalGoldValue)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-dashed py-1.5">
                <span>الوعاء من الفضة</span>
                <span className="font-bold">{cur(calc.silverValue)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-dashed py-1.5">
                <span>إجمالي الوعاء (الذهب + الفضة)</span>
                <span className="font-bold text-primary">
                  {cur(calc.totalGoldValue + calc.silverValue)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span>
                  الزكاة الواجبة على الذهب والفضة ({(effectiveRate * 100).toFixed(3)}%)
                </span>
                <span className="font-extrabold text-gold text-lg">
                  {cur(calc.goldZakat + calc.silverZakat)}
                </span>
              </div>
            </div>

            <Separator />
            <div className="text-xs font-semibold text-primary flex items-center gap-2">
              <Info className="h-3.5 w-3.5" />
              الأسعار المرجعية اليوم ({countryName}) — تحديث لحظي حسب الدولة المسجلة في
              بيانات المزكي
            </div>
            <div className="grid md:grid-cols-2 gap-3 rounded-lg border bg-background/60 p-3">
              <NumField
                label="سعر جرام الذهب عيار 24"
                value={goldPrice}
                onChange={setGoldPrice}
                unit={currencyName}
              />
              <NumField
                label="سعر جرام الفضة الخالصة (عيار 999)"
                value={silverPrice}
                onChange={setSilverPrice}
                unit={currencyName}
              />
              <div className="md:col-span-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 text-right">
                نصاب الذهب: <b>{cur(calc.goldNisabValue)}</b> — نصاب الفضة:{" "}
                <b>{cur(calc.silverNisabValue)}</b> — الأنفع للفقراء:{" "}
                <b>{cur(calc.moneyNisab)}</b>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </>
  );
}
