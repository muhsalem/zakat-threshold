import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Calculator, ShieldCheck, BookOpen, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/zakat-gold")({
  head: () => ({
    meta: [
      { title: "زكاة الذهب — نصاب اليوم وكيفية الحساب | نِصاب" },
      { name: "description", content: "احسب زكاة الذهب والفضة بدقة شرعية وفق آخر أسعار السوق ومعيار AAOIFI 35. نصاب الذهب 85 جرام، ونصاب الفضة 595 جرام." },
      { property: "og:title", content: "زكاة الذهب — احسبها بالجرام أو بالقيمة" },
      { property: "og:description", content: "حاسبة زكاة الذهب مع أسعار حيّة ومقارنة المذاهب الأربعة." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ZakatGoldPage,
});

function ZakatGoldPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6" dir="rtl">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">الرئيسية</Link> · <span>زكاة الذهب</span>
      </nav>

      <header className="space-y-3">
        <Badge variant="outline" className="gap-1"><Coins className="h-3 w-3" /> زكاة الأصول الثمينة</Badge>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight">زكاة الذهب — النصاب والحساب الصحيح</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          تجب زكاة الذهب إذا بلغ <b>85 جرامًا</b> من الذهب الخالص (عيار 24) أو ما يعادله في القيمة السوقية، وحال عليه الحول القمري.
          مقدار الزكاة <b>ربع العشر (2.5%)</b> من إجمالي القيمة.
        </p>
      </header>

      <Card className="border-primary/30">
        <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> احسب زكاة الذهب الآن</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">حاسبة نِصاب تُطبّق آخر أسعار الذهب من مصادر السوق، وتدعم الإدخال بالجرام أو بالقيمة.</p>
          <div className="flex gap-2 flex-wrap">
            <Button asChild size="lg" className="gap-1.5"><Link to="/calculator"><Calculator className="h-4 w-4" /> افتح الحاسبة</Link></Button>
            <Button asChild variant="outline"><Link to="/prices-history">سجل أسعار الذهب</Link></Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid md:grid-cols-2 gap-4">
        <InfoBlock title="نصاب الذهب" body="85 جرامًا من الذهب الخالص عيار 24 — أو ما يعادله من عيار 21/18 بحسب النقاء." />
        <InfoBlock title="نصاب الفضة" body="595 جرامًا من الفضة الخالصة — وأكثر الفقهاء يعتمدون نصاب الفضة لأنه الأنفع للفقراء." />
        <InfoBlock title="الحُلي المستعمَل" body="اختلف الفقهاء؛ الجمهور على وجوب الزكاة في الحلي المستعمل إذا بلغ النصاب، والحنابلة على عدم الوجوب. نصاب يعرض الرأيين." />
        <InfoBlock title="خلط الذهب بالنقد" body="تُجمع قيمة الذهب مع النقود والأرصدة البنكية والاستثمارات لتقدير النصاب الإجمالي." />
      </section>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="h-5 w-5 text-primary" /> الأدلة الشرعية</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>• قوله ﷺ: <span className="text-foreground">«ما من صاحب ذهب ولا فضة لا يؤدي منها حقّها إلا صُفّحت له يوم القيامة صفائح من نار»</span> — رواه مسلم.</p>
          <p>• قوله ﷺ: <span className="text-foreground">«ليس فيما دون خمس أواقٍ من الوَرِق صدقة»</span> — متفق عليه. والأوقية 40 درهماً، فالنصاب 200 درهم = 595 جراماً فضة.</p>
          <p>• معيار AAOIFI 35 — بند 3/2/1 يعتمد الذهب مقياساً للنصاب في العملات الورقية.</p>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-primary/5 p-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm"><ShieldCheck className="h-5 w-5 text-primary" /> نتيجة الحاسبة تصدر مع بصمة تدقيق شرعي قابلة للتحقق.</div>
        <Button asChild variant="ghost" className="gap-1"><Link to="/verify">تحقق من تقرير</Link></Button>
      </div>

      <div className="pt-4">
        <Button asChild variant="ghost" className="gap-1"><Link to="/"><ArrowLeft className="h-4 w-4" /> عودة للرئيسية</Link></Button>
      </div>
    </main>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border p-4 bg-card">
      <h3 className="font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
