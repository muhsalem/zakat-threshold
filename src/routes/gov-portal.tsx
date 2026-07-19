import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, FileCheck2, Send, Info, Users, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/gov-portal")({
  head: () => ({
    meta: [
      { title: "بوابة الجهات الحكومية | نصاب" },
      {
        name: "description",
        content:
          "بوابة مخصّصة للجهات الحكومية: هيئات الزكاة، الأوقاف، والجمعيات لإدارة المكلَّفين والتقارير.",
      },
    ],
  }),
  component: GovPortal,
});

const FEATURES = [
  {
    icon: Users,
    title: "إدارة المكلَّفين",
    desc: "استعراض جميع مكلَّفي الجهة، حالة الإخراج، ومتابعة الاستحقاقات",
  },
  {
    icon: FileCheck2,
    title: "تقارير معتمَدة",
    desc: "تصدير تقارير XBRL/PDF مطابقة لمتطلّبات ZATCA وبيت الزكاة",
  },
  { icon: Send, title: "API حكومية آمنة", desc: "قناة تكامل عبر mTLS مع أنظمة الجهة (SIEM/ERP)" },
  {
    icon: Building2,
    title: "متعدّد المستأجرين",
    desc: "عزل بيانات كامل لكل جهة مع لوحة تحكم مستقلّة",
  },
];

const PARTNERS = [
  { name: "ZATCA — السعودية", stage: "قيد التفاوض", ref: "https://zatca.gov.sa" },
  { name: "بيت الزكاة — الكويت", stage: "مذكّرة تفاهم مبدئية", ref: "https://zakathouse.org.kw" },
  { name: "هيئة الزكاة والدخل — قطر", stage: "استكشاف", ref: "#" },
  { name: "الهيئة العامة للأوقاف — السعودية", stage: "استكشاف", ref: "https://awqaf.gov.sa" },
];

function GovPortal() {
  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-4">
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            بوابة الجهات الحكومية
            <Badge variant="secondary" className="me-auto">
              Government Portal — Preview
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription className="text-xs">
              نطوّر بوابة مستقلّة لهيئات الزكاة، ديوان الأوقاف، والجمعيات الخيرية الكبرى، تعمل بمعزل
              عن نسخة المستخدم النهائي، مع API متوافق وتقارير XBRL. للتسجيل المبكّر تواصلوا مع
              فريقنا المؤسسي.
            </AlertDescription>
          </Alert>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded border p-3">
                <f.icon className="w-5 h-5 text-primary mb-2" />
                <div className="font-semibold text-sm">{f.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
              </div>
            ))}
          </section>

          <section>
            <h3 className="font-semibold mb-2 text-sm">الشراكات المستهدفة</h3>
            <div className="rounded border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-end p-2">الجهة</th>
                    <th className="text-center p-2">المرحلة</th>
                    <th className="text-center p-2">مرجع</th>
                  </tr>
                </thead>
                <tbody>
                  {PARTNERS.map((p) => (
                    <tr key={p.name} className="border-t">
                      <td className="p-2 font-medium">{p.name}</td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className="text-[11px]">
                          {p.stage}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        {p.ref !== "#" ? (
                          <a
                            href={p.ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> زيارة
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="rounded border border-primary/40 bg-primary/5 p-4 text-sm">
            <p className="font-medium mb-2">للجهات الراغبة في التكامل:</p>
            <p className="text-xs text-muted-foreground mb-3">
              نوفّر بيئة اختبار (Sandbox) معزولة، توثيق OpenAPI كامل، ودعم فنّي مخصّص خلال 48 ساعة
              عمل. يشمل التكامل: تسجيل المكلَّفين المؤسسيين، مطابقة القوائم عبر{" "}
              <Link to="/kyc-aml" className="underline text-primary">
                KYC/AML
              </Link>
              ، وتصدير التقارير المعتمدة عبر{" "}
              <Link to="/enterprise" className="underline text-primary">
                لوحة المؤسسات
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/enterprise-pricing"
                className="inline-flex items-center gap-1 rounded bg-primary text-primary-foreground px-3 py-1.5 text-xs"
              >
                <Send className="w-3 h-3" /> طلب عرض حكومي
              </Link>
              <Link
                to="/institutional-endorsements"
                className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs"
              >
                عرض الاعتمادات
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
