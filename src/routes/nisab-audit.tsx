import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/nisab-audit")({
  head: () => ({
    meta: [
      { title: "مراجعة اتساق احتساب النصاب 1925–2026" },
      {
        name: "description",
        content: "تقرير تدقيقي لمراجعة اتساق نصاب الذهب والفضة والزكاة المستحقة عبر كل السنوات.",
      },
    ],
  }),
  component: NisabAuditPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">خطأ: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">غير موجود</div>,
});

const GOLD_GRAMS = 85;
const SILVER_GRAMS = 595;
const ZAKAT_RATE = 0.025;
const TOL = 0.01;

type Row = {
  id: string;
  year: number;
  country_code: string;
  currency: string;
  gold_price: number;
  silver_price: number;
  gold_nisab_value: number | null;
  silver_nisab_value: number | null;
  reliability: "direct" | "derived" | "estimated";
  reliability_score: number;
  source: string | null;
};

type Issue = {
  row: Row;
  kind: "drift_gold" | "drift_silver" | "zero_price" | "yoy_jump_gold" | "yoy_jump_silver";
  detail: string;
};

function fmt(n: number, d = 2) {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: d }).format(n);
}

function reliabilityBadge(r: Row["reliability"]) {
  const map = {
    direct: {
      label: "مباشر",
      cls: "bg-success/15 text-success dark:text-success border-success/30",
    },
    derived: {
      label: "مشتق",
      cls: "bg-warning/15 text-warning dark:text-warning border-warning/30",
    },
    estimated: {
      label: "تقديري",
      cls: "bg-destructive/15 text-destructive dark:text-destructive border-destructive/30",
    },
  } as const;
  const m = map[r];
  return (
    <Badge variant="outline" className={m.cls}>
      {m.label}
    </Badge>
  );
}

function NisabAuditPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("nisab_prices")
        .select(
          "id, year, country_code, currency, gold_price, silver_price, gold_nisab_value, silver_nisab_value, reliability, reliability_score, source",
        )
        .order("country_code")
        .order("year");
      if (error) {
        setErr(error.message);
        return;
      }
      setRows((data ?? []) as Row[]);
    })();
  }, []);

  const audit = useMemo(() => {
    if (!rows) return null;
    const byCountry = new Map<string, Row[]>();
    for (const r of rows) {
      const arr = byCountry.get(r.country_code) ?? [];
      arr.push(r);
      byCountry.set(r.country_code, arr);
    }

    const issues: Issue[] = [];
    const summary: Record<
      string,
      {
        total: number;
        direct: number;
        derived: number;
        estimated: number;
        drifts: number;
        zeros: number;
        jumps: number;
      }
    > = {};

    for (const [cc, list] of byCountry) {
      list.sort((a, b) => a.year - b.year);
      summary[cc] = {
        total: list.length,
        direct: 0,
        derived: 0,
        estimated: 0,
        drifts: 0,
        zeros: 0,
        jumps: 0,
      };
      let prev: Row | null = null;
      for (const r of list) {
        summary[cc][r.reliability]++;
        const expGold = +(Number(r.gold_price) * GOLD_GRAMS).toFixed(4);
        const expSilv = +(Number(r.silver_price) * SILVER_GRAMS).toFixed(4);
        if (
          r.gold_nisab_value != null &&
          Math.abs(Number(r.gold_nisab_value) - expGold) > Math.max(TOL, expGold * 0.001)
        ) {
          issues.push({
            row: r,
            kind: "drift_gold",
            detail: `مخزّن ${fmt(Number(r.gold_nisab_value))} ≠ محسوب ${fmt(expGold)}`,
          });
          summary[cc].drifts++;
        }
        if (
          r.silver_nisab_value != null &&
          Math.abs(Number(r.silver_nisab_value) - expSilv) > Math.max(TOL, expSilv * 0.001)
        ) {
          issues.push({
            row: r,
            kind: "drift_silver",
            detail: `مخزّن ${fmt(Number(r.silver_nisab_value))} ≠ محسوب ${fmt(expSilv)}`,
          });
          summary[cc].drifts++;
        }
        if (Number(r.gold_price) <= 0 || Number(r.silver_price) <= 0) {
          issues.push({
            row: r,
            kind: "zero_price",
            detail: `سعر صفري أو سالب (ذهب=${r.gold_price}، فضة=${r.silver_price})`,
          });
          summary[cc].zeros++;
        }
        if (prev) {
          const gp = Number(prev.gold_price),
            gc = Number(r.gold_price);
          if (gp > 0 && gc > 0) {
            const ratio = gc / gp;
            if (ratio > 5 || ratio < 0.2) {
              issues.push({
                row: r,
                kind: "yoy_jump_gold",
                detail: `قفزة سنوية للذهب ×${fmt(ratio)} مقارنة بـ${prev.year}`,
              });
              summary[cc].jumps++;
            }
          }
          const sp = Number(prev.silver_price),
            sc = Number(r.silver_price);
          if (sp > 0 && sc > 0) {
            const ratio = sc / sp;
            if (ratio > 5 || ratio < 0.2) {
              issues.push({
                row: r,
                kind: "yoy_jump_silver",
                detail: `قفزة سنوية للفضة ×${fmt(ratio)} مقارنة بـ${prev.year}`,
              });
              summary[cc].jumps++;
            }
          }
        }
        prev = r;
      }
    }
    return { issues, summary };
  }, [rows]);

  if (err) return <div className="p-6 text-destructive">خطأ في تحميل البيانات: {err}</div>;
  if (!rows || !audit) return <div className="p-6">جارٍ تحميل تقرير المراجعة…</div>;

  const countries = Object.keys(audit.summary).sort();

  return (
    <div className="container mx-auto px-4 py-8 space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">تقرير مراجعة اتساق النصاب والزكاة</h1>
        <p className="text-muted-foreground">
          يتحقّق هذا التقرير من أن كل صف في قاعدة بيانات الأنصبة يحسب نصاب الذهب (سعر الجرام × 85)
          والفضة (سعر الجرام × 595) والزكاة (2.5%) بشكل متّسق، ويُبرز أي قيم تقديرية أو شاذة بعد
          استكمال السنوات 1926–2025.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>ملخّص الجودة لكل دولة</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الدولة</TableHead>
                <TableHead>الصفوف</TableHead>
                <TableHead>مباشر</TableHead>
                <TableHead>مشتق</TableHead>
                <TableHead>تقديري</TableHead>
                <TableHead>نسبة الثقة</TableHead>
                <TableHead>انحرافات</TableHead>
                <TableHead>أصفار</TableHead>
                <TableHead>قفزات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countries.map((cc) => {
                const s = audit.summary[cc];
                const conf = Math.round(
                  ((s.direct * 5 + s.derived * 3 + s.estimated * 2) / (s.total * 5)) * 100,
                );
                return (
                  <TableRow key={cc}>
                    <TableCell className="font-semibold">{cc}</TableCell>
                    <TableCell>{s.total}</TableCell>
                    <TableCell className="text-success">{s.direct}</TableCell>
                    <TableCell className="text-warning">{s.derived}</TableCell>
                    <TableCell className="text-destructive">{s.estimated}</TableCell>
                    <TableCell>{conf}%</TableCell>
                    <TableCell>
                      {s.drifts === 0 ? "✓" : <span className="text-destructive">{s.drifts}</span>}
                    </TableCell>
                    <TableCell>
                      {s.zeros === 0 ? "✓" : <span className="text-destructive">{s.zeros}</span>}
                    </TableCell>
                    <TableCell>
                      {s.jumps === 0 ? "✓" : <span className="text-warning">{s.jumps}</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues">الملاحظات والشواذ ({audit.issues.length})</TabsTrigger>
          <TabsTrigger value="all">كل السنوات ({rows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle>القيم الشاذة أو غير المتّسقة</CardTitle>
            </CardHeader>
            <CardContent>
              {audit.issues.length === 0 ? (
                <p className="text-success">لا توجد اختلافات — جميع الصفوف متّسقة. ✓</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الدولة</TableHead>
                      <TableHead>السنة</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>التفصيل</TableHead>
                      <TableHead>الجودة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.issues.slice(0, 200).map((i, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{i.row.country_code}</TableCell>
                        <TableCell>{i.row.year}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {i.kind === "drift_gold" && "انحراف ذهب"}
                            {i.kind === "drift_silver" && "انحراف فضة"}
                            {i.kind === "zero_price" && "سعر صفري"}
                            {i.kind === "yoy_jump_gold" && "قفزة ذهب"}
                            {i.kind === "yoy_jump_silver" && "قفزة فضة"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{i.detail}</TableCell>
                        <TableCell>{reliabilityBadge(i.row.reliability)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>جدول كامل: نصاب وزكاة كل سنة</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table wrapperClassName="max-h-[600px] overflow-auto">
                <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[inset_0_-1px_0_hsl(var(--border))]">
                  <TableRow>
                    <TableHead>الدولة</TableHead>
                    <TableHead>السنة</TableHead>
                    <TableHead>عملة</TableHead>
                    <TableHead>سعر الذهب/جم</TableHead>
                    <TableHead>نصاب الذهب</TableHead>
                    <TableHead>زكاة الذهب</TableHead>
                    <TableHead>نصاب الفضة</TableHead>
                    <TableHead>زكاة الفضة</TableHead>
                    <TableHead>الجودة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const gn = Number(r.gold_price) * GOLD_GRAMS;
                    const sn = Number(r.silver_price) * SILVER_GRAMS;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{r.country_code}</TableCell>
                        <TableCell>{r.year}</TableCell>
                        <TableCell>{r.currency}</TableCell>
                        <TableCell>{fmt(Number(r.gold_price), 4)}</TableCell>
                        <TableCell>{fmt(gn)}</TableCell>
                        <TableCell className="text-primary">{fmt(gn * ZAKAT_RATE)}</TableCell>
                        <TableCell>{fmt(sn)}</TableCell>
                        <TableCell className="text-primary">{fmt(sn * ZAKAT_RATE)}</TableCell>
                        <TableCell>{reliabilityBadge(r.reliability)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
