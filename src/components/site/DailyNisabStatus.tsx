import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { dailyWindow, isCurrentUtcDay, nisabChange, PRICE_REFRESH_MS } from "@/lib/daily-nisab";

const TEXT = {
  ar: { title: "النصاب الآن", checking: "جارٍ التحقق", refresh: "تحديث الأسعار", today: "آخر سعر متاح اليوم", older: "آخر سعر متاح · ليس من اليوم", manual: "سعر يدوي", ends: "يتجدد اليوم خلال", zone: "توقيت UTC · توقيت السجل اليومي", previous: "مقارنة باليوم السابق", missing: "لا يوجد سجل لليوم السابق", error: "تعذّر تحميل سجل اليوم السابق", unchanged: "دون تغيير", previousValue: "السابق", check: "آخر تحقق", delay: "الأسعار المحلية حسب تحديث مصدرها؛ التحقق كل دقيقة لا يعني تغيّر السعر كل دقيقة." },
  en: { title: "Nisab now", checking: "Checking", refresh: "Refresh prices", today: "Latest available price today", older: "Latest available price · not from today", manual: "Manual price", ends: "New day in", zone: "UTC · daily history timezone", previous: "Compared with yesterday", missing: "No record for yesterday", error: "Could not load yesterday's record", unchanged: "Unchanged", previousValue: "Previous", check: "Last check", delay: "Local prices follow their source's updates; minute checks do not imply minute price changes." },
  fr: { title: "Nisab actuel", checking: "Vérification", refresh: "Actualiser les prix", today: "Dernier prix disponible aujourd’hui", older: "Dernier prix disponible · antérieur", manual: "Prix manuel", ends: "Nouveau jour dans", zone: "UTC · fuseau de l’historique", previous: "Comparaison avec hier", missing: "Aucune donnée pour hier", error: "Historique indisponible", unchanged: "Inchangé", previousValue: "Précédent", check: "Dernière vérification", delay: "Les prix locaux suivent leur source ; une vérification par minute ne garantit pas un changement." },
  tr: { title: "Şimdiki nisap", checking: "Kontrol ediliyor", refresh: "Fiyatları yenile", today: "Bugünün son mevcut fiyatı", older: "Son mevcut fiyat · bugün değil", manual: "Manuel fiyat", ends: "Yeni güne kalan", zone: "UTC · günlük kayıt saat dilimi", previous: "Düne göre", missing: "Dünün kaydı yok", error: "Dünün kaydı yüklenemedi", unchanged: "Değişmedi", previousValue: "Önceki", check: "Son kontrol", delay: "Yerel fiyatlar kaynağını izler; dakika kontrolü her dakika fiyat değişimi değildir." },
  id: { title: "Nisab sekarang", checking: "Memeriksa", refresh: "Perbarui harga", today: "Harga terakhir tersedia hari ini", older: "Harga terakhir · bukan hari ini", manual: "Harga manual", ends: "Hari baru dalam", zone: "UTC · zona riwayat harian", previous: "Dibandingkan kemarin", missing: "Tidak ada catatan kemarin", error: "Catatan kemarin gagal dimuat", unchanged: "Tidak berubah", previousValue: "Sebelumnya", check: "Pemeriksaan terakhir", delay: "Harga lokal mengikuti sumbernya; pemeriksaan setiap menit bukan perubahan harga setiap menit." },
  ur: { title: "نصاب ابھی", checking: "جانچ جاری", refresh: "قیمت تازہ کریں", today: "آج کی تازہ ترین دستیاب قیمت", older: "آخری دستیاب قیمت · آج کی نہیں", manual: "دستی قیمت", ends: "نیا دن باقی", zone: "UTC · یومیہ ریکارڈ کا وقت", previous: "گزشتہ دن سے موازنہ", missing: "گزشتہ دن کا ریکارڈ نہیں", error: "گزشتہ ریکارڈ دستیاب نہیں", unchanged: "بغیر تبدیلی", previousValue: "سابقہ", check: "آخری جانچ", delay: "مقامی قیمت اپنے ماخذ کے مطابق بدلتی ہے؛ ہر منٹ جانچ کا مطلب ہر منٹ نئی قیمت نہیں۔" },
};

export function useDailyNisab() {
  const [now, setNow] = useState<Date | null>(null);
  const client = useQueryClient();
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = globalThis.setInterval(tick, 1000);
    return () => globalThis.clearInterval(timer);
  }, []);
  const window = now ? dailyWindow(now) : null;
  const day = window?.today;
  useEffect(() => {
    if (!day) return;
    void client.invalidateQueries({ queryKey: ["live-prices"] });
    void client.invalidateQueries({ queryKey: ["local-quote"] });
  }, [day, client]);
  const { country, currency } = useI18n();
  const previous = useQuery({
    queryKey: ["previous-day-nisab", country, currency, window?.yesterday],
    enabled: Boolean(window),
    staleTime: PRICE_REFRESH_MS,
    refetchInterval: PRICE_REFRESH_MS,
    queryFn: async () => {
      if (!window) return null;
      const { data, error } = await supabase.from("nisab_history")
        .select("day,gold_nisab,silver_nisab,source")
        .eq("country", country).eq("currency", currency).eq("day", window.yesterday)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const refresh = async () => {
    await Promise.all([
      client.refetchQueries({ queryKey: ["live-prices"], type: "active" }),
      client.refetchQueries({ queryKey: ["local-quote"], type: "active" }),
      previous.refetch(),
    ]);
  };
  return { window, previous, refresh };
}

export function DailyNisabStatus({ daily, at, fetchedAt, manual, fetching }: {
  daily: ReturnType<typeof useDailyNisab>; at: string | undefined; fetchedAt: string | undefined; manual: boolean; fetching: boolean;
}) {
  const { lang } = useI18n();
  const s = TEXT[lang as keyof typeof TEXT] ?? TEXT.en;
  const [refreshing, setRefreshing] = useState(false);
  const seconds = Math.max(0, Math.floor((daily.window?.remainingMs ?? 0) / 1000));
  const remaining = [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(v => String(v).padStart(2, "0")).join(":");
  const fresh = at && daily.window && isCurrentUtcDay(at, daily.window.today);
  return <section className="border-y border-border py-4">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-primary"><span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />{s.title}<span className="text-xs font-normal text-muted-foreground">{fetching || refreshing ? s.checking : manual ? s.manual : fresh ? s.today : s.older}</span></p>
        <p className="mt-1 text-xs text-muted-foreground">{daily.window?.today} · {s.ends} <span className="num">{daily.window ? remaining : "—"}</span> · {s.zone}</p>
      </div>
      <Button size="icon" variant="outline" aria-label={s.refresh} title={s.refresh} disabled={refreshing || fetching} onClick={async () => { setRefreshing(true); try { await daily.refresh(); } finally { setRefreshing(false); } }}><RefreshCw className={refreshing || fetching ? "animate-spin motion-reduce:animate-none" : ""} /></Button>
    </div>
    <p className="mt-2 text-xs leading-6 text-muted-foreground">{s.delay}</p>
    {fetchedAt && <p className="text-xs text-muted-foreground">{s.check}: {new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(fetchedAt))}</p>}
  </section>;
}

export function DailyComparison({ current, metal, money, daily }: {
  current: number; metal: "gold" | "silver"; money: (value: number) => string; daily: ReturnType<typeof useDailyNisab>;
}) {
  const { lang } = useI18n();
  const s = TEXT[lang as keyof typeof TEXT] ?? TEXT.en;
  const record = daily.previous.data;
  const previous = metal === "gold" ? record?.gold_nisab : record?.silver_nisab;
  const change = nisabChange(current, previous);
  const Icon = change && change.difference > 0 ? ArrowUpRight : change && change.difference < 0 ? ArrowDownRight : Minus;
  return <div className="mt-4 border-t border-border pt-3 text-xs" data-testid={`daily-comparison-${metal}`}>
    <p className="text-muted-foreground">{s.previous} · {daily.window?.yesterday ?? "—"}</p>
    {change ? <>
      <p className="mt-2 flex flex-wrap items-center gap-2 font-medium text-foreground"><Icon className="size-4 text-primary" aria-hidden="true" /><span className="num">{change.percent > 0 ? "+" : ""}{change.percent.toFixed(2)}%</span><span className="text-muted-foreground">{change.difference === 0 ? s.unchanged : money(change.difference)}</span></p>
      <p className="mt-1 text-muted-foreground">{s.previousValue}: <span className="num">{money(previous ?? 0)}</span> · {record?.source}</p>
    </> : <p className="mt-2 text-muted-foreground">{daily.previous.isFetching ? s.checking : daily.previous.isError ? s.error : s.missing}</p>}
  </div>;
}