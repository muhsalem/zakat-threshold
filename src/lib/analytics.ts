/**
 * تحليلات المنتج — من الطرف الأول، بلا أداة SaaS خارجية (Sentry يبقى
 * مخصَّصاً للأخطاء فقط). يسدّ فجوة تدقيق: «لا تحليلات منتج ولا North Star».
 *
 * المقياس النجمي الشمالي (North Star Metric):
 *   «عدد تقارير الزكاة المعتمدة الصادرة شهرياً»
 *   — يربط القيمة الشرعية (تقرير معتمد صحيح) بالقيمة التجارية (إيراد) معاً
 *   مباشرة، بخلاف مقاييس الغرور (زيارات، تسجيلات) التي لا تقيس أياً منهما.
 *
 * القمع المُتتبَّع (Funnel):
 *   landing_view → calculator_started → calculation_completed
 *   → report_exported → certified_report_requested (= يقترب من النجم الشمالي)
 *
 * خصوصية: لا يُسجَّل أي مبلغ مالي أو بيانات شخصية — فقط اسم الحدث وسياق
 * غير حساس (نوع الحاسبة، صيغة التصدير، الصفحة). فشل الشبكة يُكتم صامتاً
 * (تحليلات لا يجب أن تكسر تجربة المستخدم أبداً).
 */
import { supabase } from "@/integrations/supabase/client";
import { hasAnalyticsConsent } from "@/lib/consent";

export type ProductEventName =
  | "landing_view"
  | "calculator_started"
  | "calculation_completed"
  | "report_exported"
  | "certified_report_requested"
  | "intake_form_submitted";

const SESSION_KEY = "nisab.analytics.session_id";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "no-session-storage";
  }
}

/** يسجّل حدث قمع — fire-and-forget، لا يرمي أبداً، لا يعطّل واجهة المستخدم */
export function trackEvent(name: ProductEventName, properties: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return; // SSR — لا تسجيل من الخادم
  if (!hasAnalyticsConsent()) return; // لا كتابة قبل موافقة صريحة (بانر الموافقة)
  try {
    void supabase.auth
      .getUser()
      .then(({ data }) =>
        // جدول product_events غير مُدرج بعد في الأنواع المولَّدة تلقائياً
        // (types.ts) لأن هجرته حديثة — from<any> مؤقت يُزال عند إعادة توليد
        // الأنواع بعد مزامنة Supabase القادمة.
        (supabase.from("product_events" as never) as any).insert({
          event_name: name,
          session_id: getSessionId(),
          user_id: data.user?.id ?? null,
          properties,
        }),
      )
      .catch(() => {});
  } catch {
    /* التحليلات لا تُفشل أي مسار مستخدم أبداً */
  }
}
