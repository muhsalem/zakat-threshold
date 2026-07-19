import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlaskConical, Copy, Info } from "lucide-react";
import { toast } from "sonner";

type Row = { label: string; value: string; hint?: string };
type Section = { title: string; rows: Row[] };
type Scenario = {
  id: string;
  name: string;
  tagline: string;
  profile: string;
  sections: Section[];
};

/**
 * سيناريوهات بيانات وهمية لأفراد لاختبار الحاسبة الشاملة.
 * الترتيب داخل كل سيناريو مطابق لطلب المستخدم:
 *   1) الذهب والفضة   2) النقد والبنوك   3) الأسهم والصكوك   4) الديون
 * القيم افتراضية للاختبار — أرقام قابلة للنسخ مباشرة إلى الحقول.
 */
const SCENARIOS: Scenario[] = [
  {
    id: "starter",
    name: "الملف ١ — موظّف بسيط",
    tagline: "حيازات صغيرة تختبر عبور النصاب بالفضة قبل الذهب",
    profile: "موظف عمره ٣٠ سنة، حلي زوجية بسيط + ادخار محدود + بدون أسهم.",
    sections: [
      {
        title: "١) الذهب والفضة",
        rows: [
          { label: "سبائك ذهب عيار 24 (جم)", value: "20" },
          { label: "حلي ذهب عيار 21 (جم)", value: "40", hint: "زينة" },
          { label: "فضة عيار 925 (جم)", value: "300" },
        ],
      },
      {
        title: "٢) النقد والبنوك",
        rows: [
          { label: "نقد بالمنزل", value: "3000" },
          { label: "حساب جاري", value: "12000" },
          { label: "حساب توفير", value: "8000" },
        ],
      },
      {
        title: "٣) الأسهم والصكوك",
        rows: [{ label: "لا يوجد", value: "0" }],
      },
      {
        title: "٤) الديون",
        rows: [
          { label: "قسط سيارة متبقّي (شهري)", value: "1500", hint: "دَين مؤجَّل" },
          { label: "أشهر متبقية", value: "18" },
        ],
      },
    ],
  },
  {
    id: "mid",
    name: "الملف ٢ — مدّخِر متوسط",
    tagline: "خليط نقد وأسهم استثمارية وحلي — يعبر النصاب بوضوح",
    profile: "مهني ٤٠ سنة، محفظة أسهم طويلة الأجل + صكوك قصيرة + قرض إسكاني.",
    sections: [
      {
        title: "١) الذهب والفضة",
        rows: [
          { label: "سبائك ذهب عيار 24 (جم)", value: "80" },
          { label: "جنيهات ذهبية كاملة (قطعة)", value: "5", hint: "8.5 جم عيار 21" },
          { label: "حلي ذهب عيار 18 (جم)", value: "60" },
          { label: "فضة عيار 999 (جم)", value: "500" },
        ],
      },
      {
        title: "٢) النقد والبنوك",
        rows: [
          { label: "حساب جاري (SAR)", value: "45000" },
          { label: "حساب توفير (SAR)", value: "60000" },
          { label: "محفظة نقدية إلكترونية", value: "5000" },
        ],
      },
      {
        title: "٣) الأسهم والصكوك",
        rows: [
          {
            label: "أسهم للاستثمار طويل الأجل",
            value: "120000",
            hint: "زكاة على الأرباح والقيمة النقدية للسهم",
          },
          {
            label: "أسهم للمضاربة (قصيرة الأجل)",
            value: "30000",
            hint: "زكاة على القيمة السوقية كاملة",
          },
          { label: "صكوك مرابحة/إجارة", value: "50000" },
          { label: "توزيعات نقدية مقبوضة", value: "6000" },
        ],
      },
      {
        title: "٤) الديون",
        rows: [
          { label: "قرض إسكاني — قسط شهري", value: "4500" },
          { label: "أشهر متبقية", value: "120", hint: "يُخصم قسط سنة واحدة فقط" },
          { label: "بطاقة ائتمان مستحقة الآن", value: "3200", hint: "دَين حالّ يُخصم كاملاً" },
        ],
      },
    ],
  },
  {
    id: "pro",
    name: "الملف ٣ — مستثمر شامل",
    tagline: "أصول متنوّعة تختبر كل الأقسام معاً",
    profile: "رجل أعمال، حلي ثمينة + استثمارات + عقار تجاري + صكوك + ذهب مادي.",
    sections: [
      {
        title: "١) الذهب والفضة",
        rows: [
          { label: "سبائك ذهب عيار 24 (جم)", value: "250" },
          { label: "أوقية ذهب استثماري", value: "5", hint: "≈ 31.1 جم لكل أوقية" },
          { label: "حلي ذهب عيار 22 (جم)", value: "180" },
          { label: "حلي مكسور بحاجة صيانة عيار 21 (جم)", value: "40" },
          { label: "فضة عيار 925 (جم)", value: "1200" },
          { label: "ليرة عثمانية (قطعة)", value: "10" },
        ],
      },
      {
        title: "٢) النقد والبنوك",
        rows: [
          { label: "حساب جاري", value: "150000" },
          { label: "حساب توفير", value: "220000" },
          { label: "ودائع لأجل", value: "300000" },
          { label: "عملات أجنبية (بعد التحويل)", value: "40000" },
        ],
      },
      {
        title: "٣) الأسهم والصكوك",
        rows: [
          { label: "أسهم استثمار طويل الأجل", value: "500000" },
          { label: "أسهم مضاربة قصيرة", value: "180000" },
          { label: "صكوك سيادية", value: "220000" },
          { label: "صناديق مؤشرات شرعية", value: "150000" },
          { label: "أرباح موزعة مقبوضة", value: "24000" },
          { label: "منح ESOP/RSU مُستحقّة", value: "90000" },
        ],
      },
      {
        title: "٤) الديون",
        rows: [
          { label: "قرض عقار تجاري — قسط شهري", value: "18000" },
          { label: "أشهر متبقية", value: "60" },
          { label: "دَين مورّد مستحق الآن", value: "45000", hint: "حالّ يُخصم كاملاً" },
          { label: "دَين مستبعد بقرار المستخدم", value: "20000", hint: "لن يُخصم من الوعاء" },
        ],
      },
    ],
  },
];

function copy(value: string) {
  navigator.clipboard.writeText(value).then(
    () => toast.success("نُسخت القيمة", { description: value }),
    () => toast.error("تعذّرت النسخ"),
  );
}

export function DemoScenariosGuide({ currency = "SAR" }: { currency?: string }) {
  const [openId, setOpenId] = useState<string>("");
  return (
    <Card className="shadow-soft border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-5 w-5 text-primary" />
          سيناريوهات بيانات وهمية للاختبار
          <Badge variant="outline" className="ms-2 text-[10px]">
            اختياري
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-primary/20 bg-background">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed text-end">
            كل سيناريو يعرض القيم بالترتيب: <b>الذهب والفضة</b> ← <b>النقد والبنوك</b> ←{" "}
            <b>الأسهم والصكوك</b> ← <b>الديون</b>. المبالغ افتراضية للاختبار بعملة <b>{currency}</b>{" "}
            — انسخها للحقل المقابل داخل الأكورديون.
          </AlertDescription>
        </Alert>

        <div className="grid sm:grid-cols-3 gap-2">
          {SCENARIOS.map((s) => (
            <Button
              key={s.id}
              type="button"
              variant={openId === s.id ? "default" : "outline"}
              size="sm"
              className="justify-start h-auto py-2 text-start"
              onClick={() => setOpenId(openId === s.id ? "" : s.id)}
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-semibold">{s.name}</span>
                <span className="text-[10px] opacity-80 font-normal">{s.tagline}</span>
              </div>
            </Button>
          ))}
        </div>

        {openId && (
          <Accordion
            type="multiple"
            defaultValue={SCENARIOS.find((s) => s.id === openId)!.sections.map(
              (_, i) => `sec-${i}`,
            )}
          >
            <div className="rounded-md border bg-background p-3 mb-2 text-xs text-muted-foreground">
              {SCENARIOS.find((s) => s.id === openId)!.profile}
            </div>
            {SCENARIOS.find((s) => s.id === openId)!.sections.map((sec, i) => (
              <AccordionItem
                key={i}
                value={`sec-${i}`}
                className="border rounded-md mb-2 px-3 bg-background"
              >
                <AccordionTrigger className="text-sm font-semibold hover:no-underline py-2">
                  {sec.title}
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="divide-y">
                    {sec.rows.map((r, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 py-1.5 text-xs"
                      >
                        <div className="flex flex-col text-start">
                          <span>{r.label}</span>
                          {r.hint && (
                            <span className="text-[10px] text-muted-foreground">{r.hint}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold" dir="ltr">
                            {r.value}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => copy(r.value)}
                            aria-label={`نسخ ${r.label}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

export default DemoScenariosGuide;
