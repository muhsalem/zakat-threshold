import { useState } from "react";
import { Share2, Copy, Check, Send, MessageCircle, Printer, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { countryName, findCountry } from "@/lib/countries";
import { homeCopy } from "@/lib/home-copy";
import type { NisabValues } from "@/lib/share-nisab";
import { nisabShareMessage, nisabSharePath } from "@/lib/share-nisab";
export type { NisabValues } from "@/lib/share-nisab";

type Props = { values: NisabValues; money: (n: number) => string; silverWeight?: number; day?: string | undefined; sources?: string };
export function ShareDailyNisab({ values, money, silverWeight = 595, day, sources = "" }: Props) {
  const { country, lang, t } = useI18n();
  const s = homeCopy(lang);
  const [status, setStatus] = useState("");
  const location = countryName(findCountry(country), lang);
  const path = nisabSharePath(country, silverWeight);
  const message = () => nisabShareMessage({ title: s.now, location, day: day ?? "—", goldLabel: t("nisab.gold"), silverLabel: t("nisab.silver"), gold: money(values.gold), silver: money(values.silver), silverWeight, sources, note: s.note, url: new URL(path, window.location.origin).href });
  const copy = async (link = false) => { try { await navigator.clipboard.writeText(link ? new URL(path, window.location.origin).href : message()); setStatus(s.copied); } catch { setStatus(s.failed); } };
  const social = (network: "whatsapp" | "telegram" | "x" | "facebook") => {
    const text = encodeURIComponent(message());
    const url = encodeURIComponent(new URL(path, window.location.origin).href);
    const destination = network === "whatsapp" ? `https://api.whatsapp.com/send?text=${text}` : network === "telegram" ? `https://t.me/share/url?url=${url}&text=${text}` : network === "x" ? `https://twitter.com/intent/tweet?url=${url}&text=${text}` : `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    window.open(destination, "_blank", "noopener,noreferrer");
  };
  return <section className="home-share border-y border-border py-5" aria-label={s.share}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground"><Share2 className="size-4 text-primary" aria-hidden="true" />{s.share}<span className="font-normal text-muted-foreground">· {location}</span></h2>
      <span className="num text-xs text-muted-foreground">{day ?? "—"} · UTC</span>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      <Button size="sm" onClick={() => social("whatsapp")}><MessageCircle aria-hidden="true" />WhatsApp</Button>
      <Button size="sm" variant="outline" onClick={() => social("telegram")}><Send aria-hidden="true" />Telegram</Button>
      <Button size="icon" variant="outline" aria-label="X" title="X" onClick={() => social("x")}><ExternalLink aria-hidden="true" /></Button>
      <Button size="sm" variant="outline" onClick={() => social("facebook")}><Share2 aria-hidden="true" />Facebook</Button>
      <Button size="icon" variant="ghost" aria-label={s.copy} title={s.copy} onClick={() => copy()}>{status === s.copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</Button>
      <Button size="icon" variant="ghost" aria-label={s.link} title={s.link} onClick={() => copy(true)}><Share2 aria-hidden="true" /></Button>
      <Button size="icon" variant="ghost" aria-label={s.print} title={s.print} onClick={() => window.print()}><Printer aria-hidden="true" /></Button>
    </div>
    <p role="status" className="mt-2 min-h-4 text-xs text-muted-foreground">{status}</p>
  </section>;
}
