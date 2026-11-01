import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Save, RefreshCw } from "lucide-react";
import { Page } from "@/components/site/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";
import { adminJewelerPriceSchema } from "@/lib/admin-jeweler-prices";
import { getManualJewelerHistory, saveAdminJewelerPrice } from "@/lib/admin-jeweler-prices.functions";

export const Route = createFileRoute("/_authenticated/jeweler-prices")({
  head: () => ({ meta: [
    { title: "إدخال أسعار الصاغة وسجلها · نِصاب" },
    { name: "description", content: "إدخال أسعار الصاغة المعتمدة لليوم ومراجعة سجل تحديثات المدير." },
    { property: "og:title", content: "إدارة أسعار الصاغة · نِصاب" },
    { property: "og:description", content: "أسعار الصاغة اليدوية وسجل تفعيلها في نِصاب." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }), component: JewelerPricesPage,
});

function JewelerPricesPage() {
  const { isAdmin, loading } = useAuth();
  return <Page eyebrow="الإدارة" title="أسعار الصاغة اليدوية">
    {loading ? <p>جارٍ التحميل…</p> : isAdmin ? <PriceEditor /> : <p>هذه الصفحة للمدير فقط.</p>}
  </Page>;
}

function PriceEditor() {
  const save = useServerFn(saveAdminJewelerPrice);
  const history = useServerFn(getManualJewelerHistory);
  const client = useQueryClient();
  const [country, setCountry] = useState("EG");
  const currency = COUNTRIES.find(c => c.code === country)?.currency ?? "EGP";
  const [fields, setFields] = useState({ gold: "", silver: "", goldBuyback: "", silverBuyback: "", source: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const log = useQuery({ queryKey: ["manual-jeweler-history"], queryFn: () => history() });
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setError(""); setSaved(false);
    const number = (v: string) => v.trim() ? Number(v) : null;
    const parsed = adminJewelerPriceSchema.safeParse({ country, currency, ...fields,
      gold: number(fields.gold), silver: number(fields.silver), goldBuyback: number(fields.goldBuyback), silverBuyback: number(fields.silverBuyback) });
    if (!parsed.success) { setError("أدخل سعرًا موجبًا لمعدن واحد على الأقل ومصدرًا وسببًا؛ سعر الشراء لا يتجاوز سعر البيع."); return; }
    setBusy(true);
    try {
      await save({ data: parsed.data });
      setSaved(true);
      await Promise.all([client.invalidateQueries({ queryKey: ["local-quote", country] }), log.refetch()]);
    } catch { setError("تعذّر حفظ السعر وسجله؛ لم نمسح البيانات. حاول مجددًا."); }
    finally { setBusy(false); }
  }
  const labels = { gold: "بيع جرام الذهب الخالص (24 قيراطًا)", goldBuyback: "شراء جرام الذهب الخالص", silver: "بيع جرام الفضة الخالصة", silverBuyback: "شراء جرام الفضة الخالصة" };
  return <>
    <Link to="/control" className="text-primary underline">لوحة التحكم</Link>
    <form onSubmit={submit} className="mt-6 grid max-w-3xl gap-5 border-y border-border py-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">الدولة<select aria-label="الدولة" className="h-10 rounded-md border border-input bg-background px-3" value={country} disabled={busy} onChange={e => { setCountry(e.target.value); setSaved(false); setFields(f => ({ ...f, gold: "", silver: "", goldBuyback: "", silverBuyback: "" })); }}>
          {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.ar}</option>)}
        </select></label>
        <div className="text-sm">العملة<p className="mt-3 font-semibold">{currency}</p></div>
        {(Object.keys(labels) as Array<keyof typeof labels>).map(key => <label key={key} className="grid gap-2 text-sm">{labels[key]} ({currency})<Input aria-label={labels[key]} type="number" min="0.000001" step="any" value={fields[key]} disabled={busy} onChange={e => { setFields(f => ({ ...f, [key]: e.target.value })); setSaved(false); }} /></label>)}
      </div>
      <label className="grid gap-2 text-sm">المصدر<Input required minLength={3} maxLength={200} value={fields.source} disabled={busy} onChange={e => setFields(f => ({ ...f, source: e.target.value }))} /></label>
      <label className="grid gap-2 text-sm">سبب التحديث<Input required minLength={3} maxLength={300} value={fields.reason} disabled={busy} onChange={e => setFields(f => ({ ...f, reason: e.target.value }))} /></label>
      <p className="text-xs text-muted-foreground">يسري من وقت الحفظ لليوم بتوقيت UTC؛ التحديث التالي للأسعار قد يحل محله. ليس إعلان نصاب رسميًا.</p>
      <Button type="submit" disabled={busy} className="w-fit"><Save />{busy ? "جارٍ الحفظ…" : "حفظ وتفعيل سعر اليوم"}</Button>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {saved && <p role="status" className="text-primary">تم تفعيل الأسعار وحفظ سجل التحديث. <Link to="/today" className="underline">صفحة اليوم</Link></p>}
    </form>
    <section className="mt-8">
      <div className="flex items-center justify-between"><h2 className="text-xl">سجل التحديثات اليدوية</h2><Button variant="outline" size="icon" aria-label="تحديث السجل" onClick={() => void log.refetch()} disabled={log.isFetching}><RefreshCw /></Button></div>
      {log.isError ? <p role="alert">تعذّر تحميل السجل.</p> : log.isPending ? <p>جارٍ التحميل…</p> : !log.data.length ? <p className="mt-4 text-muted-foreground">لا توجد تحديثات يدوية بعد.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-start text-sm"><thead><tr className="border-b border-border">{["الوقت UTC", "الدولة / العملة", "الذهب بيع / شراء", "الفضة بيع / شراء", "المصدر والسبب", "معرّف المدير"].map(h => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead><tbody>{log.data.map(row => {
        const m = row.meta && typeof row.meta === "object" && !Array.isArray(row.meta) ? row.meta : {};
        const text = (key: string) => String(m[key] ?? "—");
        return <tr key={row.id} className="border-b border-border"><td className="whitespace-nowrap p-3">{row.created_at.slice(0,19).replace("T"," ")}</td><td className="p-3">{text("country")} / {text("currency")}</td><td className="p-3">{text("gold")} / {text("goldBuyback")}</td><td className="p-3">{text("silver")} / {text("silverBuyback")}</td><td className="p-3">{text("source")}<p className="text-muted-foreground">{row.reason}</p></td><td className="max-w-40 break-all p-3">{row.actor_id}</td></tr>;
      })}</tbody></table></div>}
    </section>
  </>;
}