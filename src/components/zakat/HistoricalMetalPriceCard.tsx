import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { History, ExternalLink } from "lucide-react";

type Row = {
  price_date: string;
  metal: "gold" | "silver";
  price_usd_per_gram: number;
  reliability: "direct" | "derived" | "estimated";
};

const GOLD_NISAB = 85;
const SILVER_NISAB = 595;
const ZAKAT = 0.025;

function fmt(n: number, d = 2) {
  if (!isFinite(n) || !n) return "—";
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: d }).format(n);
}

const REL_STYLE = {
  direct: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40",
  derived: "bg-amber-500/15 text-amber-700 border-amber-500/40",
  estimated: "bg-rose-500/15 text-rose-700 border-rose-500/40",
} as const;

const REL_LABEL = { direct: "مباشر", derived: "مشتق", estimated: "تقديري" } as const;

/**
 * بطاقة مختصرة لاختيار نصاب أي تاريخ سابق من قاعدة بيانات الأسعار
 * (تستخدم داخل تبويب الأنصبة).
 */
export function HistoricalMetalPriceCard() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<string>(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("metal_prices_daily")
        .select("price_date, metal, price_usd_per_gram, reliability")
        .order("price_date", { ascending: false })
        .limit(4000);
      if (error) { setErr(error.message); return; }
      setRows((data ?? []) as Row[]);
    })();
  }, []);

  const byDate = useMemo(() => {
    const m = new Map<string, { gold?: Row; silver?: Row }>();
    for (const r of rows ?? []) {
      const e = m.get(r.price_date) ?? {};
      e[r.metal] = r;
      m.set(r.price_date, e);
    }
    return m;
  }, [rows]);

  const nearest = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const dates = Array.from(byDate.keys()).sort();
    let best = dates[0];
    for (const d of dates) if (d <= picked) best = d; else break;
    const e = byDate.get(best);
    return { date: best, gold: e?.gold, silver: e?.silver };
  }, [byDate, picked, rows]);

  return (
    <Card className="border-primary/30 shadow-soft" dir="rtl">
      <CardHeader className="bg-gradient-to-l from-primary/10 to-transparent">
        <CardTitle className="flex items-center gap-2 text-xl">
          <History className="h-5 w-5 text-primary" />
          سجل الأسعار — احسب نصاب أي تاريخ سابق
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          قاعدة بيانات يومية/شهرية لأسعار الذهب والفضة بالدولار للجرام من 1975 حتى اليوم.
        </p>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {err && <p className="text-sm text-destructive">تعذّر التحميل: {err}</p>}
        {!rows && !err && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
        {rows && (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">اختر التاريخ</label>
                <Input
                  type="date"
                  value={picked}
                  min="1975-01-01"
                  onChange={(e) => setPicked(e.target.value)}
                  className="max-w-[200px]"
                />
              </div>
              <Link to="/prices-history">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  السجل الكامل + الفلاتر
                </Button>
              </Link>
            </div>

            {nearest && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-md border border-gold/40 bg-gold/5 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      أقرب تاريخ متاح: {nearest.date}
                    </span>
                    {nearest.gold && (
                      <Badge variant="outline" className={REL_STYLE[nearest.gold.reliability]}>
                        {REL_LABEL[nearest.gold.reliability]}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm">ذهب: <b>{fmt(nearest.gold?.price_usd_per_gram ?? 0, 4)}</b> USD/جم</div>
                  <div className="text-sm">نصاب الذهب: <b>{fmt((nearest.gold?.price_usd_per_gram ?? 0) * GOLD_NISAB)}</b> USD</div>
                  <div className="text-sm text-primary">زكاته: {fmt((nearest.gold?.price_usd_per_gram ?? 0) * GOLD_NISAB * ZAKAT)} USD</div>
                </div>
                <div className="rounded-md border bg-muted p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">الفضة</span>
                    {nearest.silver && (
                      <Badge variant="outline" className={REL_STYLE[nearest.silver.reliability]}>
                        {REL_LABEL[nearest.silver.reliability]}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm">فضة: <b>{fmt(nearest.silver?.price_usd_per_gram ?? 0, 4)}</b> USD/جم</div>
                  <div className="text-sm">نصاب الفضة: <b>{fmt((nearest.silver?.price_usd_per_gram ?? 0) * SILVER_NISAB)}</b> USD</div>
                  <div className="text-sm text-primary">زكاته: {fmt((nearest.silver?.price_usd_per_gram ?? 0) * SILVER_NISAB * ZAKAT)} USD</div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 text-[10px]">
              <Badge variant="outline" className={REL_STYLE.direct}>مباشر: مأخوذ يومياً من مزوّد أسعار</Badge>
              <Badge variant="outline" className={REL_STYLE.derived}>مشتق: محسوب من مرجع آخر</Badge>
              <Badge variant="outline" className={REL_STYLE.estimated}>تقديري: متوسط سنوي تاريخي</Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
