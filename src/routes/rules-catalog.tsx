import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ShieldCheck, ShieldAlert, BookOpenCheck, Scale, AlertTriangle, Search } from "lucide-react";
import {
  ZAKAT_RULES,
  SHARIAH_SOURCES,
  RULES_CATALOG_VERSION,
  getActiveRules,
  getBlockedRules,
  getSource,
  validateCatalog,
  type ZakatRule,
  type ZakatStatus,
} from "@/lib/zakat/rules-catalog";

export const Route = createFileRoute("/rules-catalog")({
  head: () => ({
    meta: [
      { title: "كتالوج القواعد الشرعية | نِصاب" },
      {
        name: "description",
        content:
          "كل قاعدة زكوية تطبّقها المنصة، بمصدرها الموثّق ودرجة اعتمادها وإصدارها وتاريخ سريانها، مع عرض الأقوال المخالفة.",
      },
      { property: "og:title", content: "كتالوج القواعد الشرعية — نِصاب" },
      {
        property: "og:description",
        content: "شفافية كاملة: لا تُفعَّل قاعدة في المنصة إلا باعتماد موقّع ومصدر متحقَّق.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RulesCatalogPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">{(error as Error).message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">الصفحة غير موجودة</div>,
});

const STATUS_LABELS: Record<ZakatStatus, string> = {
  zakatable: "زكوي",
  exempt: "غير زكوي",
  conditional: "مشروط",
  deductible: "يُخصم",
};

const APPROVAL_LABELS: Record<ZakatRule["approval"], string> = {
  draft: "مسودة",
  under_review: "قيد المراجعة",
  approved: "معتمد",
  suspended: "موقوف",
};

function RuleCard({ rule, blockedReasons }: { rule: ZakatRule; blockedReasons?: string[] }) {
  const source = getSource(rule.sourceId);
  const blocked = Boolean(blockedReasons?.length);

  return (
    <AccordionItem value={rule.ruleId} className="border rounded-lg px-3">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex flex-1 flex-wrap items-center gap-2 text-right">
          {blocked ? (
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          ) : (
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <span className="text-sm font-semibold">{rule.name}</span>
          <Badge variant="outline" className="font-mono text-[10px]">
            {rule.ruleId}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {STATUS_LABELS[rule.zakatStatus]}
          </Badge>
          {rule.requiresHumanReview && (
            <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-600">
              يحتاج مراجعة بشرية
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-3 text-xs leading-relaxed">
        <p className="text-muted-foreground">{rule.description}</p>

        {blocked && (
          <Alert className="border-amber-500/40 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-[11px]">
              <span className="font-semibold">هذه القاعدة غير مفعّلة في الإنتاج:</span>
              <ul className="mt-1 list-disc pr-4">
                {blockedReasons!.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <Meta label="المصدر" value={source?.citation ?? rule.sourceId} />
          <Meta label="الإحالة" value={rule.reference} />
          <Meta label="المنهجية" value={rule.methodology} />
          <Meta label="المذهب" value={rule.madhab === "agreed" ? "محل اتفاق" : rule.madhab} />
          <Meta label="الاعتماد" value={APPROVAL_LABELS[rule.approval]} />
          <Meta label="الإصدار" value={rule.version} />
          <Meta label="تاريخ السريان" value={rule.effectiveDate} />
          <Meta label="تاريخ المراجعة" value={rule.reviewDate} />
          <Meta
            label="حالة المصدر"
            value={
              source?.verification === "verified"
                ? "متحقَّق منه"
                : source?.verification === "pending_verification"
                  ? "قيد التحقق"
                  : "مرفوض/غير مسجَّل"
            }
          />
          <Meta label="المراجع" value={rule.reviewer} />
        </div>

        {rule.exceptions.length > 0 && (
          <div>
            <div className="font-semibold">الاستثناءات</div>
            <ul className="mt-1 list-disc pr-4 text-muted-foreground">
              {rule.exceptions.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {rule.divergence && rule.divergence.length > 0 && (
          <div className="rounded border border-primary/30 bg-primary/5 p-2">
            <div className="flex items-center gap-1.5 font-semibold">
              <Scale className="h-3.5 w-3.5 text-primary" />
              الخلاف الفقهي المعتبر — يُعرض ولا يُخفى
            </div>
            <div className="mt-2 space-y-2">
              {rule.divergence.map((d) => (
                <div key={d.view} className="rounded border bg-background p-2">
                  <div className="font-semibold">{d.view}</div>
                  <div className="text-muted-foreground">
                    المنسوب إليه: {d.madhab} · {getSource(d.sourceId)?.citation ?? d.sourceId}
                  </div>
                  <div className="mt-1 text-primary/80">أثره على الحساب: {d.impactNote}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function RulesCatalogPage() {
  const [query, setQuery] = useState("");
  const active = useMemo(() => getActiveRules(), []);
  const blocked = useMemo(() => getBlockedRules(), []);
  const integrity = useMemo(() => validateCatalog(), []);
  const activeIds = useMemo(() => new Set(active.map((r) => r.ruleId)), [active]);

  const filter = (rules: ZakatRule[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) =>
      `${r.ruleId} ${r.name} ${r.description} ${r.reference}`.toLowerCase().includes(q),
    );
  };

  const verifiedSources = SHARIAH_SOURCES.filter((s) => s.verification === "verified").length;

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-10" dir="rtl">
      <header className="space-y-3 text-center">
        <Badge className="border-primary/20 bg-primary/10 text-primary">
          Rules Catalogue — {RULES_CATALOG_VERSION}
        </Badge>
        <h1 className="text-3xl font-bold md:text-4xl">كتالوج القواعد الشرعية</h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          كل قاعدة تطبّقها المنصة معروضة هنا بمصدرها ودرجة اعتمادها وإصدارها. لا تُفعَّل قاعدة في
          الإنتاج إلا باعتماد موقّع ومصدر متحقَّق منه وتاريخ سريان قد حلّ.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="إجمالي القواعد" value={ZAKAT_RULES.length} />
        <Stat label="مفعّلة في الإنتاج" value={active.length} tone="ok" />
        <Stat label="محجوبة" value={blocked.length} tone={blocked.length ? "warn" : "ok"} />
        <Stat label="مصادر متحقَّقة" value={`${verifiedSources}/${SHARIAH_SOURCES.length}`} />
      </div>

      {integrity.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            خلل في سلامة الكتالوج:{" "}
            {integrity.map((i) => `${i.ruleId}: ${i.issue}`).join(" · ")}
          </AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في القواعد بالاسم أو المعرّف أو المرجع…"
          className="pr-9"
          aria-label="بحث في كتالوج القواعد"
        />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">المفعّلة ({active.length})</TabsTrigger>
          <TabsTrigger value="blocked">المحجوبة ({blocked.length})</TabsTrigger>
          <TabsTrigger value="sources">المصادر ({SHARIAH_SOURCES.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Accordion type="multiple" className="space-y-2">
            {filter(active).map((rule) => (
              <RuleCard key={rule.ruleId} rule={rule} />
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="blocked">
          {blocked.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              لا توجد قواعد محجوبة — كل القواعد معتمدة ومصادرها متحقَّقة.
            </p>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {blocked
                .filter((b) => filter([b.rule]).length > 0)
                .map(({ rule, reasons }) => (
                  <RuleCard key={rule.ruleId} rule={rule} blockedReasons={reasons} />
                ))}
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpenCheck className="h-4 w-4 text-primary" />
                سجل المصادر وحالة التحقق
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {SHARIAH_SOURCES.map((s) => {
                const ok = s.verification === "verified";
                const used = ZAKAT_RULES.filter((r) => r.sourceId === s.id).length;
                return (
                  <div key={s.id} className="rounded border p-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      {ok ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                      )}
                      <span className="font-mono text-[10px]">{s.id}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${ok ? "text-emerald-600" : "text-amber-600"}`}
                      >
                        {ok ? "متحقَّق" : "قيد التحقق"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        مستخدم في {used} قاعدة
                        {activeIds.size > 0 && !ok ? " (محجوبة)" : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{s.citation}</p>
                    {s.verifiedBy && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        تحقّق: {s.verifiedBy} — {s.verifiedAt}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "ok" | "warn";
}) {
  const cls =
    tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className={`text-2xl font-black tabular-nums ${cls}`}>{value}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
