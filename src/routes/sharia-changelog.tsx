import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, ArrowRight, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { FATWA_REGISTRY } from "@/lib/fatwaEngine";

export const Route = createFileRoute("/sharia-changelog")({
  head: () => ({
    meta: [
      { title: "سجل تحديث الفتاوى | نِصاب" },
      {
        name: "description",
        content:
          "سجل علني موثَّق لكل إضافة أو تعديل أو نسخ لأي فتوى في محرك الفتاوى الشرعية بمنصة نِصاب، مع التاريخ والمصدر.",
      },
      { property: "og:title", content: "سجل تحديث الفتاوى — Sharia Change Log" },
      {
        property: "og:description",
        content: "شفافية كاملة في إدارة الفتاوى الشرعية على منصة نِصاب.",
      },
    ],
  }),
  component: ShariaChangelogPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">{(error as Error).message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">الصفحة غير موجودة</div>,
});

type ChangeEntry = {
  version: string;
  date: string;
  kind: "added" | "updated" | "superseded";
  title: string;
  description: string;
  refs?: string[];
};

const CHANGE_LOG: ChangeEntry[] = [
  {
    version: "v1.4.0",
    date: "2026-07-09",
    kind: "added",
    title: "توسعة كبرى: 35 قاعدة فتوى جديدة",
    description:
      "إضافة تغطية شرعية موسّعة لـ: الملكية الفكرية، أسماء النطاقات، تطوير عقاري، REITs الشرعية، نماذج البنوك الإسلامية والتكافل، الشركات الناشئة، الصكوك (مضاربة/مرابحة)، ETF إسلامية، مشتقّات (Options/Futures)، تعدين وStaking وDeFi، ESOP/RSU (مستحقّ وغير مستحقّ)، ثروة سمكية ودواجن وعسل وألبان، ومكافأة نهاية الخدمة، وذمم مشكوك فيها.",
    refs: [
      "AAOIFI-17",
      "AAOIFI-21",
      "AAOIFI-26",
      "AAOIFI-33",
      "AAOIFI-35",
      "AAOIFI-42",
      "AAOIFI-59",
      "قرارات مجمع الفقه الإسلامي",
    ],
  },
  {
    version: "v1.3.0",
    date: "2026-06-15",
    kind: "added",
    title: "دمج محرك قواعد الفتاوى متعدد الأبعاد",
    description:
      "إطلاق fatwaEngine.ts الذي يستعلم الفتاوى بثلاثة أبعاد: (Jurisdiction × Authority × Madhab) مع خوارزمية ترجيح تُقدِّم الهيئة الوطنية ثم AAOIFI ثم مجمع الفقه الدولي.",
  },
  {
    version: "v1.2.0",
    date: "2026-05-20",
    kind: "added",
    title: "فتاوى العملات الرقمية (Bitcoin, USDC, NFT)",
    description:
      "إدراج الحكم الأصلي لـ AAOIFI-59 مع الخلاف بين دار الإفتاء المصرية (تحريم) والمجمع الفقهي الإسلامي (توقّف).",
    refs: ["AAOIFI-59", "دار الإفتاء المصرية 2018", "MWL 2019"],
  },
  {
    version: "v1.1.0",
    date: "2026-04-10",
    kind: "added",
    title: "دعم صناديق التقاعد (401k / Voluntary / Mandatory)",
    description:
      "التفريق بين الاشتراكات الاختيارية القابلة للسحب (تُزكّى) والاقتطاعات الإلزامية الحكومية (لا تُزكّى حتى القبض) استناداً لقرار مجمع الفقه 143.",
    refs: ["AAOIFI-35 §2/1/6", "قرار 143 (16/9) مجمع الفقه"],
  },
  {
    version: "v1.0.0",
    date: "2026-03-01",
    kind: "added",
    title: "الإطلاق الأولي للسجل الشرعي",
    description:
      "تأسيس السجل بـ 20 قاعدة أساسية تغطي: النقد، الذهب/الفضة (بمذاهب متعددة)، الأسهم، الصكوك، السندات، عروض التجارة، الأنعام، الزروع، الديون، والحُلي.",
  },
];

function kindMeta(kind: ChangeEntry["kind"]) {
  switch (kind) {
    case "added":
      return {
        label: "إضافة",
        icon: Plus,
        className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
      };
    case "updated":
      return {
        label: "تحديث",
        icon: RefreshCw,
        className: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      };
    case "superseded":
      return {
        label: "نسخ",
        icon: AlertTriangle,
        className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      };
  }
}

function ShariaChangelogPage() {
  const totalRules = FATWA_REGISTRY.length;
  const uniqueTopics = new Set(FATWA_REGISTRY.map((r) => r.topic)).size;
  const uniqueAuthorities = new Set(FATWA_REGISTRY.map((r) => r.authority)).size;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 space-y-6" dir="rtl">
      <header className="text-center space-y-3">
        <Badge className="bg-primary/10 text-primary border-primary/20">Sharia Change Log</Badge>
        <h1 className="text-3xl md:text-4xl font-bold flex items-center justify-center gap-2">
          <History className="h-7 w-7 text-primary" /> سجل تحديث الفتاوى
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          سجلّ علني وموثَّق لكل إضافة أو تعديل أو نسخ لأي فتوى في محرّك الفتاوى الشرعية بمنصة نِصاب.
          التزاماً بأعلى معايير الشفافية والحوكمة الشرعية.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-primary">{totalRules}</div>
            <div className="text-xs text-muted-foreground">قاعدة فتوى فعّالة</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-primary">{uniqueTopics}</div>
            <div className="text-xs text-muted-foreground">موضوع مُغطَّى</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-primary">{uniqueAuthorities}</div>
            <div className="text-xs text-muted-foreground">هيئة شرعية مرجعية</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {CHANGE_LOG.map((e) => {
          const meta = kindMeta(e.kind);
          const Icon = meta.icon;
          return (
            <Card key={e.version} className="shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono">
                    {e.version}
                  </Badge>
                  <Badge className={meta.className}>
                    <Icon className="h-3 w-3 ms-1" />
                    {meta.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground me-auto">{e.date}</span>
                </div>
                <CardTitle className="text-base mt-2">{e.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed space-y-2">
                <p>{e.description}</p>
                {e.refs && (
                  <div className="flex gap-1 flex-wrap pt-1 border-t border-border">
                    {e.refs.map((r) => (
                      <Badge key={r} variant="secondary" className="text-[10px] font-normal">
                        {r}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-soft bg-muted/30">
        <CardContent className="pt-5 text-xs text-muted-foreground text-center space-y-2">
          <p>
            للاطّلاع على منهجية إضافة الفتاوى وقائمة الهيئات المعتمدة، راجع{" "}
            <Link to="/governance" className="text-primary underline">
              ميثاق الحوكمة
            </Link>
            .
          </p>
          <p>
            للإبلاغ عن خطأ فقهي أو اقتراح تعديل:{" "}
            <a href="mailto:sharia@nisab.app" className="text-primary underline">
              sharia@nisab.app
            </a>
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 justify-center pt-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/governance">
            ميثاق الحوكمة <ArrowRight className="h-4 w-4 me-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
