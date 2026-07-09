import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — حاسبة الزكاة" },
      {
        name: "description",
        content: "سياسة خصوصية منصة حاسبة الزكاة وكيفية تعاملها مع بيانات المستخدمين.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-sm text-primary hover:underline">
            ← العودة للحاسبة
          </Link>
          <h1 className="text-lg font-bold">سياسة الخصوصية</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-10 max-w-3xl prose prose-sm text-right leading-loose">
        <h2 className="text-2xl font-bold mb-4 text-primary">سياسة الخصوصية</h2>
        <p className="text-muted-foreground text-xs mb-6">
          آخر تحديث: {new Date().toLocaleDateString("ar-EG")}
        </p>

        <section className="space-y-4 text-sm">
          <div>
            <h3 className="font-bold text-base mb-1">١. طبيعة المنصة</h3>
            <p>
              منصة «حاسبة الزكاة» هي أداة استرشادية لحساب الزكاة وفق المعايير الشرعية. الحساب يتم
              بالكامل في متصفحك، ولا تُرسل بياناتك المالية إلى أي خوادم خارجية إلا ما تختار حفظه
              صراحةً (مثل سجلات بلوغ النصاب).
            </p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">٢. البيانات التي نجمعها</h3>
            <ul className="list-disc pr-6 space-y-1">
              <li>
                <b>لا نجمع</b> أرقام حسابات بنكية ولا أرقام بطاقات ائتمان ولا كلمات سر.
              </li>
              <li>عند حفظ سجل النصاب اختيارياً: نحفظ التاريخ والملاحظة فقط دون أي بيانات شخصية.</li>
              <li>
                قد يُسجَّل بشكل تقني (بدون ربط بهوية): زيارات الصفحات ومعلومات المتصفح لأغراض
                التحسين.
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">٣. الكوكيز والتخزين المحلي</h3>
            <p>
              قد نستخدم تخزين المتصفح المحلي لحفظ تفضيلاتك (اللغة، الدولة، آخر مدخلات). لا يُستخدم
              لأغراض إعلانية.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">
              ٤. حقوقك (وفق GDPR وقانون حماية البيانات المصري 151/2020)
            </h3>
            <ul className="list-disc pr-6 space-y-1">
              <li>الحق في الوصول إلى بياناتك وتصحيحها أو حذفها.</li>
              <li>الحق في سحب الموافقة في أي وقت.</li>
              <li>الحق في تقديم شكوى لجهة الإشراف المختصة.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">٥. التواصل</h3>
            <p>لأي استفسار بخصوص الخصوصية، يرجى مراسلتنا عبر القنوات الرسمية للمنصة.</p>
          </div>
        </section>

        <p className="text-xs text-muted-foreground mt-10 border-t pt-4 text-center">
          © {new Date().getFullYear()} منصة حاسبة الزكاة الشاملة — جميع الحقوق محفوظة.
        </p>
      </main>
    </div>
  );
}
