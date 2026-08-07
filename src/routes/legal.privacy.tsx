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
      <main className="container mx-auto px-4 py-10 max-w-3xl prose prose-sm text-end leading-loose">
        <h2 className="text-2xl font-bold mb-4 text-primary">سياسة الخصوصية</h2>
        <p className="text-muted-foreground text-xs mb-6">
          آخر تحديث: {new Date().toLocaleDateString("ar-EG")}
        </p>

        <section className="space-y-4 text-sm">
          <div>
            <h3 className="font-bold text-base mb-1">١. طبيعة المنصة والتخزين</h3>
            <p>
              الحاسبات الأساسية دون تسجيل دخول تعمل في متصفحك مباشرة. لكن عند إنشاء حساب أو تسجيل
              الدخول، أو استخدام أي ميزة تتطلب حساباً (حفظ سجل زكوي، إصدار تقرير PDF موقَّع، بوابة
              المحاسب، الفرز الشرعي للأسهم، الاستشارة عبر الذكاء الاصطناعي، ربط ERP)، فإن البيانات
              ذات الصلة **تُخزَّن على خوادمنا** (قاعدة بيانات Supabase) — وليس في متصفحك فقط. هذا
              يشمل: سجلات الزكاة والمسودات وتاريخ التعديلات، تقارير PDF المُصدَرة وسجل تدقيقها،
              بيانات عملاء المحاسب (الاسم/الهاتف/البريد) عند استخدام بوابة المحاسب، نتائج فرز الأسهم
              الشرعي، وإعدادات ربط أنظمة ERP الخارجية.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">٢. البيانات التي نجمعها ومن يعالجها</h3>
            <ul className="list-disc pe-6 space-y-1">
              <li>
                <b>لا نجمع</b> أرقام حسابات بنكية ولا أرقام بطاقات ائتمان ولا كلمات سر — الدفع
                يُعالَج مباشرة عبر Stripe ولا تمر بيانات البطاقة بخوادمنا.
              </li>
              <li>
                بيانات الحساب والسجلات الزكوية المذكورة أعلاه تُخزَّن لدى <b>Supabase</b> (قاعدة
                البيانات والمصادقة)، ويُستضاف التطبيق عبر <b>Cloudflare</b>. هذه أطراف معالجة
                (processors) تقنية، لا أطراف تسويقية.
              </li>
              <li>
                عند استخدامك ميزة مدعومة بالذكاء الاصطناعي (مثل قراءة قوائم مالية أو الاستشارة
                الزكوية)، يُرسَل المحتوى الذي تُدخله تحديداً لمزوّد النموذج المُستخدَم لمعالجة تلك
                الميزة فقط.
              </li>
              <li>
                عزل بياناتك عن بيانات المستخدمين الآخرين مطبَّق عبر Row-Level Security بقاعدة
                البيانات.
              </li>
              <li>
                لا نبيع بياناتك ولا نستخدمها لأغراض إعلانية، ولا نشاركها مع أي طرف خارج المعالجين
                التقنيين أعلاه.
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">٣. الكوكيز والتخزين المحلي</h3>
            <p>
              نستخدم تخزين المتصفح المحلي لحفظ تفضيلاتك (اللغة، الدولة، حالة القوائم الجانبية،
              مسودات لم تُحفَظ بعد). لا يُستخدم لأغراض إعلانية أو تتبّع تسويقي عبر مواقع أخرى.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">
              ٤. حقوقك (وفق GDPR وقانون حماية البيانات المصري 151/2020)
            </h3>
            <ul className="list-disc pe-6 space-y-1">
              <li>الحق في الوصول إلى بياناتك وتصحيحها أو حذفها.</li>
              <li>الحق في سحب الموافقة في أي وقت.</li>
              <li>الحق في تقديم شكوى لجهة الإشراف المختصة.</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-1">
              حالياً تُنفَّذ طلبات الوصول/الحذف يدوياً عبر التواصل أدناه، وليس عبر أداة ذاتية داخل
              الحساب بعد — نعمل على إتاحة تصدير وحذف ذاتيَّين مباشرةً من الإعدادات.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">٥. التواصل</h3>
            <p>
              لأي استفسار أو طلب يخص الخصوصية أو بياناتك، راسلنا على{" "}
              <a href="mailto:privacy@nisab.app" className="text-primary underline">
                privacy@nisab.app
              </a>
              .
            </p>
          </div>
        </section>

        <p className="text-xs text-muted-foreground mt-10 border-t pt-4 text-center">
          © {new Date().getFullYear()} منصة حاسبة الزكاة الشاملة — جميع الحقوق محفوظة.
        </p>
      </main>
    </div>
  );
}
