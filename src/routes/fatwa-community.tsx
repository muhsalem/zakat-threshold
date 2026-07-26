import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, BookOpen, MessageSquare, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/fatwa-community")({
  head: () => ({
    meta: [
      { title: "مجتمع الفتاوى الشرعية | نصاب" },
      {
        name: "description",
        content: "منصة مفتوحة لطرح المسائل الزكوية المستجدّة ومراجعتها من مجلس علماء متعاون.",
      },
    ],
  }),
  component: FatwaCommunity,
});

const BOARDS = [
  { name: "AAOIFI", url: "https://aaoifi.com", scope: "معايير المحاسبة والمراجعة الإسلامية" },
  {
    name: "المجمع الفقهي الإسلامي (رابطة العالم الإسلامي)",
    url: "https://themwl.org",
    scope: "قرارات جماعية دولية",
  },
  {
    name: "مجمع الفقه الإسلامي الدولي (OIC)",
    url: "https://iifa-aifi.org",
    scope: "قرارات المجمع بمكة/جدة",
  },
  {
    name: "دار الإفتاء المصرية",
    url: "https://www.dar-alifta.org",
    scope: "فتاوى تفصيلية بالعربية",
  },
  { name: "IslamQA (بإشراف علماء)", url: "https://islamqa.info", scope: "مسائل معاصرة موثّقة" },
];

const OPEN_QUESTIONS = [
  { q: "زكاة العملات الرقمية غير المدعومة بأصل", status: "قيد الدراسة" },
  { q: "زكاة نقاط الولاء (Miles/Points)", status: "قيد الدراسة" },
  { q: "زكاة NFT الفنية مقابل NFT التوثيقية", status: "قيد الدراسة" },
  { q: "زكاة عقود المشتقات الإسلامية (وعد ملزم)", status: "مفتوح للنقاش" },
];

function FatwaCommunity() {
  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4">
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            مجتمع الفتاوى الزكوية
            <Badge variant="secondary" className="me-auto">
              Beta
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <MessageSquare className="w-4 h-4" />
            <AlertDescription className="text-xs">
              نبني منصة مفتوحة تجمع المكلَّفين والمحاسبين وطلبة العلم لطرح المسائل الزكوية
              المستجدّة. الهدف مراجعتها عبر شراكات مع مجالس شرعية معتمدة قبل النشر — هذه الشراكات
              لم تُعقَد بعد، والمحتوى الحالي استرشادي فقط.
            </AlertDescription>
          </Alert>

          <section>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> المراجع الشرعية المعتمدة
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {BOARDS.map((b) => (
                <a
                  key={b.name}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded border p-3 hover:bg-muted/40 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{b.name}</div>
                      <div className="text-xs text-muted-foreground">{b.scope}</div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </a>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-2">مسائل مطروحة للنقاش</h3>
            <ul className="space-y-2">
              {OPEN_QUESTIONS.map((o) => (
                <li
                  key={o.q}
                  className="rounded border p-3 flex items-center justify-between gap-2"
                >
                  <span className="text-sm">{o.q}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {o.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>

          <div className="rounded border border-primary/40 bg-primary/5 p-4 text-sm">
            <p className="mb-2">
              للمشاركة، يمكنك{" "}
              <Link to="/advisor" className="text-primary underline">
                فتح استشارة عبر الذكاء الاصطناعي
              </Link>{" "}
              أولاً، ثم رفع النتيجة للمراجعة البشرية عبر{" "}
              <Link to="/client-intake" className="text-primary underline">
                نافذة استقبال العملاء
              </Link>
              .
            </p>
            <p className="text-xs text-muted-foreground">
              مبادرة غير هادفة للربح — نعمل على ترتيب إشراف مستشارين شرعيين مستقلين، ولم يُتعاقَد
              مع أي منهم بعد.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
