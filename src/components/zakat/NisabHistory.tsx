import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NISAB_HISTORY } from "@/lib/zakat";
import { Scroll } from "lucide-react";

export function NisabHistory() {
  return (
    <Card className="border-gold/30 shadow-soft">
      <CardHeader className="bg-gradient-to-l from-gold/15 to-transparent">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Scroll className="h-5 w-5 text-gold" />
          التطور التاريخي لنصاب الذهب والفضة
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          من العهد النبوي حتى العصر الحديث — مع توثيق المعيار الشرعي عبر العصور
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="relative">
          <div className="absolute right-3 top-2 bottom-2 w-px bg-gradient-to-b from-gold via-primary/30 to-transparent" />
          <div className="space-y-6">
            {NISAB_HISTORY.map((item, idx) => (
              <div key={idx} className="relative pr-10">
                <div className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full bg-gradient-gold ring-4 ring-background shadow-gold" />
                <div className="flex flex-wrap items-baseline gap-2 mb-2">
                  <h3 className="text-lg font-bold text-primary">{item.era}</h3>
                  <Badge variant="secondary" className="text-xs">{item.period}</Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 mb-2">
                  <div className="rounded-md bg-gold/10 border border-gold/20 px-3 py-2 text-sm">
                    <span className="font-semibold text-gold-foreground">الذهب: </span>
                    {item.gold}
                  </div>
                  <div className="rounded-md bg-muted px-3 py-2 text-sm">
                    <span className="font-semibold">الفضة: </span>
                    {item.silver}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
