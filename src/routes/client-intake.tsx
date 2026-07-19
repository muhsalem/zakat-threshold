import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Progress } from "@/components/ui/progress";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Sparkles,
  Shield,
  Users,
  Building2,
  ArrowLeft,
  Send,
  Award,
  FileCheck2,
  Stamp,
  Scale,
  Landmark,
  Coins,
  Wheat,
  Home,
  Briefcase,
} from "lucide-react";
import {
  createClient as createAccountantClient,
  type ClientKind,
  COUNTRY_LABELS,
} from "@/lib/accountantStore";
import { aggregateIntake, type IntakeDetails } from "@/lib/intakeMapping";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/client-intake")({
  head: () => ({
    meta: [
      { title: "احسب زكاتك مع محاسبك المعتمد — نافذة العميل" },
      {
        name: "description",
        content: "نموذج بسيط أو تقرير زكاة شامل معتمد يُرسل بريدياً خلال يومَي عمل من محاسب مرخّص.",
      },
      { property: "og:title", content: "احسب زكاتك — نافذة العميل" },
      { property: "og:description", content: "تسليم بيانات آمن للمحاسب المعتمد وتقرير PDF مختوم" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ClientIntakePage,
});

type ReportMode = "quick" | "comprehensive";

type FormState = {
  name: string;
  email: string;
  phone: string;
  kind: ClientKind;
  country: string;
  madhab: "mixed";
  hawlDate: string;
  // basic
  cash: number;
  gold: number;
  investments: number;
  inventory: number;
  receivables: number;
  debts: number;
  // comprehensive extras
  bankAccounts: number;
  savingsBonds: number;
  cryptoValue: number;
  goldGrams: number;
  goldKarat: 18 | 21 | 24;
  silverGrams: number;
  jewelryPersonal: number;
  stocksTrading: number;
  stocksLongTerm: number;
  mutualFunds: number;
  sukuk: number;
  esopVestedValue: number;
  bills: number;
  rikazMetals: number;
  realEstateTrading: number;
  realEstateRental: number;
  rentalIncomeAnnual: number;
  agricultureType: "none" | "rainfed" | "irrigated";
  agricultureValue: number;
  livestockCamels: number;
  livestockCattle: number;
  livestockSheep: number;
  salaryMonthly: number;
  endOfServiceBenefits: number;
  businessAssets: number;
  businessLiabilities: number;
  receivablesDoubtful: number;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  kind: "individual",
  country: "SA",
  madhab: "mixed",
  hawlDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  cash: 0,
  gold: 0,
  investments: 0,
  inventory: 0,
  receivables: 0,
  debts: 0,
  bankAccounts: 0,
  savingsBonds: 0,
  cryptoValue: 0,
  goldGrams: 0,
  goldKarat: 21,
  silverGrams: 0,
  jewelryPersonal: 0,
  stocksTrading: 0,
  stocksLongTerm: 0,
  mutualFunds: 0,
  sukuk: 0,
  esopVestedValue: 0,
  bills: 0,
  rikazMetals: 0,
  realEstateTrading: 0,
  realEstateRental: 0,
  rentalIncomeAnnual: 0,
  agricultureType: "none",
  agricultureValue: 0,
  livestockCamels: 0,
  livestockCattle: 0,
  livestockSheep: 0,
  salaryMonthly: 0,
  endOfServiceBenefits: 0,
  businessAssets: 0,
  businessLiabilities: 0,
  receivablesDoubtful: 0,
  notes: "",
};

function ClientIntakePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ReportMode>("quick");
  const [signedIn, setSignedIn] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState<null | ReportMode>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  const DRAFT_KEY = "client_intake_draft_v1";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.form) {
          setForm(parsed.form);
          setDraftSavedAt(parsed.at || null);
        }
      }
    } catch {}
  }, []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const saveDraft = () => {
    const at = new Date().toISOString();
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, at }));
      setDraftSavedAt(at);
      toast.success("تم حفظ المسودة");
    } catch {
      toast.error("تعذر حفظ المسودة");
    }
  };
  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setDraftSavedAt(null);
    setForm(emptyForm);
    toast.info("تم مسح المسودة");
  };

  const progress = useMemo(() => {
    const required: Array<keyof FormState> = ["name", "email", "country", "hawlDate"];
    const requiredDone = required.filter((k) => String(form[k] ?? "").trim().length > 0).length;
    const numericKeys: Array<keyof FormState> = [
      "cash",
      "bankAccounts",
      "gold",
      "goldGrams",
      "silverGrams",
      "investments",
      "stocksTrading",
      "stocksLongTerm",
      "mutualFunds",
      "sukuk",
      "realEstateTrading",
      "realEstateRental",
      "agricultureValue",
      "livestockCamels",
      "livestockCattle",
      "livestockSheep",
      "salaryMonthly",
      "inventory",
      "businessAssets",
      "receivables",
    ];
    const anyValue = numericKeys.some((k) => Number(form[k]) > 0) ? 1 : 0;
    const total = required.length + 1;
    return Math.round(((requiredDone + anyValue) / total) * 100);
  }, [form]);

  const submittedAtRef = useRef<number>(Date.now());
  const honeypotRef = useRef<HTMLInputElement>(null);

  const intakeSchema = z.object({
    name: z.string().trim().min(2, "الاسم يجب ألا يقلّ عن حرفين").max(100, "الاسم طويل جداً"),
    email: z.string().trim().email("بريد إلكتروني غير صالح").max(255),
    phone: z.string().trim().max(20, "رقم الجوال طويل جداً").optional().or(z.literal("")),
    notes: z.string().max(2000, "الملاحظات طويلة جداً").optional().or(z.literal("")),
    hawlDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح"),
  });

  const submit = async () => {
    // honeypot: bots fill hidden field
    if (honeypotRef.current?.value) {
      toast.error("تعذّر الإرسال");
      return;
    }
    // rate: at least 2 seconds since form open
    if (Date.now() - submittedAtRef.current < 2000) {
      toast.error("انتظر لحظة قبل الإرسال");
      return;
    }
    const parsed = intakeSchema.safeParse({
      name: form.name,
      email: form.email,
      phone: form.phone,
      notes: form.notes,
      hawlDate: form.hawlDate,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message || "بيانات غير صالحة");
    // التفاصيل الكاملة تُحفظ بنيوياً، والتجميع الفقهي الصحيح يستبعد ما لا يصح
    // ضمه بمعدل 2.5% (أسهم طويلة الأجل، دخل إيجار، زروع، أنعام...) مع أعلام مراجعة
    const details: IntakeDetails = {
      mode,
      phone: form.phone || undefined,
      cash: form.cash,
      bankAccounts: form.bankAccounts,
      savingsBonds: form.savingsBonds,
      cryptoValue: form.cryptoValue,
      gold: form.gold,
      goldGrams: form.goldGrams,
      goldKarat: form.goldKarat,
      silverGrams: form.silverGrams,
      jewelryPersonal: form.jewelryPersonal,
      investments: form.investments,
      stocksTrading: form.stocksTrading,
      stocksLongTerm: form.stocksLongTerm,
      mutualFunds: form.mutualFunds,
      sukuk: form.sukuk,
      realEstateTrading: form.realEstateTrading,
      realEstateRental: form.realEstateRental,
      rentalIncomeAnnual: form.rentalIncomeAnnual,
      agricultureType: form.agricultureType,
      agricultureValue: form.agricultureValue,
      livestockCamels: form.livestockCamels,
      livestockCattle: form.livestockCattle,
      livestockSheep: form.livestockSheep,
      salaryMonthly: form.salaryMonthly,
      endOfServiceBenefits: form.endOfServiceBenefits,
      inventory: form.inventory,
      businessAssets: form.businessAssets,
      businessLiabilities: form.businessLiabilities,
      receivables: form.receivables,
      receivablesDoubtful: form.receivablesDoubtful,
      debts: form.debts,
      esopVestedValue: form.esopVestedValue,
      bills: form.bills,
      rikazMetals: form.rikazMetals,
      notes: form.notes,
    };
    const { breakdown } = aggregateIntake(details);

    const notesExtras =
      mode === "comprehensive"
        ? [
            `ذهب: ${form.goldGrams} جم — فضة: ${form.silverGrams} جم — حلي شخصي: ${form.jewelryPersonal}`,
            `أوراق تجارية (كمبيالات/شيكات): ${form.bills}`,
            `ESOP (خيارات أسهم مستحقة): ${form.esopVestedValue}`,
            `ركاز/معادن مكتشفة: ${form.rikazMetals}`,
            `عقار إيجاري: ${form.realEstateRental} — دخل إيجاري سنوي: ${form.rentalIncomeAnnual}`,
            `زراعة: ${form.agricultureType} بقيمة ${form.agricultureValue}`,
            `أنعام — إبل: ${form.livestockCamels} · بقر: ${form.livestockCattle} · غنم: ${form.livestockSheep}`,
            `راتب شهري: ${form.salaryMonthly} — مكافأة نهاية خدمة: ${form.endOfServiceBenefits}`,
            `ديون مشكوك في تحصيلها: ${form.receivablesDoubtful}`,
            form.notes,
          ]
            .filter(Boolean)
            .join(" \n ")
        : form.notes;

    const payload = {
      name: form.name,
      email: form.email,
      kind: form.kind,
      country: form.country,
      madhab: form.madhab,
      hawlDate: form.hawlDate,
      breakdown,
      notes: `[${mode === "comprehensive" ? "تقرير شامل معتمد" : "حساب سريع"}] ${notesExtras}`,
      createdVia: "intake" as const,
      // نسخة كاملة من كل حقول النموذج ليطّلع عليها المحاسب بلا إعادة إدخال
      intakeDetails: { mode, ...form },
    };

    // إذا كان المستخدم مسجّل الدخول: احفظ في Lovable Cloud مباشرة
    const { data: userRes } = await supabase.auth.getUser();
    if (userRes.user) {
      try {
        await createAccountantClient(payload);
      } catch (e) {
        toast.error("تعذّر الحفظ في السحابة", { description: (e as Error).message });
        return;
      }
    } else {
      // لا يوجد جلسة — احفظ الطلب محلياً كمسودة استلام حتى يستوردها المحاسب
      try {
        const key = "public_intake_queue_v1";
        const raw = localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        list.push({ ...payload, at: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(list));
      } catch {}
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setDraftSavedAt(null);
    setSubmitted(mode);
    toast.success(
      mode === "comprehensive" ? "تم إرسال طلب التقرير الشامل" : "تم إرسال بياناتك للمحاسب",
    );

    // إرسال بريد تأكيد للعميل عبر Edge Function
    if (form.email) {
      supabase.functions
        .invoke("send-report-email", {
          body: {
            to: form.email,
            clientName: form.name,
            zakatDue: 0,
            currency: "SAR",
            reportId: `INTAKE-${Date.now()}`,
            gregorianDate: new Date().toLocaleDateString("ar-SA"),
            accountantName: undefined,
          },
        })
        .catch(() => {});
    }
  };

  if (submitted) {
    const isComp = submitted === "comprehensive";
    return (
      <main className="container mx-auto max-w-2xl px-4 py-16 text-center space-y-4" dir="rtl">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
        <h1 className="text-3xl font-bold">تم استلام بياناتك بنجاح</h1>
        <p className="text-muted-foreground leading-relaxed">
          {isComp
            ? "طلب تقرير الزكاة الشامل قيد الإعداد من محاسب مرخّص."
            : "بياناتك بين يدي المحاسب المعتمد للمراجعة."}
          <br />
          سيصلك التقرير الرسمي على بريدك <b>خلال يومَي عمل</b> بحد أقصى.
        </p>
        <div className="rounded-lg border bg-primary/5 p-4 text-sm text-end space-y-2">
          <div className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> ما التالي؟
          </div>
          <ol className="list-decimal pe-6 space-y-1 text-muted-foreground">
            <li>يستلم المحاسب المعتمد بياناتك خلال دقائق.</li>
            <li>مراجعة وتصنيف الأصول والالتزامات وفق المعايير الشرعية.</li>
            {isComp && (
              <li>احتساب زكاة كل نوع من الأصول (نقد، ذهب، أسهم، عقار، زراعة، أنعام، تجارة).</li>
            )}
            <li>يصلك تقرير PDF مختوم برقم مرجعي قابل للتحقق.</li>
          </ol>
        </div>
        <div className="flex justify-center gap-2 pt-2">
          <Button asChild variant="outline">
            <Link to="/">العودة للرئيسية</Link>
          </Button>
          <Button
            onClick={() => {
              setSubmitted(null);
              setForm(emptyForm);
            }}
          >
            إرسال حساب آخر
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6" dir="rtl">
      <section className="relative rounded-2xl bg-gradient-to-l from-primary/15 via-primary/5 to-background border p-8 md:p-12 space-y-4">
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" /> نافذة العميل
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight">
          احسب زكاتك بدقة شرعية — أو اطلب تقريراً شاملاً معتمداً
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          نموذج بسيط لحساب سريع، أو نموذج متكامل مشتق من زكاة الأفراد يشمل كل الأصول والالتزامات
          ويُصدر تقرير PDF مختوم برقم مرجعي قابل للتحقق.
        </p>
        <div className="flex flex-wrap gap-2">
          <FeatureChip icon={<Shield className="h-3.5 w-3.5" />} text="بيانات مشفّرة" />
          <FeatureChip icon={<CheckCircle2 className="h-3.5 w-3.5" />} text="محاسب معتمد" />
          <FeatureChip icon={<Users className="h-3.5 w-3.5" />} text="أفراد وشركات ومؤسسات" />
        </div>
      </section>

      {/* مزايا التقرير المعتمد */}
      <section className="grid md:grid-cols-3 gap-3">
        <BenefitCard
          icon={<Award className="h-5 w-5" />}
          title="اعتماد شرعي ومحاسبي"
          text="مراجعة من محاسب مرخّص وفق معايير AAOIFI 35 والاتحاد الدولي لعلماء المسلمين."
        />
        <BenefitCard
          icon={<Stamp className="h-5 w-5" />}
          title="PDF مختوم برقم مرجعي"
          text="تقرير رسمي بختم رقمي ورقم تحقق يمكن مشاركته مع الجهات المصرفية والزكوية."
        />
        <BenefitCard
          icon={<Scale className="h-5 w-5" />}
          title="تصنيف كل الأصول"
          text="زكاة النقد، الذهب، الأسهم، العقار، الزروع، الأنعام، عروض التجارة — كل صنف بحسابه الفقهي."
        />
        <BenefitCard
          icon={<FileCheck2 className="h-5 w-5" />}
          title="مصفوفة الامتثال"
          text="تحقق تلقائي من اكتمال البيانات وتنبيه لأي نقص قبل إصدار التقرير."
        />
        <BenefitCard
          icon={<Landmark className="h-5 w-5" />}
          title="مقارنة المذاهب"
          text="عرض احتمالات الحساب على المذاهب الأربعة والفتوى المختارة مع دليلها."
        />
        <BenefitCard
          icon={<Sparkles className="h-5 w-5" />}
          title="تسليم خلال يومَي عمل"
          text="التزام SLA مع تذكير آلي بموعد الحول القادم لتجديد الحساب."
        />
      </section>

      {!signedIn && (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
            <span>لحفظ حساباتك ومتابعتها لاحقاً، سجّل الدخول (اختياري).</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSignedIn(true)}>
                متابعة بدون تسجيل
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth">تسجيل دخول</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* اختيار نوع النموذج */}
      {/* شريط تقدّم + حفظ مسودة */}
      <Card>
        <CardContent className="py-4 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-semibold">
              اكتمال النموذج: <span className="text-primary">{progress}%</span>
            </div>
            <div className="flex items-center gap-2">
              {draftSavedAt && (
                <span className="text-[11px] text-muted-foreground">
                  آخر حفظ: {new Date(draftSavedAt).toLocaleString("ar-EG")}
                </span>
              )}
              <Button size="sm" variant="outline" onClick={saveDraft} className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> حفظ مسودة
              </Button>
              {draftSavedAt && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearDraft}
                  className="gap-1.5 text-destructive"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> مسح
                </Button>
              )}
            </div>
          </div>
          <Progress value={progress} />
          <p className="text-[11px] text-muted-foreground">
            تُحفظ المسودة محلياً في متصفحك ولا تُرسل إلا عند الضغط على زر الإرسال.
          </p>
        </CardContent>
      </Card>

      {/* اختيار نوع النموذج */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as ReportMode)}>
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="quick" className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> حساب سريع
          </TabsTrigger>
          <TabsTrigger value="comprehensive" className="gap-1.5">
            <Award className="h-3.5 w-3.5" /> تقرير شامل معتمد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-4 mt-4">
          <BasicInfoCard form={form} set={set} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">الأصول والالتزامات (مختصر)</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <NumField label="نقد وأرصدة بنكية" v={form.cash} on={(v) => set("cash", v)} />
              <NumField label="ذهب/فضة (بالقيمة)" v={form.gold} on={(v) => set("gold", v)} />
              <NumField
                label="أسهم واستثمارات"
                v={form.investments}
                on={(v) => set("investments", v)}
              />
              <NumField
                label="عروض تجارة/مخزون"
                v={form.inventory}
                on={(v) => set("inventory", v)}
              />
              <NumField
                label="ديون مستحقة لك"
                v={form.receivables}
                on={(v) => set("receivables", v)}
              />
              <NumField label="ديون عليك" v={form.debts} on={(v) => set("debts", v)} />
              <div className="md:col-span-2">
                <Field label="ملاحظات">
                  <Textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-4 mt-4">
          <Alert className="border-primary/40 bg-primary/5">
            <AlertDescription className="text-sm">
              <b>النموذج الشامل</b> مشتق من تبويب زكاة الأفراد المتقدّم ويغطي جميع أصناف المال
              الزكوية. أدخل ما ينطبق عليك فقط — واترك الباقي صفراً.
            </AlertDescription>
          </Alert>
          <BasicInfoCard form={form} set={set} />

          <SectionCard title="1) النقد والأصول السائلة" icon={<Coins className="h-4 w-4" />}>
            <NumField label="نقد باليد" v={form.cash} on={(v) => set("cash", v)} />
            <NumField
              label="أرصدة بنكية (جاري/توفير)"
              v={form.bankAccounts}
              on={(v) => set("bankAccounts", v)}
            />
            <NumField
              label="صكوك ادخارية/شهادات"
              v={form.savingsBonds}
              on={(v) => set("savingsBonds", v)}
            />
            <NumField
              label="عملات رقمية (بالقيمة)"
              v={form.cryptoValue}
              on={(v) => set("cryptoValue", v)}
            />
          </SectionCard>

          <SectionCard title="2) الذهب والفضة" icon={<Coins className="h-4 w-4" />}>
            <NumField
              label="ذهب — الوزن بالجرام"
              v={form.goldGrams}
              on={(v) => set("goldGrams", v)}
            />
            <Field label="عيار الذهب الغالب">
              <Select
                value={String(form.goldKarat)}
                onValueChange={(v) => set("goldKarat", Number(v) as 18 | 21 | 24)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="18">عيار 18</SelectItem>
                  <SelectItem value="21">عيار 21 (الأكثر شيوعاً)</SelectItem>
                  <SelectItem value="24">عيار 24 (سبائك)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <NumField
              label="فضة — الوزن بالجرام"
              v={form.silverGrams}
              on={(v) => set("silverGrams", v)}
            />
            <NumField
              label="حلي شخصي (بالقيمة)"
              v={form.jewelryPersonal}
              on={(v) => set("jewelryPersonal", v)}
            />
            <NumField label="ذهب/فضة أخرى (بالقيمة)" v={form.gold} on={(v) => set("gold", v)} />
          </SectionCard>

          <SectionCard
            title="3) الاستثمارات والأوراق المالية"
            icon={<Briefcase className="h-4 w-4" />}
          >
            <NumField
              label="أسهم للمتاجرة"
              v={form.stocksTrading}
              on={(v) => set("stocksTrading", v)}
            />
            <NumField
              label="أسهم طويلة الأجل (زكاة على المتداول)"
              v={form.stocksLongTerm}
              on={(v) => set("stocksLongTerm", v)}
            />
            <NumField
              label="صناديق استثمارية"
              v={form.mutualFunds}
              on={(v) => set("mutualFunds", v)}
            />
            <NumField label="صكوك" v={form.sukuk} on={(v) => set("sukuk", v)} />
            <NumField
              label="خيارات أسهم موظفين (ESOP) — الوَجَبات المستحقة"
              v={form.esopVestedValue}
              on={(v) => set("esopVestedValue", v)}
            />
          </SectionCard>

          <SectionCard
            title="4) الأوراق التجارية (كمبيالات وشيكات)"
            icon={<FileCheck2 className="h-4 w-4" />}
          >
            <NumField
              label="كمبيالات/شيكات/أوراق قبض محققة الأداء"
              v={form.bills}
              on={(v) => set("bills", v)}
            />
          </SectionCard>

          <SectionCard title="5) العقارات" icon={<Home className="h-4 w-4" />}>
            <NumField
              label="عقار للمتاجرة"
              v={form.realEstateTrading}
              on={(v) => set("realEstateTrading", v)}
            />
            <NumField
              label="عقار مؤجَّر (قيمة الأصل)"
              v={form.realEstateRental}
              on={(v) => set("realEstateRental", v)}
            />
            <NumField
              label="دخل الإيجار السنوي"
              v={form.rentalIncomeAnnual}
              on={(v) => set("rentalIncomeAnnual", v)}
            />
          </SectionCard>

          <SectionCard title="6) الزروع والثمار" icon={<Wheat className="h-4 w-4" />}>
            <Field label="نوع الري">
              <Select
                value={form.agricultureType}
                onValueChange={(v) => set("agricultureType", v as FormState["agricultureType"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">لا يوجد</SelectItem>
                  <SelectItem value="rainfed">بعل/سماوي (10%)</SelectItem>
                  <SelectItem value="irrigated">مروي بكلفة (5%)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <NumField
              label="قيمة المحصول"
              v={form.agricultureValue}
              on={(v) => set("agricultureValue", v)}
            />
          </SectionCard>

          <SectionCard title="7) الأنعام (بالعدد)" icon={<Landmark className="h-4 w-4" />}>
            <NumField label="إبل" v={form.livestockCamels} on={(v) => set("livestockCamels", v)} />
            <NumField label="بقر" v={form.livestockCattle} on={(v) => set("livestockCattle", v)} />
            <NumField label="غنم" v={form.livestockSheep} on={(v) => set("livestockSheep", v)} />
          </SectionCard>

          <SectionCard title="8) الركاز والمعادن المكتشفة" icon={<Coins className="h-4 w-4" />}>
            <NumField
              label="قيمة الركاز/المعادن (الزكاة 20% أو حسب رأي المحاسب)"
              v={form.rikazMetals}
              on={(v) => set("rikazMetals", v)}
            />
          </SectionCard>

          <SectionCard title="9) الرواتب والمكافآت" icon={<Briefcase className="h-4 w-4" />}>
            <NumField
              label="راتب شهري"
              v={form.salaryMonthly}
              on={(v) => set("salaryMonthly", v)}
            />
            <NumField
              label="مكافأة نهاية خدمة مقبوضة"
              v={form.endOfServiceBenefits}
              on={(v) => set("endOfServiceBenefits", v)}
            />
          </SectionCard>

          <SectionCard title="10) نشاط تجاري/مؤسسة" icon={<Building2 className="h-4 w-4" />}>
            <NumField label="عروض تجارة/مخزون" v={form.inventory} on={(v) => set("inventory", v)} />
            <NumField
              label="أصول تشغيلية زكوية"
              v={form.businessAssets}
              on={(v) => set("businessAssets", v)}
            />
            <NumField
              label="التزامات قصيرة الأجل"
              v={form.businessLiabilities}
              on={(v) => set("businessLiabilities", v)}
            />
          </SectionCard>

          <SectionCard title="11) الديون" icon={<Scale className="h-4 w-4" />}>
            <NumField
              label="ديون مستحقة لك (مرجوّة)"
              v={form.receivables}
              on={(v) => set("receivables", v)}
            />
            <NumField
              label="ديون مشكوك في تحصيلها (تُزكَّى عند القبض)"
              v={form.receivablesDoubtful}
              on={(v) => set("receivablesDoubtful", v)}
            />
            <NumField label="ديون عليك (قصيرة الأجل)" v={form.debts} on={(v) => set("debts", v)} />
          </SectionCard>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ملاحظات ومرفقات للمحاسب</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="أي تفاصيل إضافية أو اشتراطات فقهية معينة، وموعد الحول الهجري..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* honeypot — invisible to real users, catches bots */}
      <input
        ref={honeypotRef}
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }}
      />

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={() => navigate({ to: "/" })} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> إلغاء
        </Button>
        <Button size="lg" onClick={() => void submit()} className="gap-1.5">
          <Send className="h-4 w-4" />{" "}
          {mode === "comprehensive" ? "طلب التقرير الشامل" : "إرسال إلى المحاسب"}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        بإرسالك النموذج فأنت توافق على مشاركة بياناتك مع المحاسب/الشركة المعتمدين لغرض احتساب الزكاة
        فقط.
      </p>
    </main>
  );
}

function BasicInfoCard({
  form,
  set,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">بياناتك الأساسية</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <Field label="الاسم الكامل *">
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="محمد بن عبدالله"
          />
        </Field>
        <Field label="البريد الإلكتروني *">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            dir="ltr"
          />
        </Field>
        <Field label="رقم الجوال">
          <Input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            dir="ltr"
            placeholder="+9665..."
          />
        </Field>
        <Field label="تاريخ الحول">
          <Input
            type="date"
            value={form.hawlDate}
            onChange={(e) => set("hawlDate", e.target.value)}
          />
        </Field>
        <Field label="نوع الحساب">
          <Select value={form.kind} onValueChange={(v) => set("kind", v as ClientKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">فرد</SelectItem>
              <SelectItem value="company">شركة</SelectItem>
              <SelectItem value="institution">مؤسسة</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="الدولة">
          <Select value={form.country} onValueChange={(v) => set("country", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(COUNTRY_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">{children}</CardContent>
    </Card>
  );
}

function BenefitCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{text}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function NumField({ label, v, on }: { label: string; v: number; on: (v: number) => void }) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={v || ""}
        onChange={(e) => on(Number(e.target.value) || 0)}
        dir="ltr"
        style={{ textAlign: "right" }}
      />
    </Field>
  );
}

function FeatureChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 border text-xs">
      {icon}
      {text}
    </div>
  );
}
