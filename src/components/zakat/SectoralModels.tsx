import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase, Factory, Building, UserCog, Fish, Pickaxe, Info, Calculator, Wallet, Landmark, Headset } from "lucide-react";
import { ZAKAT_RATE, ZAKAT_RATE_GREGORIAN, GOLD_NISAB_GRAMS, num, fmt } from "@/lib/zakat";

// ============ مكوّن حقل رقمي مشترك ============
function NF({ label, value, onChange, unit = "" }: { label: string; value: string; onChange: (v: string) => void; unit?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="number" min="0" step="0.01" value={value}
          onChange={(e) => onChange(e.target.value)} placeholder="0"
          className="pl-14 h-9" dir="ltr" style={{ textAlign: "right" }}
        />
        {unit && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function ResultBox({
  vessel, nisabValue, currency, yearMode,
}: { vessel: number; nisabValue: number; currency: string; yearMode: "hijri" | "solar" }) {
  const reached = vessel >= nisabValue && vessel > 0;
  const rate = yearMode === "solar" ? ZAKAT_RATE_GREGORIAN : ZAKAT_RATE;
  const zakat = reached ? vessel * rate : 0;
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-gold/5 p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">وعاء الزكاة:</span>
        <b className="text-primary">{fmt(vessel)} {currency}</b>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">النصاب (85جم ذهب):</span>
        <b>{fmt(nisabValue)} {currency}</b>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">نسبة الزكاة:</span>
        <b>{(rate * 100).toFixed(3)}%</b>
      </div>
      <Separator />
      <div className="flex justify-between text-base">
        <span className="font-semibold">الزكاة الواجبة:</span>
        <b className={reached ? "text-primary text-lg" : "text-muted-foreground"}>
          {reached ? `${fmt(zakat)} ${currency}` : "لا تجب الزكاة (الوعاء أقل من النصاب)"}
        </b>
      </div>
    </div>
  );
}

// ============ عام: شريط أعلى ============
function TopBar({
  currency, setCurrency, goldGram, setGoldGram, yearMode, setYearMode,
}: {
  currency: string; setCurrency: (v: string) => void;
  goldGram: string; setGoldGram: (v: string) => void;
  yearMode: "hijri" | "solar"; setYearMode: (v: "hijri" | "solar") => void;
}) {
  return (
    <div className="grid md:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg mb-4">
      <div className="space-y-1">
        <Label className="text-xs">العملة</Label>
        <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-9" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">سعر جرام الذهب عيار 24</Label>
        <Input type="number" value={goldGram} onChange={(e) => setGoldGram(e.target.value)} className="h-9" dir="ltr" style={{ textAlign: "right" }} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">نوع السنة</Label>
        <select value={yearMode} onChange={(e) => setYearMode(e.target.value as "hijri" | "solar")} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
          <option value="hijri">هجرية قمرية (2.5%)</option>
          <option value="solar">ميلادية شمسية (2.577%)</option>
        </select>
      </div>
    </div>
  );
}

// ============ 1) زكاة النشاط التجاري ============
function TradeModel({ currency, nisab, yearMode }: { currency: string; nisab: number; yearMode: "hijri" | "solar" }) {
  const [a, set] = useState({
    cash: "", inv_warehouse: "", inv_road: "", inv_agent: "",
    securities: "", good_debts: "", notes_receivable: "", staff_loans: "",
    // مطلوبات
    payables: "", notes_payable: "", st_loans: "", provisions: "", tax_due: "",
  });
  const u = (k: keyof typeof a) => (v: string) => set((s) => ({ ...s, [k]: v }));
  const assets = num(a.cash) + num(a.inv_warehouse) + num(a.inv_road) + num(a.inv_agent) +
                 num(a.securities) + num(a.good_debts) + num(a.notes_receivable) + num(a.staff_loans);
  const liabs = num(a.payables) + num(a.notes_payable) + num(a.st_loans) + num(a.provisions) + num(a.tax_due);
  const vessel = Math.max(0, assets - liabs);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm text-primary">الموجودات الزكوية</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <NF label="النقدية (صندوق/بنك)" value={a.cash} onChange={u("cash")} unit={currency} />
          <NF label="بضاعة بالمخازن (بسعر البيع)" value={a.inv_warehouse} onChange={u("inv_warehouse")} unit={currency} />
          <NF label="بضاعة بالطريق (فوب)" value={a.inv_road} onChange={u("inv_road")} unit={currency} />
          <NF label="بضاعة الوكالة لدى الغير" value={a.inv_agent} onChange={u("inv_agent")} unit={currency} />
          <NF label="أوراق مالية (أسهم/سندات بالقيمة السوقية)" value={a.securities} onChange={u("securities")} unit={currency} />
          <NF label="الديون الجيدة (المرجوة التحصيل)" value={a.good_debts} onChange={u("good_debts")} unit={currency} />
          <NF label="أوراق القبض المرجوة التحصيل" value={a.notes_receivable} onChange={u("notes_receivable")} unit={currency} />
          <NF label="سُلف العاملين المرجوة" value={a.staff_loans} onChange={u("staff_loans")} unit={currency} />
          <div className="pt-2 text-sm flex justify-between border-t"><span>إجمالي الموجودات:</span><b>{fmt(assets)}</b></div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm text-destructive">المطلوبات الزكوية (تُحسم)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <NF label="الدائنون" value={a.payables} onChange={u("payables")} unit={currency} />
            <NF label="أوراق الدفع" value={a.notes_payable} onChange={u("notes_payable")} unit={currency} />
            <NF label="القروض قصيرة الأجل / السحب على المكشوف" value={a.st_loans} onChange={u("st_loans")} unit={currency} />
            <NF label="المخصصات لمواجهة التزامات حالة" value={a.provisions} onChange={u("provisions")} unit={currency} />
            <NF label="الضرائب المستحقة" value={a.tax_due} onChange={u("tax_due")} unit={currency} />
            <div className="pt-2 text-sm flex justify-between border-t"><span>إجمالي المطلوبات:</span><b>{fmt(liabs)}</b></div>
          </CardContent>
        </Card>
        <ResultBox vessel={vessel} nisabValue={nisab} currency={currency} yearMode={yearMode} />
      </div>
    </div>
  );
}

// ============ 2) زكاة النشاط الصناعي ============
function IndustrialModel({ currency, nisab, yearMode }: { currency: string; nisab: number; yearMode: "hijri" | "solar" }) {
  const [a, set] = useState({
    cash: "", finished: "", wip: "", raw: "", receivables: "", securities: "",
    lc: "", checks: "", accrued_income: "", other_debit: "",
    payables: "", notes_payable: "", credit_facilities: "", provisions: "", accruals: "", current_loan_part: "",
  });
  const u = (k: keyof typeof a) => (v: string) => set((s) => ({ ...s, [k]: v }));
  const assets =
    num(a.cash) + num(a.finished) + num(a.wip) + num(a.raw) + num(a.receivables) +
    num(a.securities) + num(a.lc) + num(a.checks) + num(a.accrued_income) + num(a.other_debit);
  const liabs = num(a.payables) + num(a.notes_payable) + num(a.credit_facilities) +
                num(a.provisions) + num(a.accruals) + num(a.current_loan_part);
  const vessel = Math.max(0, assets - liabs);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm text-primary">الموجودات الزكوية</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <NF label="النقدية (صندوق/بنك)" value={a.cash} onChange={u("cash")} unit={currency} />
          <NF label="مخزون الإنتاج التام (بالقيمة السوقية)" value={a.finished} onChange={u("finished")} unit={currency} />
          <NF label="مخزون الإنتاج تحت التشغيل (بالقيمة السوقية)" value={a.wip} onChange={u("wip")} unit={currency} />
          <NF label="مخزون المواد الخام (بالقيمة السوقية)" value={a.raw} onChange={u("raw")} unit={currency} />
          <NF label="المدينون (الجيد) وما في حكمه" value={a.receivables} onChange={u("receivables")} unit={currency} />
          <NF label="الأوراق المالية" value={a.securities} onChange={u("securities")} unit={currency} />
          <NF label="الاعتمادات المستندية" value={a.lc} onChange={u("lc")} unit={currency} />
          <NF label="شيكات تحت التحصيل (الجيد)" value={a.checks} onChange={u("checks")} unit={currency} />
          <NF label="إيرادات مستحقة جيدة" value={a.accrued_income} onChange={u("accrued_income")} unit={currency} />
          <NF label="أرصدة مدينة أخرى" value={a.other_debit} onChange={u("other_debit")} unit={currency} />
          <div className="pt-2 text-sm flex justify-between border-t"><span>إجمالي الموجودات:</span><b>{fmt(assets)}</b></div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm text-destructive">المطلوبات الزكوية</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <NF label="الدائنون" value={a.payables} onChange={u("payables")} unit={currency} />
            <NF label="أوراق الدفع" value={a.notes_payable} onChange={u("notes_payable")} unit={currency} />
            <NF label="تسهيلات ائتمانية" value={a.credit_facilities} onChange={u("credit_facilities")} unit={currency} />
            <NF label="المخصصات لالتزامات حالة" value={a.provisions} onChange={u("provisions")} unit={currency} />
            <NF label="مصروفات مستحقة" value={a.accruals} onChange={u("accruals")} unit={currency} />
            <NF label="القسط الحال من القرض طويل الأجل" value={a.current_loan_part} onChange={u("current_loan_part")} unit={currency} />
            <div className="pt-2 text-sm flex justify-between border-t"><span>إجمالي المطلوبات:</span><b>{fmt(liabs)}</b></div>
          </CardContent>
        </Card>
        <ResultBox vessel={vessel} nisabValue={nisab} currency={currency} yearMode={yearMode} />
      </div>
    </div>
  );
}

// ============ 2.5) زكاة النشاط الخدمي ============
function ServicesModel({ currency, nisab, yearMode }: { currency: string; nisab: number; yearMode: "hijri" | "solar" }) {
  const [a, set] = useState({
    cash: "", banks: "", clients: "", wip_services: "", consumables: "",
    accrued_fees: "", securities: "", other_debit: "",
    suppliers: "", accrued_salaries: "", accrued_rent: "", tax_due: "", st_loans: "", provisions: "",
  });
  const u = (k: keyof typeof a) => (v: string) => set((s) => ({ ...s, [k]: v }));
  const assets = num(a.cash) + num(a.banks) + num(a.clients) + num(a.wip_services) +
    num(a.consumables) + num(a.accrued_fees) + num(a.securities) + num(a.other_debit);
  const liabs = num(a.suppliers) + num(a.accrued_salaries) + num(a.accrued_rent) +
    num(a.tax_due) + num(a.st_loans) + num(a.provisions);
  const vessel = Math.max(0, assets - liabs);
  return (
    <div className="space-y-4">
      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          النشاط الخدمي (استشارات، نقل، صحة، تعليم، سياحة، اتصالات، برمجيات...): تُزكى الموجودات المتداولة الزكوية (نقدية + ذمم العملاء + الخدمات تحت التنفيذ + المستهلكات) بعد حسم الالتزامات المتداولة، بنسبة 2.5%.
        </AlertDescription>
      </Alert>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm text-primary">الموجودات الزكوية</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <NF label="النقدية بالخزائن" value={a.cash} onChange={u("cash")} unit={currency} />
            <NF label="الأرصدة لدى البنوك" value={a.banks} onChange={u("banks")} unit={currency} />
            <NF label="ذمم العملاء (الجيد التحصيل)" value={a.clients} onChange={u("clients")} unit={currency} />
            <NF label="خدمات تحت التنفيذ (WIP)" value={a.wip_services} onChange={u("wip_services")} unit={currency} />
            <NF label="مستهلكات وأدوات تشغيلية بسعر السوق" value={a.consumables} onChange={u("consumables")} unit={currency} />
            <NF label="أتعاب/إيرادات خدمية مستحقة" value={a.accrued_fees} onChange={u("accrued_fees")} unit={currency} />
            <NF label="أوراق مالية بالقيمة السوقية" value={a.securities} onChange={u("securities")} unit={currency} />
            <NF label="أرصدة مدينة أخرى" value={a.other_debit} onChange={u("other_debit")} unit={currency} />
            <div className="pt-2 text-sm flex justify-between border-t"><span>الإجمالي:</span><b>{fmt(assets)}</b></div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm text-destructive">الالتزامات الزكوية</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <NF label="الموردون والدائنون" value={a.suppliers} onChange={u("suppliers")} unit={currency} />
              <NF label="مرتبات وأجور مستحقة" value={a.accrued_salaries} onChange={u("accrued_salaries")} unit={currency} />
              <NF label="إيجارات ومرافق مستحقة" value={a.accrued_rent} onChange={u("accrued_rent")} unit={currency} />
              <NF label="ضرائب مستحقة" value={a.tax_due} onChange={u("tax_due")} unit={currency} />
              <NF label="قروض/تسهيلات قصيرة الأجل" value={a.st_loans} onChange={u("st_loans")} unit={currency} />
              <NF label="مخصصات لالتزامات حالة" value={a.provisions} onChange={u("provisions")} unit={currency} />
              <div className="pt-2 text-sm flex justify-between border-t"><span>الإجمالي:</span><b>{fmt(liabs)}</b></div>
            </CardContent>
          </Card>
          <ResultBox vessel={vessel} nisabValue={nisab} currency={currency} yearMode={yearMode} />
        </div>
      </div>
    </div>
  );
}

// ============ 3) زكاة المُستغلات (عقار/فنادق/تأجير) ============
function MustaghallatModel({ currency, nisab, yearMode }: { currency: string; nisab: number; yearMode: "hijri" | "solar" }) {
  const [a, set] = useState({
    cash: "", banks_local: "", banks_foreign: "", good_debts: "", accrued_income: "", other: "",
    operating_loans: "", maintenance_accruals: "", salary_accruals: "", suppliers: "", tax_due: "", provisions: "",
  });
  const u = (k: keyof typeof a) => (v: string) => set((s) => ({ ...s, [k]: v }));
  const assets = num(a.cash) + num(a.banks_local) + num(a.banks_foreign) +
                 num(a.good_debts) + num(a.accrued_income) + num(a.other);
  const liabs = num(a.operating_loans) + num(a.maintenance_accruals) + num(a.salary_accruals) +
                num(a.suppliers) + num(a.tax_due) + num(a.provisions);
  const vessel = Math.max(0, assets - liabs);
  return (
    <div className="space-y-4">
      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          المُستغلات: أصول مُعدّة للتأجير أو استغلال غلّتها (عقارات إيجار، فنادق، سيارات أجرة...). تُزكى <b>الغلة الصافية</b> لا قيمة الأصل نفسه.
        </AlertDescription>
      </Alert>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm text-primary">الموجودات الزكوية</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <NF label="النقدية بالخزائن" value={a.cash} onChange={u("cash")} unit={currency} />
            <NF label="الأرصدة لدى البنوك (عملة محلية)" value={a.banks_local} onChange={u("banks_local")} unit={currency} />
            <NF label="الأرصدة بالعملات الأجنبية (بعد التقويم)" value={a.banks_foreign} onChange={u("banks_foreign")} unit={currency} />
            <NF label="الديون الجيدة" value={a.good_debts} onChange={u("good_debts")} unit={currency} />
            <NF label="إيرادات مستحقة جيدة التحصيل" value={a.accrued_income} onChange={u("accrued_income")} unit={currency} />
            <NF label="موجودات زكوية أخرى" value={a.other} onChange={u("other")} unit={currency} />
            <div className="pt-2 text-sm flex justify-between border-t"><span>الإجمالي:</span><b>{fmt(assets)}</b></div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm text-destructive">الالتزامات الزكوية</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <NF label="قروض تشغيلية (لم تُستخدم لأصول ثابتة)" value={a.operating_loans} onChange={u("operating_loans")} unit={currency} />
              <NF label="تكاليف صيانة مستحقة" value={a.maintenance_accruals} onChange={u("maintenance_accruals")} unit={currency} />
              <NF label="مرتبات وأجور مستحقة" value={a.salary_accruals} onChange={u("salary_accruals")} unit={currency} />
              <NF label="الموردون" value={a.suppliers} onChange={u("suppliers")} unit={currency} />
              <NF label="التزامات ضريبية" value={a.tax_due} onChange={u("tax_due")} unit={currency} />
              <NF label="مخصصات (تعويضات قضائية ونحوها)" value={a.provisions} onChange={u("provisions")} unit={currency} />
              <div className="pt-2 text-sm flex justify-between border-t"><span>الإجمالي:</span><b>{fmt(liabs)}</b></div>
            </CardContent>
          </Card>
          <ResultBox vessel={vessel} nisabValue={nisab} currency={currency} yearMode={yearMode} />
        </div>
      </div>
    </div>
  );
}

// ============ 4) زكاة المهن الحرة ============
function FreeProfModel({ currency, nisab, yearMode }: { currency: string; nisab: number; yearMode: "hijri" | "solar" }) {
  const [a, set] = useState({
    banks: "", cash: "", client_debts: "", accrued_fees: "", other_assets: "", asset_sales: "",
    salaries: "", car_repairs: "", tax_due: "", end_service: "",
  });
  const u = (k: keyof typeof a) => (v: string) => set((s) => ({ ...s, [k]: v }));
  const assets = num(a.banks) + num(a.cash) + num(a.client_debts) + num(a.accrued_fees) +
                 num(a.other_assets) + num(a.asset_sales);
  const liabs = num(a.salaries) + num(a.car_repairs) + num(a.tax_due) + num(a.end_service);
  const vessel = Math.max(0, assets - liabs);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm text-primary">الموجودات الزكوية</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <NF label="نقدية لدى البنوك" value={a.banks} onChange={u("banks")} unit={currency} />
          <NF label="نقدية في الخزينة" value={a.cash} onChange={u("cash")} unit={currency} />
          <NF label="ديون لدى العملاء (الجيد)" value={a.client_debts} onChange={u("client_debts")} unit={currency} />
          <NF label="إيرادات/أتعاب مستحقة جيدة" value={a.accrued_fees} onChange={u("accrued_fees")} unit={currency} />
          <NF label="قيمة أصول بيعت خلال الحول" value={a.asset_sales} onChange={u("asset_sales")} unit={currency} />
          <NF label="موجودات زكوية أخرى" value={a.other_assets} onChange={u("other_assets")} unit={currency} />
          <div className="pt-2 text-sm flex justify-between border-t"><span>الإجمالي:</span><b>{fmt(assets)}</b></div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm text-destructive">الالتزامات الزكوية</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <NF label="مرتبات العاملين المستحقة" value={a.salaries} onChange={u("salaries")} unit={currency} />
            <NF label="مصروفات إصلاح/تشغيل مستحقة" value={a.car_repairs} onChange={u("car_repairs")} unit={currency} />
            <NF label="مستحقات ضريبية" value={a.tax_due} onChange={u("tax_due")} unit={currency} />
            <NF label="مخصص مكافأة ترك الخدمة" value={a.end_service} onChange={u("end_service")} unit={currency} />
            <div className="pt-2 text-sm flex justify-between border-t"><span>الإجمالي:</span><b>{fmt(liabs)}</b></div>
          </CardContent>
        </Card>
        <ResultBox vessel={vessel} nisabValue={nisab} currency={currency} yearMode={yearMode} />
      </div>
    </div>
  );
}

// ============ 5) زكاة الثروة البحرية ============
function MarineModel({ currency, nisab, yearMode }: { currency: string; nisab: number; yearMode: "hijri" | "solar" }) {
  const [revenue, setRev] = useState("");
  const [costs, setCosts] = useState("");
  const [family, setFamily] = useState("");
  const [taxes, setTaxes] = useState("");
  const net = Math.max(0, num(revenue) - num(costs) - num(family) - num(taxes));
  return (
    <div className="space-y-4">
      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          تُحسب على صافي إيرادات الفترة (الأسماك، اللؤلؤ، المرجان...) بعد خصم نفقات الصيد والأعباء العائلية والضرائب، بنسبة 2.5%.
        </AlertDescription>
      </Alert>
      <Card>
        <CardContent className="space-y-3 pt-4">
          <NF label="إجمالي إيرادات الفترة (قيمة الأسماك/اللؤلؤ)" value={revenue} onChange={setRev} unit={currency} />
          <NF label="تكاليف الصيد والاستخراج" value={costs} onChange={setCosts} unit={currency} />
          <NF label="الأعباء العائلية للفترة" value={family} onChange={setFamily} unit={currency} />
          <NF label="ضرائب ورسوم" value={taxes} onChange={setTaxes} unit={currency} />
        </CardContent>
      </Card>
      <ResultBox vessel={net} nisabValue={nisab} currency={currency} yearMode={yearMode} />
    </div>
  );
}

// ============ 6) زكاة المعادن (النفط/الذهب المستخرج/...) ============
function MineralsModel({ currency, nisab, yearMode }: { currency: string; nisab: number; yearMode: "hijri" | "solar" }) {
  const [revenue, setRev] = useState("");
  const [costs, setCosts] = useState("");
  const [taxes, setTaxes] = useState("");
  const [shares, setShares] = useState("");
  const net = Math.max(0, num(revenue) - num(costs) - num(taxes));
  const rate = yearMode === "solar" ? ZAKAT_RATE_GREGORIAN : ZAKAT_RATE;
  const reached = net >= nisab && net > 0;
  const zakat = reached ? net * rate : 0;
  const shareCount = num(shares);
  const perShare = shareCount > 0 ? zakat / shareCount : 0;
  return (
    <div className="space-y-4">
      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          المعادن المستخرجة (نفط، ذهب خام، فضة...): نسبة 2.5% على صافي قيمة المعدن بعد خصم تكاليف الاستخراج والضرائب. وعند بعض الفقهاء: الرِكاز (المدفون) فيه الخمس (20%).
        </AlertDescription>
      </Alert>
      <Card>
        <CardContent className="space-y-3 pt-4">
          <NF label="قيمة المعدن المُستخرج خلال الفترة" value={revenue} onChange={setRev} unit={currency} />
          <NF label="تكاليف الاستخراج" value={costs} onChange={setCosts} unit={currency} />
          <NF label="ضرائب ورسوم" value={taxes} onChange={setTaxes} unit={currency} />
          <NF label="عدد الأسهم (لتوزيع نصيب السهم)" value={shares} onChange={setShares} unit="سهم" />
        </CardContent>
      </Card>
      <ResultBox vessel={net} nisabValue={nisab} currency={currency} yearMode={yearMode} />
      {shareCount > 0 && reached && (
        <Card className="bg-muted/40">
          <CardContent className="pt-4 flex justify-between text-sm">
            <span>نصيب السهم الواحد من الزكاة:</span>
            <b className="text-primary">{fmt(perShare, 4)} {currency}</b>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ 7) زكاة الأجور والرواتب (مرجع: د. عصام أبو النصر) ============
function SalaryModel({ currency, nisab, yearMode }: { currency: string; nisab: number; yearMode: "hijri" | "solar" }) {
  const [a, set] = useState({
    salaryRemain: "", bonusDue: "", commissionDue: "", incentiveDue: "",
    cashHome: "", currentAccount: "", savings: "", goodDebts: "",
    nonFixedDebts: "", taxesDue: "", socialDues: "",
  });
  const u = (k: keyof typeof a) => (v: string) => set((s) => ({ ...s, [k]: v }));
  const assets = num(a.salaryRemain) + num(a.bonusDue) + num(a.commissionDue) + num(a.incentiveDue) +
    num(a.cashHome) + num(a.currentAccount) + num(a.savings) + num(a.goodDebts);
  const liabs = num(a.nonFixedDebts) + num(a.taxesDue) + num(a.socialDues);
  const vessel = Math.max(0, assets - liabs);
  return (
    <div className="space-y-4">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          <b>قاعدة الحساب:</b> المتبقي لدى المزكي في نهاية الحول (الراتب الفائض + الحوافز/العمولات المستحقة + النقدية والحسابات + الديون الجيدة)
          <b> ناقص</b> الديون التي لم تُستخدم في الحصول على أصول ثابتة (أقساط واجبة السداد خلال السنة + تأمينات/نقابات + ضرائب مستحقة).
          <br />
          ملاحظة: <b>أقساط الأصول الثابتة (سيارة/عقار)</b> لا تُخصم وفق الراجح؛ يُخصم فقط ما كان ديناً تشغيلياً واجب السداد خلال السنة دون مقابل أصل ثابت.
        </AlertDescription>
      </Alert>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm text-primary">الموجودات الزكوية</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <NF label="المتبقي من الراتب في نهاية الحول" value={a.salaryRemain} onChange={u("salaryRemain")} unit={currency} />
            <NF label="حوافز مستحقة (تصدير/أداء)" value={a.bonusDue} onChange={u("bonusDue")} unit={currency} />
            <NF label="عمولات مستحقة" value={a.commissionDue} onChange={u("commissionDue")} unit={currency} />
            <NF label="مكافآت/أرباح سنوية مستحقة" value={a.incentiveDue} onChange={u("incentiveDue")} unit={currency} />
            <NF label="نقدية في خزنة المنزل" value={a.cashHome} onChange={u("cashHome")} unit={currency} />
            <NF label="رصيد الحساب الجاري" value={a.currentAccount} onChange={u("currentAccount")} unit={currency} />
            <NF label="رصيد التوفير/الادخار" value={a.savings} onChange={u("savings")} unit={currency} />
            <NF label="ديون جيدة التحصيل (المرجوّة)" value={a.goodDebts} onChange={u("goodDebts")} unit={currency} />
            <div className="pt-2 text-sm flex justify-between border-t"><span>إجمالي الموجودات:</span><b>{fmt(assets)}</b></div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm text-destructive">الالتزامات الزكوية (تُحسم)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <NF label="ديون تشغيلية واجبة السداد خلال السنة (دون مقابل أصل ثابت)" value={a.nonFixedDebts} onChange={u("nonFixedDebts")} unit={currency} />
              <NF label="ضرائب مستحقة لم تُسدَّد بعد" value={a.taxesDue} onChange={u("taxesDue")} unit={currency} />
              <NF label="اشتراكات تأمينات اجتماعية / نقابة" value={a.socialDues} onChange={u("socialDues")} unit={currency} />
              <div className="pt-2 text-sm flex justify-between border-t"><span>إجمالي الالتزامات:</span><b>{fmt(liabs)}</b></div>
            </CardContent>
          </Card>
          <ResultBox vessel={vessel} nisabValue={nisab} currency={currency} yearMode={yearMode} />
        </div>
      </div>
    </div>
  );
}

// ============ 8) الزكاة والضريبة ============
function TaxZakatModel({ currency, nisab, yearMode }: { currency: string; nisab: number; yearMode: "hijri" | "solar" }) {
  // الحالة 1: معالجة الضرائب في وعاء الزكاة
  const [c1, setC1] = useState({ zakatableAssets: "", taxesDue: "", otherDebts: "" });
  const u1 = (k: keyof typeof c1) => (v: string) => setC1((s) => ({ ...s, [k]: v }));
  const c1Vessel = Math.max(0, num(c1.zakatableAssets) - num(c1.taxesDue) - num(c1.otherDebts));

  // الحالة 2: معالجة الزكاة في مقدار الضريبة
  const [c2, setC2] = useState({ revenues: "", expensesExZakat: "", zakatPaid: "", taxRate: "40" });
  const u2 = (k: keyof typeof c2) => (v: string) => setC2((s) => ({ ...s, [k]: v }));
  const taxBase = Math.max(0, num(c2.revenues) - num(c2.expensesExZakat));
  const grossTax = taxBase * (num(c2.taxRate) / 100);
  const netTax = Math.max(0, grossTax - num(c2.zakatPaid));

  const rate = yearMode === "solar" ? ZAKAT_RATE_GREGORIAN : ZAKAT_RATE;
  const c1Reached = c1Vessel >= nisab && c1Vessel > 0;
  const c1Zakat = c1Reached ? c1Vessel * rate : 0;

  return (
    <div className="space-y-6">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          القاعدتان الفقهيتان عند الجمع بين الزكاة والضريبة:
          <br />
          <b>1) الضرائب المدفوعة فعلاً</b> أنقصت النقدية تلقائياً فلا تُطرح مرة أخرى. <b>الضرائب المستحقة</b> تُعدّ التزاماً زكوياً يُخصم من وعاء الزكاة.
          <br />
          <b>2)</b> إذا فرضت الدولة ضريبةً وزكاةً معاً، فمقدار الزكاة المدفوع يُخصم من الضريبة المستحقة (لا من وعائها).
        </AlertDescription>
      </Alert>

      {/* الحالة 1 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-primary">الحالة الأولى — معالجة الضرائب في وعاء الزكاة</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <NF label="الموجودات الزكوية (بعد خصم الضريبة المدفوعة فعلياً)" value={c1.zakatableAssets} onChange={u1("zakatableAssets")} unit={currency} />
            <NF label="الضرائب المستحقة الأداء (لم تُسدَّد بعد)" value={c1.taxesDue} onChange={u1("taxesDue")} unit={currency} />
            <NF label="ديون أخرى" value={c1.otherDebts} onChange={u1("otherDebts")} unit={currency} />
          </div>
          <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-gold/5 p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">وعاء الزكاة:</span><b className="text-primary">{fmt(c1Vessel)} {currency}</b></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">النصاب:</span><b>{fmt(nisab)} {currency}</b></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">نسبة الزكاة:</span><b>{(rate * 100).toFixed(3)}%</b></div>
            <Separator />
            <div className="flex justify-between text-base">
              <span className="font-semibold">الزكاة الواجبة:</span>
              <b className={c1Reached ? "text-primary text-lg" : "text-muted-foreground"}>
                {c1Reached ? `${fmt(c1Zakat)} ${currency}` : "لا تجب (دون النصاب)"}
              </b>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الحالة 2 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-primary">الحالة الثانية — خصم الزكاة من مقدار الضريبة</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <NF label="إجمالي الإيرادات" value={c2.revenues} onChange={u2("revenues")} unit={currency} />
            <NF label="إجمالي النفقات (فيما عدا الزكاة)" value={c2.expensesExZakat} onChange={u2("expensesExZakat")} unit={currency} />
            <NF label="مقدار الزكاة المدفوعة" value={c2.zakatPaid} onChange={u2("zakatPaid")} unit={currency} />
            <NF label="سعر ضريبة الأرباح %" value={c2.taxRate} onChange={u2("taxRate")} unit="%" />
          </div>
          <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-gold/5 p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">وعاء الضريبة (الإيرادات − النفقات):</span><b>{fmt(taxBase)} {currency}</b></div>
            <div className="flex justify-between"><span className="text-muted-foreground">مقدار الضريبة (الوعاء × {num(c2.taxRate)}%):</span><b>{fmt(grossTax)} {currency}</b></div>
            <div className="flex justify-between text-destructive"><span>− الزكاة المدفوعة:</span><b>−{fmt(num(c2.zakatPaid))} {currency}</b></div>
            <Separator />
            <div className="flex justify-between text-base">
              <span className="font-semibold">الضريبة الواجبة الأداء:</span>
              <b className="text-primary text-lg">{fmt(netTax)} {currency}</b>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ المكوّن الرئيسي ============
export function SectoralModels() {
  const [currency, setCurrency] = useState("ج.م");
  const [goldGram, setGoldGram] = useState("5400");
  const [yearMode, setYearMode] = useState<"hijri" | "solar">("hijri");
  const nisab = useMemo(() => num(goldGram) * GOLD_NISAB_GRAMS, [goldGram]);

  return (
    <div className="space-y-4">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            نماذج محاسبية متخصصة لحساب الزكاة
          </CardTitle>
          <p className="text-xs text-muted-foreground leading-relaxed">
            نماذج مطابقة لقوائم حساب الزكاة المعتمدة (المرجع: د. عصام أبو النصر — جامعة الأزهر). اختر نشاطك ثم أدخل الأرقام، يُحتسب الوعاء والزكاة تلقائياً.
          </p>
        </CardHeader>
        <CardContent>
          <TopBar
            currency={currency} setCurrency={setCurrency}
            goldGram={goldGram} setGoldGram={setGoldGram}
            yearMode={yearMode} setYearMode={setYearMode}
          />
          <div className="text-xs text-muted-foreground mb-3 px-1">
            النصاب الحالي: <b>{fmt(nisab)} {currency}</b> (= 85 جرام × {fmt(num(goldGram))})
          </div>

          <Tabs defaultValue="trade" className="space-y-4">
            <TabsList className="grid grid-cols-3 md:grid-cols-9 h-auto">
              <TabsTrigger value="trade" className="gap-1 text-xs py-2"><Briefcase className="h-3.5 w-3.5" />تجاري</TabsTrigger>
              <TabsTrigger value="industry" className="gap-1 text-xs py-2"><Factory className="h-3.5 w-3.5" />صناعي</TabsTrigger>
              <TabsTrigger value="services" className="gap-1 text-xs py-2"><Headset className="h-3.5 w-3.5" />خدمي</TabsTrigger>
              <TabsTrigger value="mustaghal" className="gap-1 text-xs py-2"><Building className="h-3.5 w-3.5" />مُستغلات</TabsTrigger>
              <TabsTrigger value="free" className="gap-1 text-xs py-2"><UserCog className="h-3.5 w-3.5" />مهن حرة</TabsTrigger>
              <TabsTrigger value="marine" className="gap-1 text-xs py-2"><Fish className="h-3.5 w-3.5" />ثروة بحرية</TabsTrigger>
              <TabsTrigger value="minerals" className="gap-1 text-xs py-2"><Pickaxe className="h-3.5 w-3.5" />معادن</TabsTrigger>
              <TabsTrigger value="salary" className="gap-1 text-xs py-2"><Wallet className="h-3.5 w-3.5" />أجور ورواتب</TabsTrigger>
              <TabsTrigger value="tax" className="gap-1 text-xs py-2"><Landmark className="h-3.5 w-3.5" />زكاة وضريبة</TabsTrigger>
            </TabsList>

            <TabsContent value="trade"><TradeModel currency={currency} nisab={nisab} yearMode={yearMode} /></TabsContent>
            <TabsContent value="industry"><IndustrialModel currency={currency} nisab={nisab} yearMode={yearMode} /></TabsContent>
            <TabsContent value="services"><ServicesModel currency={currency} nisab={nisab} yearMode={yearMode} /></TabsContent>
            <TabsContent value="mustaghal"><MustaghallatModel currency={currency} nisab={nisab} yearMode={yearMode} /></TabsContent>
            <TabsContent value="free"><FreeProfModel currency={currency} nisab={nisab} yearMode={yearMode} /></TabsContent>
            <TabsContent value="marine"><MarineModel currency={currency} nisab={nisab} yearMode={yearMode} /></TabsContent>
            <TabsContent value="minerals"><MineralsModel currency={currency} nisab={nisab} yearMode={yearMode} /></TabsContent>
            <TabsContent value="salary"><SalaryModel currency={currency} nisab={nisab} yearMode={yearMode} /></TabsContent>
            <TabsContent value="tax"><TaxZakatModel currency={currency} nisab={nisab} yearMode={yearMode} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
