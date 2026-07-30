// أدوات تشخيص جانب العميل: تفحص أسباب فشل تحميل الصفحة وتقترح إصلاحات تلقائية.

export type CheckStatus = "ok" | "warn" | "fail" | "running";

export type DiagnosticCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  hint?: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export async function runDiagnostics(): Promise<DiagnosticCheck[]> {
  const checks: DiagnosticCheck[] = [];

  // 1) الاتصال بالإنترنت
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  checks.push({
    id: "network",
    label: "الاتصال بالشبكة",
    status: online ? "ok" : "fail",
    detail: online ? "المتصفح متصل بالإنترنت" : "المتصفح غير متصل بالإنترنت",
    hint: online ? undefined : "تحقق من اتصال الشبكة ثم أعد المحاولة.",
  });

  // 2) متغيرات بيئة الاتصال بالخادم
  const missing = [
    ...(SUPABASE_URL ? [] : ["VITE_SUPABASE_URL"]),
    ...(SUPABASE_KEY ? [] : ["VITE_SUPABASE_PUBLISHABLE_KEY"]),
  ];
  checks.push({
    id: "env",
    label: "إعدادات الاتصال بالخدمة السحابية",
    status: missing.length === 0 ? "ok" : "fail",
    detail:
      missing.length === 0
        ? "مفاتيح الاتصال محمّلة في هذه النسخة"
        : `متغيرات ناقصة: ${missing.join("، ")}`,
    hint:
      missing.length === 0
        ? undefined
        : "هذه غالباً نسخة معاينة قديمة بُنيت قبل ضبط المفاتيح — نفّذ «تحديث قسري» أو أعد النشر.",
  });

  // 3) صحة خادم التطبيق
  try {
    const t0 = performance.now();
    const res = await withTimeout(fetch("/api/public/health", { cache: "no-store" }), 8000);
    const ms = Math.round(performance.now() - t0);
    checks.push({
      id: "app-server",
      label: "خادم التطبيق (/api/public/health)",
      status: res.ok ? "ok" : "fail",
      detail: `HTTP ${res.status} · ${ms}ms`,
      hint: res.ok ? undefined : "الخادم يرد بخطأ — أعد المحاولة بعد قليل أو أعد النشر.",
    });
  } catch (e) {
    checks.push({
      id: "app-server",
      label: "خادم التطبيق (/api/public/health)",
      status: "fail",
      detail: e instanceof Error ? e.message : "فشل الطلب",
      hint: "قد يكون Service Worker قديماً يخدم ملفات قديمة — نفّذ «تحديث قسري».",
    });
  }

  // 4) الوصول إلى قاعدة البيانات/المصادقة
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const t0 = performance.now();
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/auth/v1/health`, {
          headers: { apikey: SUPABASE_KEY },
          cache: "no-store",
        }),
        8000,
      );
      const ms = Math.round(performance.now() - t0);
      checks.push({
        id: "supabase",
        label: "الخدمة السحابية (المصادقة وقاعدة البيانات)",
        status: res.ok ? "ok" : "fail",
        detail: `HTTP ${res.status} · ${ms}ms`,
        hint: res.ok
          ? undefined
          : "تعذّر الوصول للخدمة السحابية — تحقق من حالة الخدمة ثم أعد المحاولة.",
      });
    } catch (e) {
      checks.push({
        id: "supabase",
        label: "الخدمة السحابية (المصادقة وقاعدة البيانات)",
        status: "fail",
        detail: e instanceof Error ? e.message : "فشل الطلب",
        hint: "غالباً حجب من الشبكة/إضافة متصفح، أو انقطاع مؤقت. جرّب «تحديث قسري».",
      });
    }
  } else {
    checks.push({
      id: "supabase",
      label: "الخدمة السحابية (المصادقة وقاعدة البيانات)",
      status: "fail",
      detail: "لا يمكن الفحص لعدم توفر مفاتيح الاتصال",
      hint: "أصلح مشكلة المفاتيح أولاً (تحديث قسري / إعادة نشر).",
    });
  }

  // 5) Service Worker والكاش
  try {
    const regs =
      typeof navigator !== "undefined" && "serviceWorker" in navigator
        ? await navigator.serviceWorker.getRegistrations()
        : [];
    const cacheNames = typeof caches !== "undefined" ? await caches.keys() : [];
    const stale = regs.length > 0 && import.meta.env.DEV;
    checks.push({
      id: "sw",
      label: "ذاكرة التخزين المؤقت وService Worker",
      status: stale ? "warn" : "ok",
      detail: `${regs.length} عامل خدمة · ${cacheNames.length} مخزن كاش`,
      hint:
        regs.length > 0 || cacheNames.length > 0
          ? "إن ظهرت شاشة «تعذّر تحميل الصفحة» رغم سلامة الفحوصات، نظّف الكاش عبر «تحديث قسري»."
          : undefined,
    });
  } catch {
    checks.push({
      id: "sw",
      label: "ذاكرة التخزين المؤقت وService Worker",
      status: "warn",
      detail: "تعذّر قراءة حالة الكاش",
    });
  }

  // 6) التخزين المحلي
  try {
    localStorage.setItem("__diag__", "1");
    localStorage.removeItem("__diag__");
    checks.push({
      id: "storage",
      label: "التخزين المحلي للمتصفح",
      status: "ok",
      detail: "متاح للكتابة (الجلسة والأرشيف المحلي يعملان)",
    });
  } catch {
    checks.push({
      id: "storage",
      label: "التخزين المحلي للمتصفح",
      status: "fail",
      detail: "محظور (وضع التصفح الخاص أو إعدادات الكوكيز)",
      hint: "افتح التطبيق في نافذة عادية واسمح بتخزين بيانات الموقع.",
    });
  }

  return checks;
}

/** إصلاح تلقائي: إلغاء تسجيل عمّال الخدمة + مسح كل مخازن الكاش ثم إعادة تحميل قسرية. */
export async function hardRefresh(): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* تجاهل */
  }
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* تجاهل */
  }
  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString(36));
  window.location.replace(url.toString());
}

/** إصلاح تلقائي: مسح بيانات الجلسة المخزّنة محلياً (يُخرجك من الحساب). */
export async function clearSessionData(): Promise<void> {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("sb-") || k.includes("supabase"))
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {
    /* تجاهل */
  }
}

export function diagnosticsSummary(checks: DiagnosticCheck[]): string {
  return [
    `التقرير التشخيصي — ${new Date().toISOString()}`,
    `المسار: ${typeof window !== "undefined" ? window.location.href : "-"}`,
    `المتصفح: ${typeof navigator !== "undefined" ? navigator.userAgent : "-"}`,
    "",
    ...checks.map((c) => `[${c.status.toUpperCase()}] ${c.label}: ${c.detail}`),
  ].join("\n");
}
