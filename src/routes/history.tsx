import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Moon, ArrowRight, Trash2, TrendingUp, History, LogOut, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmt } from "@/lib/zakat";
import { HawlReminderCard } from "@/components/zakat/HawlReminderCard";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend,
} from "recharts";

interface ZakatRecord {
  id: string;
  record_type: string;
  hijri_year: string | null;
  gregorian_date: string;
  currency: string;
  total_assets: number;
  total_liabilities: number;
  zakat_base: number;
  zakat_due: number;
  prepaid_zakat: number;
  net_due: number;
  notes: string | null;
  created_at: string;
}

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "سجل الزكاة — حاسبة الزكاة" },
      { name: "description", content: "اعرض سجل زكواتك السنوية مع مخططات إحصائية لتتبّع تطور أموالك وزكواتك." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<ZakatRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("zakat_records")
        .select("*")
        .order("gregorian_date", { ascending: true });
      if (!error && data) setRecords(data as ZakatRecord[]);
      setLoading(false);
    })();
  }, [user]);

  async function handleDelete(id: string) {
    if (!confirm("حذف هذا السجل نهائياً؟")) return;
    await supabase.from("zakat_records").delete().eq("id", id);
    setRecords((r) => r.filter((x) => x.id !== id));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">جاري التحميل...</div>;
  }

  const chartData = records.map((r) => ({
    year: r.hijri_year || new Date(r.gregorian_date).getFullYear().toString(),
    assets: Number(r.total_assets),
    base: Number(r.zakat_base),
    zakat: Number(r.zakat_due),
  }));

  const totalLifetime = records.reduce((s, r) => s + Number(r.net_due), 0);
  const lastCurrency = records[records.length - 1]?.currency || "SAR";

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-gold">
              <Moon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">سجل الزكاة</h1>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/"><Button variant="outline" size="sm" className="gap-1"><ArrowRight className="h-4 w-4" /> الحاسبة</Button></Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1"><LogOut className="h-4 w-4" /> خروج</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <section className="grid sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-primary text-primary-foreground border-0 shadow-gold">
            <CardContent className="p-5">
              <div className="text-xs opacity-80">إجمالي ما زكّيت طوال السنوات</div>
              <div className="text-3xl font-black mt-1">{fmt(totalLifetime)} <span className="text-sm opacity-80">{lastCurrency}</span></div>
            </CardContent>
          </Card>
          <Card><CardContent className="p-5">
            <div className="text-xs text-muted-foreground">عدد السنوات المسجّلة</div>
            <div className="text-3xl font-black mt-1">{records.length}</div>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <div className="text-xs text-muted-foreground">آخر زكاة</div>
            <div className="text-3xl font-black mt-1">{records.length ? fmt(Number(records[records.length - 1].net_due)) : "—"}</div>
          </CardContent></Card>
        </section>

        {records.length > 0 && (
          <HawlReminderCard lastDate={records[records.length - 1].gregorian_date} />
        )}

        {loading ? (
          <div className="text-center text-muted-foreground py-12">جاري تحميل السجل...</div>
        ) : records.length === 0 ? (
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription>
              لا توجد سجلات بعد. ارجع إلى <Link to="/" className="underline font-bold">الحاسبة</Link> واحسب زكاتك ثم اضغط "حفظ في السجل".
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Card className="shadow-soft">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> تطور الأصول ووعاء الزكاة</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72 w-full" dir="ltr">
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="assets" name="إجمالي الأصول" stroke="hsl(var(--primary))" strokeWidth={2} />
                      <Line type="monotone" dataKey="base" name="وعاء الزكاة" stroke="hsl(var(--gold, 45 95% 50%))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-primary" /> الزكاة المستحقة سنوياً</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64 w-full" dir="ltr">
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="zakat" name="الزكاة" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader><CardTitle className="text-base">تفاصيل السجلات</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[...records].reverse().map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{r.hijri_year || new Date(r.gregorian_date).getFullYear()}</Badge>
                        <Badge variant="secondary">{r.record_type === "company" ? "شركة" : "فرد"}</Badge>
                        <span className="text-xs text-muted-foreground">{r.gregorian_date}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        أصول: <b className="text-foreground">{fmt(Number(r.total_assets))}</b> — وعاء: <b className="text-foreground">{fmt(Number(r.zakat_base))}</b> — زكاة: <b className="text-primary">{fmt(Number(r.net_due))} {r.currency}</b>
                      </div>
                      {r.notes && <div className="text-xs text-muted-foreground mt-1 italic">{r.notes}</div>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
