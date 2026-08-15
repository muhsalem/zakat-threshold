import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, Building2, Truck, Briefcase, HandCoins, Users, AlertTriangle } from "lucide-react";
import { currency as fmtCurrency, num } from "@/lib/zakat";

interface Props {
  currencyName: string;
  onTotalChange: (zakatable: number) => void;
}

type RentRow = {
  id: number;
  type: string;
  income: string;
  halal: boolean;
  owned: boolean;
  inCash: boolean;
};
type IncomeRow = {
  id: number;
  source: string;
  amount: string;
  halal: boolean;
  owned: boolean;
  inCash: boolean;
};

const RENT_PROPS = [
  { v: "apartment", l: "شقق سكنية" },
  { v: "shop", l: "محلات تجارية" },
  { v: "office", l: "مكاتب / عمارات / أراضي" },
  { v: "comm_sale", l: "عقارات للبيع التجاري" },
];
const RENT_VEH = [
  { v: "machine", l: "آلات / معدات / سيارات مؤجرة" },
  { v: "boat", l: "قوارب / طائرات مؤجرة" },
  { v: "other", l: "إيرادات أخرى" },
];
const INCOME_SOURCES = [
  { v: "salary", l: "مرتب / راتب وظيفي" },
  { v: "freelance", l: "أعمال حرة / مهنة" },
  { v: "consult", l: "استشارات / تدريب" },
  { v: "royalty", l: "حقوق ملكية فكرية" },
  { v: "gift", l: "هدايا وهبات" },
  { v: "pension", l: "معاش / تقاعد" },
  { v: "other", l: "مصدر آخر" },
];

export function IncomeUsufructSection({ currencyName, onTotalChange }: Props) {
  // أ) المستغلات العقارية
  const [props_, setProps_] = useState<RentRow[]>([
    { id: 1, type: "apartment", income: "", halal: true, owned: true, inCash: false },
  ]);
  // ب) المستغلات (آلات/مركبات)
  const [vehicles, setVehicles] = useState<RentRow[]>([
    { id: 1, type: "machine", income: "", halal: true, owned: true, inCash: false },
  ]);
  // ج) المصاريف والنفقات الضرورية للمستغلات
  const [usufructExpenses, setUsufructExpenses] = useState("");

  // د) زكاة الدخل
  const [incomes, setIncomes] = useState<IncomeRow[]>([
    { id: 1, source: "salary", amount: "", halal: true, owned: true, inCash: false },
  ]);
  // هـ) الشراكة في شركة (زكاة الأسهم/الحصص في شركة قائمة)
  const [hasPartnership, setHasPartnership] = useState(false);
  const [partnerShare, setPartnerShare] = useState(""); // نسبة الشريك %
  const [companyZakatableBase, setCompanyZakatableBase] = useState(""); // وعاء الشركة المعلَن
  const [companyName, setCompanyName] = useState("");

  const fmt = (n: number) => fmtCurrency(n, currencyName);

  const upd = <T extends { id: number }>(setter: React.Dispatch<React.SetStateAction<T[]>>) => ({
    add: (template: T) => setter((r) => [...r, { ...template, id: Date.now() }]),
    remove: (id: number) => setter((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r)),
    update: (id: number, patch: Partial<T>) =>
      setter((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x))),
  });
  const propsOps = upd(setProps_);
  const vehOps = upd(setVehicles);
  const incOps = upd(setIncomes);

  const totals = useMemo(() => {
    const sumRows = (rows: RentRow[] | IncomeRow[]) =>
      rows.reduce((acc, r: any) => {
        if (!r.halal || !r.owned || r.inCash) return acc; // استبعاد غير الحلال أو غير المملوك أو المحسوب نقداً
        return acc + num(r.amount ?? r.income);
      }, 0);

    const propsIncome = sumRows(props_);
    const vehIncome = sumRows(vehicles);
    const grossUsufruct = propsIncome + vehIncome;
    const expenses = num(usufructExpenses);
    const netUsufruct = Math.max(0, grossUsufruct - expenses); // صافي الإيراد المُدّخر

    const incomeTotal = sumRows(incomes);

    const partnerZak = hasPartnership ? num(companyZakatableBase) * (num(partnerShare) / 100) : 0;

    const zakatable = netUsufruct + incomeTotal + partnerZak;
    return { propsIncome, vehIncome, netUsufruct, incomeTotal, partnerZak, zakatable };
  }, [
    props_,
    vehicles,
    incomes,
    usufructExpenses,
    hasPartnership,
    partnerShare,
    companyZakatableBase,
  ]);

  useEffect(() => {
    onTotalChange(totals.zakatable);
  }, [totals.zakatable, onTotalChange]);

  const renderRentRow = (
    list: { v: string; l: string }[],
    rows: RentRow[],
    ops: ReturnType<typeof upd<RentRow>>,
    defaultType: string,
  ) => (
    <div className="space-y-2">
      <div className="hidden md:grid grid-cols-12 gap-2 text-[11px] text-muted-foreground px-1">
        <div className="col-span-4">النوع</div>
        <div className="col-span-3">الإيراد الصافي السنوي ({currencyName})</div>
        <div className="col-span-2">حلال؟</div>
        <div className="col-span-2">ملك تام؟</div>
        <div className="col-span-1">حذف</div>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-12 gap-2 items-center bg-muted/30 p-2 rounded">
          <div className="col-span-12 md:col-span-4">
            <Select value={r.type} onValueChange={(v) => ops.update(r.id, { type: v } as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {list.map((p) => (
                  <SelectItem key={p.v} value={p.v}>
                    {p.l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-12 md:col-span-3">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={r.income}
              onChange={(e) => ops.update(r.id, { income: e.target.value } as any)}
              dir="ltr"
              style={{ textAlign: "right" }}
              placeholder="0"
            />
          </div>
          <div className="col-span-4 md:col-span-2 flex items-center gap-2">
            <Switch
              checked={r.halal}
              onCheckedChange={(v) => ops.update(r.id, { halal: v } as any)}
            />
            <span className="text-xs">حلال</span>
          </div>
          <div className="col-span-4 md:col-span-2 flex items-center gap-2">
            <Switch
              checked={r.owned}
              onCheckedChange={(v) => ops.update(r.id, { owned: v } as any)}
            />
            <span className="text-xs">ملك تام</span>
          </div>
          <div className="col-span-4 md:col-span-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => ops.remove(r.id)}
              disabled={rows.length <= 1}
            >
              ×
            </Button>
          </div>
          <div className="col-span-12 flex items-center gap-2 px-1">
            <Switch
              checked={r.inCash}
              onCheckedChange={(v) => ops.update(r.id, { inCash: v } as any)}
            />
            <span className="text-[11px] text-muted-foreground">
              هذا الإيراد محسوب ضمن «النقدية والبنوك» — استبعده منعاً للازدواج
            </span>
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          ops.add({
            id: 0,
            type: defaultType,
            income: "",
            halal: true,
            owned: true,
            inCash: false,
          } as RentRow)
        }
      >
        + إضافة
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          <b>المستغلات</b>: لا زكاة في رقبتها (العقار/الآلة)، وإنما في <b>صافي إيرادها المُدّخر</b>{" "}
          بعد النفقات إذا بلغ النصاب وحال عليه الحول.
          <br />
          <b>الدخل</b>: يُزكَّى ما <b>تبقى</b> من الراتب وسائر الدخول في تاريخ الحول (مذهب الجمهور)،
          ويُشترط أن يكون <b>حلالاً</b> و<b>مملوكاً ملكاً تاماً</b>.
        </AlertDescription>
      </Alert>

      {/* المستغلات العقارية */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Building2 className="h-4 w-4" /> أ) عقارات مؤجرة (مستغلات)
        </div>
        {renderRentRow(RENT_PROPS, props_, propsOps, "apartment")}
      </div>

      {/* الآلات والمركبات */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Truck className="h-4 w-4" /> ب) آلات ومركبات مؤجرة
        </div>
        {renderRentRow(RENT_VEH, vehicles, vehOps, "machine")}
      </div>

      {/* مصاريف المستغلات */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <Label className="text-sm">
          المصاريف والنفقات الضرورية للمستغلات (صيانة، ضرائب عقارية، تأمين…)
        </Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={usufructExpenses}
          onChange={(e) => setUsufructExpenses(e.target.value)}
          dir="ltr"
          style={{ textAlign: "right" }}
          placeholder="0"
        />
        <p className="text-[11px] text-muted-foreground">
          تُخصم من إجمالي الإيراد لاحتساب الصافي المُدّخر. صافي المستغلات:{" "}
          <b className="text-primary">{fmt(totals.netUsufruct)}</b>
        </p>
      </div>

      <Separator />

      {/* زكاة الدخل */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <HandCoins className="h-4 w-4" /> ج) زكاة الدخل (الرواتب والمصادر الأخرى)
        </div>
        <p className="text-[11px] text-muted-foreground">
          أدخل المتبقي من كل مصدر دخل بعد المصاريف الضرورية. ما حال عليه الحول ولم يُنفَق يدخل في
          الوعاء.
        </p>
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-12 gap-2 text-[11px] text-muted-foreground px-1">
            <div className="col-span-4">المصدر</div>
            <div className="col-span-3">المتبقي ({currencyName})</div>
            <div className="col-span-2">حلال؟</div>
            <div className="col-span-2">ملك تام؟</div>
            <div className="col-span-1">حذف</div>
          </div>
          {incomes.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-12 gap-2 items-center bg-muted/30 p-2 rounded"
            >
              <div className="col-span-12 md:col-span-4">
                <Select value={r.source} onValueChange={(v) => incOps.update(r.id, { source: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_SOURCES.map((p) => (
                      <SelectItem key={p.v} value={p.v}>
                        {p.l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-12 md:col-span-3">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={r.amount}
                  onChange={(e) => incOps.update(r.id, { amount: e.target.value })}
                  dir="ltr"
                  style={{ textAlign: "right" }}
                  placeholder="0"
                />
              </div>
              <div className="col-span-4 md:col-span-2 flex items-center gap-2">
                <Switch
                  checked={r.halal}
                  onCheckedChange={(v) => incOps.update(r.id, { halal: v })}
                />
                <span className="text-xs">حلال</span>
              </div>
              <div className="col-span-4 md:col-span-2 flex items-center gap-2">
                <Switch
                  checked={r.owned}
                  onCheckedChange={(v) => incOps.update(r.id, { owned: v })}
                />
                <span className="text-xs">ملك تام</span>
              </div>
              <div className="col-span-4 md:col-span-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => incOps.remove(r.id)}
                  disabled={incomes.length <= 1}
                >
                  ×
                </Button>
              </div>
              <div className="col-span-12 flex items-center gap-2 px-1">
                <Switch
                  checked={r.inCash}
                  onCheckedChange={(v) => incOps.update(r.id, { inCash: v })}
                />
                <span className="text-[11px] text-muted-foreground">
                  هذا الدخل محسوب ضمن «النقدية والبنوك» — استبعده منعاً للازدواج
                </span>
              </div>
              {(!r.halal || !r.owned) && (
                <div className="col-span-12 flex items-start gap-2 text-[11px] text-warning dark:text-warning bg-warning/10 dark:bg-warning/30 rounded px-2 py-1">
                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    {!r.halal
                      ? "المال غير الحلال يجب التخلص منه ولا تجب فيه الزكاة."
                      : "ما ليس مملوكاً ملكاً تاماً (كالمعاش غير المقبوض) لا تجب فيه الزكاة حتى يُقبض."}
                  </span>
                </div>
              )}
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              incOps.add({
                id: 0,
                source: "other",
                amount: "",
                halal: true,
                owned: true,
                inCash: false,
              } as IncomeRow)
            }
          >
            + إضافة مصدر دخل
          </Button>
        </div>
      </div>

      <Separator />

      {/* الشراكة في شركة */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Users className="h-4 w-4" /> د) هل أنت شريك / مساهم في شركة؟
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={hasPartnership} onCheckedChange={setHasPartnership} />
          <span className="text-sm">نعم، أملك حصة في شركة قائمة</span>
        </div>
        {hasPartnership && (
          <div className="space-y-3 pt-2">
            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                إذا كانت الشركة <b>تُخرج زكاتها</b> عن كامل وعائها فلا يلزمك إعادة احتسابها — اتركها
                صفراً. وإلا، أدخل <b>وعاء الشركة الزكوي</b> (من نموذج «زكاة الشركات») ونسبة حصتك
                لاحتساب نصيبك.
              </AlertDescription>
            </Alert>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">اسم الشركة</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="…"
                />
              </div>
              <div>
                <Label className="text-xs">نسبة حصتك %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={partnerShare}
                  onChange={(e) => setPartnerShare(e.target.value)}
                  dir="ltr"
                  style={{ textAlign: "right" }}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">وعاء الشركة الزكوي ({currencyName})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={companyZakatableBase}
                  onChange={(e) => setCompanyZakatableBase(e.target.value)}
                  dir="ltr"
                  style={{ textAlign: "right" }}
                  placeholder="0"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              نصيبك من وعاء الشركة: <b className="text-primary">{fmt(totals.partnerZak)}</b>
            </p>
          </div>
        )}
      </div>

      {/* الملخص */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">صافي المستغلات</span>
          <b>{fmt(totals.netUsufruct)}</b>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">الدخل المتبقي</span>
          <b>{fmt(totals.incomeTotal)}</b>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">نصيبك من زكاة الشركة</span>
          <b>{fmt(totals.partnerZak)}</b>
        </div>
        <Separator className="my-2" />
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">إجمالي الوعاء المضاف للزكاة</span>
          <span className="font-bold text-primary">{fmt(totals.zakatable)}</span>
        </div>
      </div>
    </div>
  );
}
