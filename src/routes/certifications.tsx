import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, ExternalLink, ShieldCheck, ArrowLeft } from "lucide-react";
import { SHARIA_CERTIFICATIONS, CERT_STATUS_LABEL, type CertStatus } from "@/lib/shariaCertifications";

export const Route = createFileRoute("/certifications")({
  head: () => ({
    meta: [
      { title: "الاعتمادات الشرعية والحوكمة | نِصاب" },
      {
        name: "description",
        content:
          "سجل رسمي لهيئات الاعتماد الشرعي، معايير AAOIFI، قرارات المجامع الفقهية، وشهادات الحوكمة (ZATCA · ISO · SOC 2) التي تستند إليها منصة نِصاب.",
      },
      { property: "og:title", content: "الاعتمادات الشرعية | نِصاب" },
      { property: "og:description", content: "شفافية كاملة عن مرجعيات المنصة الشرعية وشهادات الحوكمة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CertificationsPage,
});

const ORDER: CertStatus[] = ["certified", "in_review", "informational", "planned"];

function CertificationsPage() {
  const grouped = ORDER.map((status) => ({
    status,
    items: SHARIA_CERTIFICATIONS.filter((c) => c.status === status),
  }));

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">سجل الاعتمادات الشرعية والحوكمة</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            شفافية كاملة حول المرجعيات الفقهية والمعايير الدولية التي تستند إليها منصة نِصاب،
            مع حالة كل اعتماد (رسمي · قيد المراجعة · معياري · مخطّط) لتمكين المدقّقين والمؤسسات
            من التحقّق قبل الاعتماد.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 ml-1" />
            الرئيسية
          </Link>
        </Button>
      </div>

      <Card className="bg-primary/5 border-primary/30">
        <CardContent className="flex items-start gap-3 pt-6">
          <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-1" />
          <div className="text-sm">
            <b>نموذج ثقة متدرّج:</b> نميّز بين الاعتماد الرسمي المكتوب، والاستناد المعياري إلى مطبوعات
            الهيئات، والاعتمادات قيد المراجعة، وتلك المخطّطة ضمن خارطة الطريق. أي تحديث على أي بند
            يُسجَّل في <Link to="/sharia-changelog" className="text-primary underline">سجل التغييرات الشرعي</Link>.
          </div>
        </CardContent>
      </Card>

      {grouped.map(({ status, items }) =>
        items.length === 0 ? null : (
          <section key={status} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{CERT_STATUS_LABEL[status].ar}</h2>
              <Badge variant="outline">{items.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{c.body}</CardTitle>
                      <Badge className={`shrink-0 ${CERT_STATUS_LABEL[c.status].className}`}>
                        {CERT_STATUS_LABEL[c.status].ar}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.bodyEn} · {c.country}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">النطاق: </span>
                      {c.scope}
                    </div>
                    {c.reference && (
                      <div>
                        <span className="text-muted-foreground">المرجع: </span>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{c.reference}</code>
                      </div>
                    )}
                    {c.since && (
                      <div>
                        <span className="text-muted-foreground">منذ: </span>
                        {c.since}
                      </div>
                    )}
                    {c.notes && <p className="text-xs text-muted-foreground pt-1 border-t">{c.notes}</p>}
                    {c.url && (
                      <Button asChild variant="outline" size="sm" className="mt-2">
                        <a href={c.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5 ml-1" />
                          الموقع الرسمي
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ),
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">لطلب اعتماد رسمي أو تدقيق شرعي</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            نرحّب بتواصل الهيئات الشرعية والمدقّقين المستقلّين لبدء عملية اعتماد رسمي جديدة.
            نوفّر: وثائق الخوارزميات، سجل تدقيق كامل، ونسخة تجريبية معزولة للمراجعة.
          </p>
          <Button asChild>
            <Link to="/contact">تواصل معنا للاعتماد</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
