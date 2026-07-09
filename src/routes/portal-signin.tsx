import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, User, Building2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/portal-signin")({
  head: () => ({
    meta: [
      { title: "اختر نوع الحساب — تسجيل دخول موحّد" },
      {
        name: "description",
        content:
          "سجّل دخولك كمحاسب لإدارة عملائك، أو كفرد/شركة/مؤسسة لإرسال بياناتك واحتساب زكاتك.",
      },
      { property: "og:title", content: "تسجيل دخول موحّد" },
      { property: "og:description", content: "محاسب أو عميل — اختر الوجهة المناسبة" },
    ],
  }),
  component: PortalSignin,
});

type Option = {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  to: string;
  cta: string;
  highlight?: boolean;
  badge?: string;
};

function PortalSignin() {
  const options: Option[] = [
    {
      id: "accountant",
      title: "محاسب / مكتب محاسبة",
      desc: "أدر محفظة عملائك، احسب زكواتهم بشكل جماعي، وأصدر تقارير معتمدة.",
      icon: <Briefcase className="h-8 w-8" />,
      to: "/accountant",
      cta: "الدخول إلى بوابة المحاسب",
      highlight: true,
      badge: "احترافي",
    },
    {
      id: "individual",
      title: "فرد",
      desc: "احسب زكاتك السنوية، احفظ تاريخ حولك، واستقبل تذكيرات آلية.",
      icon: <User className="h-8 w-8" />,
      to: "/client-intake",
      cta: "ابدأ حساب زكاتي",
    },
    {
      id: "company",
      title: "شركة / مؤسسة",
      desc: "أرسل ميزانك للمحاسب المعتمد لاحتساب زكاة عروض التجارة والمخزون.",
      icon: <Building2 className="h-8 w-8" />,
      to: "/client-intake",
      cta: "إرسال بيانات الشركة",
    },
  ];

  return (
    <main className="container mx-auto max-w-5xl px-4 py-12 space-y-8" dir="rtl">
      <header className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">من أنت اليوم؟</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          نوجّهك إلى الواجهة الأنسب: بوابة المحاسب لإدارة العملاء، أو نافذة العميل لتقديم بياناتك
          بأمان.
        </p>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        {options.map((o) => (
          <Card
            key={o.id}
            className={`transition hover:shadow-lg ${o.highlight ? "border-primary/60 bg-primary/5" : ""}`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div
                  className={`p-3 rounded-lg ${o.highlight ? "bg-primary/15 text-primary" : "bg-muted"}`}
                >
                  {o.icon}
                </div>
                {o.badge && (
                  <Badge variant="secondary" className="text-[10px]">
                    {o.badge}
                  </Badge>
                )}
              </div>
              <CardTitle className="mt-3">{o.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground min-h-[3rem]">{o.desc}</p>
              <Button asChild className="w-full" variant={o.highlight ? "default" : "outline"}>
                <Link to={o.to}>{o.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
          <Link to="/auth" className="text-primary underline">
            تسجيل الدخول
          </Link>
        </p>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> العودة للرئيسية
          </Link>
        </Button>
      </div>
    </main>
  );
}
