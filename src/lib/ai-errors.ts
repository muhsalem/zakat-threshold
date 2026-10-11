/** User-facing messages for AI analysis error codes thrown by history-ask functions. */
const MSG: Record<string, { ar: string; en: string }> = {
  QUESTION_SHORT: { ar: "اكتب سؤالًا أوضح (3 أحرف على الأقل).", en: "Please write a clearer question (at least 3 characters)." },
  NO_DATA: { ar: "لا توجد بيانات كافية في الرسم لهذه المدة. جرّب مدة أطول أو عملة أخرى.", en: "Not enough chart data for this period. Try a longer range." },
  RATE_LIMIT: { ar: "الخدمة مشغولة الآن. انتظر دقيقة ثم أعد المحاولة.", en: "The service is busy. Wait a minute and try again." },
  CREDITS: { ar: "توقّف التحليل مؤقتًا لنفاد رصيد الذكاء الاصطناعي للمنصة.", en: "Analysis is paused: the platform has run out of AI credits." },
  DENIED: { ar: "تعذّر تنفيذ التحليل لهذا الطلب.", en: "This request could not be analyzed." },
  EMPTY: { ar: "لم يُرجع النموذج إجابة. أعد صياغة السؤال بشكل أبسط.", en: "No answer was returned. Try a simpler question." },
  CONFIG: { ar: "خدمة التحليل غير مهيأة حاليًا.", en: "The analysis service is not configured." },
  FAILED: { ar: "حدث خطأ أثناء التحليل. أعد المحاولة بعد قليل.", en: "Something went wrong during analysis. Please try again shortly." },
};

export function aiErrorMessage(e: unknown, ar: boolean): string {
  const raw = e instanceof Error ? e.message : String(e);
  const code = Object.keys(MSG).find((k) => raw.includes(k)) ?? (/fetch|network/i.test(raw) ? "NETWORK" : "FAILED");
  if (code === "NETWORK") return ar ? "تعذّر الاتصال. تحقق من الإنترنت ثم أعد المحاولة." : "Connection failed. Check your internet and retry.";
  const m = MSG[code]!;
  return ar ? m.ar : m.en;
}
