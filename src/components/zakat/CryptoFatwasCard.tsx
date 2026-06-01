import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Bitcoin, Image as ImageIcon, ExternalLink } from "lucide-react";
import { CRYPTO_FATWAS, NFT_RULINGS } from "@/lib/cryptoFatwas";

const RULING_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  zakat_as_money: { label: "زكاة كالنقود", variant: "default" },
  zakat_as_trade: { label: "زكاة عروض تجارة", variant: "secondary" },
  case_by_case: { label: "حسب الحال", variant: "outline" },
  forbidden: { label: "محرّم", variant: "destructive" },
};

export function CryptoFatwasCard() {
  return (
    <Card className="shadow-soft border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-primary" />
          فتاوى زكاة العملات المشفرة والـ NFT
          <Badge variant="outline" className="text-[10px] mr-auto">8 جهات إفتاء</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-primary/20 bg-primary/5">
          <Bitcoin className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            مرجع فقهي موثّق من المجامع الفقهية وهيئات الإفتاء والهيئات الشرعية المتخصصة بشأن زكاة الأصول الرقمية.
          </AlertDescription>
        </Alert>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="fatwas">
            <AccordionTrigger className="text-sm font-semibold">فتاوى العملات المشفرة ({CRYPTO_FATWAS.length})</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {CRYPTO_FATWAS.map((f, i) => (
                <div key={i} className="rounded-md border border-primary/15 bg-card p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-primary">{f.authority}</div>
                      <div className="text-[11px] text-muted-foreground">{f.reference} — {f.year}م</div>
                    </div>
                    <Badge variant={RULING_LABELS[f.ruling].variant} className="text-[10px] shrink-0">
                      {RULING_LABELS[f.ruling].label}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/90">{f.summary}</p>
                  {f.link && (
                    <a href={f.link} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                      المصدر <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="nft">
            <AccordionTrigger className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> أحكام زكاة الـ NFT
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              {NFT_RULINGS.map((r, i) => (
                <div key={i} className="rounded-md border border-primary/15 bg-card p-3 space-y-1">
                  <div className="text-sm font-bold text-primary">{r.type}</div>
                  <div className="text-xs"><b>الحكم:</b> {r.treatment}</div>
                  <div className="text-[11px] text-muted-foreground"><b>المستند:</b> {r.basis}</div>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
