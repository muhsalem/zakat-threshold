/**
 * منطق تقييم الصحة — نقيّ وقابل للاختبار، منفصل عن الوصول لقاعدة البيانات.
 *
 * سبب وجوده: كان /api/public/health يعيد ok:true دائماً مع فحوص نصّية ثابتة
 * ("fatwa_engine":"ok") لا تقيس شيئاً. فحصٌ لا يرسب أبداً يجعل المراقبة
 * تُظهر أخضر بينما الأسعار مجمَّدة منذ أيام — وهو أسوأ من غياب الفحص لأنه
 * يمنح ثقة كاذبة.
 */

export type Status = "ok" | "degraded" | "down";

export type CheckResult = {
  status: Status;
  age_seconds: number | null;
  detail: string;
};

/** تقادُم بيانات دورية مقابل عتبتَي تحذير وسقوط. */
export function freshness(
  lastAt: string | null | undefined,
  opts: { degradedAfterSec: number; downAfterSec: number; label: string; now?: number },
): CheckResult {
  const now = opts.now ?? Date.now();
  if (!lastAt) {
    return { status: "down", age_seconds: null, detail: `${opts.label}: لا يوجد سجل إطلاقاً` };
  }
  const t = Date.parse(lastAt);
  if (Number.isNaN(t)) {
    return { status: "down", age_seconds: null, detail: `${opts.label}: طابع زمني غير صالح` };
  }
  const age = Math.max(0, Math.round((now - t) / 1000));
  if (age >= opts.downAfterSec) {
    return { status: "down", age_seconds: age, detail: `${opts.label}: متوقّف منذ ${age}ث` };
  }
  if (age >= opts.degradedAfterSec) {
    return { status: "degraded", age_seconds: age, detail: `${opts.label}: متأخّر ${age}ث` };
  }
  return { status: "ok", age_seconds: age, detail: `${opts.label}: محدَّث` };
}

/** أسوأ حالة تحكم النتيجة الكلية — لا يكفي أن يكون بعضها سليماً. */
export function overall(results: Status[]): Status {
  if (results.includes("down")) return "down";
  if (results.includes("degraded")) return "degraded";
  return "ok";
}

/** الحالة تُترجم لرمز HTTP تفهمه أنظمة المراقبة دون قراءة الجسم. */
export function httpStatusFor(s: Status): number {
  return s === "down" ? 503 : 200;
}
