import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — حاسبة الزكاة" },
      { name: "description", content: "شروط استخدام منصة حاسبة الزكاة وإخلاء المسؤولية الفقهية." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-sm text-primary hover:underline">← العودة للحاسبة</Link>
          <h1 className="text-lg font-bold">شروط الاستخدام</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-10 max-w-3xl text-right leading-loose">
        <h2 className="text-2xl font-bold mb-4 text-primary">شروط الاستخدام وإخلاء المسؤولية</h2>
        <p className="text-muted-foreground text-xs mb-6">آخر تحديث: {new Date().toLocaleDateString("ar-EG")}</p>

        <section className="space-y-4 text-sm">
          <div>
            <h3 className="font-bold text-base mb-1">١. طبيعة الخدمة</h3>
            <p>منصة «حاسبة الزكاة» <b>أداة استرشادية فقهية‑محاسبية</b> تستند إلى المعايير الشرعية الدولية (AAOIFI رقم 35)، وفتاوى المجامع الفقهية المعاصرة، وأبحاث بيت الزكاة الكويتي. <b>لا تُعدّ نتائج المنصة فتوى شرعية ملزمة</b>، ولا تقريراً حكومياً معتمداً، ولا بديلاً عن استشارة عالم أو مفتٍ معتمد.</p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">٢. حدود المسؤولية</h3>
            <ul className="list-disc pr-6 space-y-1">
              <li>المسؤولية الشرعية والمالية الكاملة تقع على عاتق المُزكِّي.</li>
              <li>لا تتحمل المنصة أي مسؤولية عن أي خسارة أو ضرر مباشر أو غير مباشر ناتج عن الاعتماد على نتائج الحاسبة.</li>
              <li>دقة النتائج تعتمد كلياً على دقة البيانات التي يُدخلها المستخدم.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">٣. الملكية الفكرية</h3>
            <p>جميع حقوق التصميم والمعادلات الحسابية والكود البرمجي والمحتوى التحريري محفوظة لمنصة «حاسبة الزكاة». يُسمح بالاستخدام الشخصي وغير التجاري. لا يجوز إعادة نشر أو نسخ أو تعديل المنصة دون إذن كتابي مسبق.</p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">٤. التقرير المُصدَر</h3>
            <p>التقرير المطبوع يحمل رقماً تسلسلياً وكود QR للتحقق من إصداره. يحق للمستخدم استخدامه كوثيقة استرشادية شخصية لا كمستند رسمي أمام الجهات الحكومية.</p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">٥. التعديلات</h3>
            <p>تحتفظ المنصة بحقها في تعديل هذه الشروط في أي وقت، ويسري التعديل من تاريخ نشره.</p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">٦. القانون الحاكم</h3>
            <p>تخضع هذه الشروط لقوانين جمهورية مصر العربية، وأي نزاع ينشأ يتم حله ودياً، ثم أمام المحاكم المختصة.</p>
          </div>
        </section>

        <p className="text-xs text-muted-foreground mt-10 border-t pt-4 text-center">
          © {new Date().getFullYear()} منصة حاسبة الزكاة الشاملة — جميع الحقوق محفوظة.
        </p>
      </main>
    </div>
  );
}
