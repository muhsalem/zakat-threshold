/**
 * أكواد الأخطاء الموحّدة وهيكل الاستجابة الثابت لواجهة API v1
 * ------------------------------------------------------------
 * كل خطأ في `/api/public/v1/*` يخرج بالشكل نفسه:
 *
 * {
 *   "apiVersion": "v1",
 *   "status": "error",
 *   "code": 422,                       // رمز HTTP (توافقية)
 *   "error": {
 *     "code": "ZKT-1010",              // كود ثابت لا يتغيّر بين الإصدارات
 *     "type": "validation_failed",     // اسم قابل للقراءة برمجياً
 *     "httpStatus": 422,
 *     "message": "…",                  // عربي
 *     "messageEn": "…",                // إنجليزي
 *     "details": [ { code, field?, message, messageEn?, remediation? } ],
 *     "docs": "https://…/developers#errors"
 *   },
 *   "requestId": "…",
 *   "timestamp": "ISO-8601"
 * }
 *
 * أخطاء تحقق القواعد الشرعية لا تُفشل الطلب دائماً؛ فعندما تُنتَج نتيجة
 * «مبدئية» تُرجَع أسبابها التفصيلية داخل `rules.failures` بنفس بنية `details`
 * وبنفس أكواد ZKT-2xxx، ليعرف المستهلك بالضبط لماذا لم تُعتمد النتيجة.
 */

/* ------------------------------ كتالوج الأكواد ----------------------------- */

export type V1ErrorCode =
  // 1xxx — الطلب والمدخلات
  | "ZKT-1000" // خطأ داخلي
  | "ZKT-1001" // JSON غير صالح
  | "ZKT-1002" // نوع محتوى غير مدعوم
  | "ZKT-1010" // فشل تحقق المدخلات
  | "ZKT-1030" // بصمة محتوى بصيغة غير صحيحة
  | "ZKT-1040" // تجاوز حد الطلبات
  // 2xxx — تحقق القواعد الشرعية
  | "ZKT-2001" // لا توجد قاعدة مسجَّلة للبند
  | "ZKT-2002" // القاعدة محجوبة/غير مفعّلة
  | "ZKT-2003" // خلل في سلامة كتالوج القواعد
  | "ZKT-2004" // الحول غير مكتمل
  | "ZKT-2005"; // القاعدة تتطلّب مراجعة بشرية

interface ErrorSpec {
  type: string;
  httpStatus: number;
  message: string;
  messageEn: string;
}

export const V1_ERRORS: Record<V1ErrorCode, ErrorSpec> = {
  "ZKT-1000": {
    type: "internal_error",
    httpStatus: 500,
    message: "خطأ داخلي غير متوقع أثناء معالجة الطلب.",
    messageEn: "Unexpected internal error while processing the request.",
  },
  "ZKT-1001": {
    type: "invalid_json_payload",
    httpStatus: 400,
    message: "جسم الطلب ليس JSON صالحاً.",
    messageEn: "Request body is not valid JSON.",
  },
  "ZKT-1002": {
    type: "unsupported_media_type",
    httpStatus: 415,
    message: "نوع المحتوى غير مدعوم — استخدم application/json.",
    messageEn: "Unsupported content type — use application/json.",
  },
  "ZKT-1010": {
    type: "validation_failed",
    httpStatus: 422,
    message: "فشل تحقق المدخلات — راجع تفاصيل الحقول.",
    messageEn: "Input validation failed — see field details.",
  },
  "ZKT-1030": {
    type: "invalid_content_hash",
    httpStatus: 422,
    message: "بصمة المحتوى يجب أن تكون SHA-256 بصيغة hex من 64 محرفاً.",
    messageEn: "contentHash must be a 64-character lowercase SHA-256 hex digest.",
  },
  "ZKT-1040": {
    type: "rate_limited",
    httpStatus: 429,
    message: "تجاوزت حد الطلبات المسموح — أعد المحاولة لاحقاً.",
    messageEn: "Rate limit exceeded — retry later.",
  },
  "ZKT-2001": {
    type: "rule_not_registered",
    httpStatus: 422,
    message: "لا توجد قاعدة شرعية مسجَّلة في الكتالوج تحكم هذا البند.",
    messageEn: "No catalog rule governs this input field.",
  },
  "ZKT-2002": {
    type: "rule_not_active",
    httpStatus: 422,
    message: "القاعدة الحاكمة للبند محجوبة أو لم تدخل حيّز النفاذ.",
    messageEn: "The governing rule is blocked or not yet effective.",
  },
  "ZKT-2003": {
    type: "catalog_integrity_issue",
    httpStatus: 422,
    message: "كتالوج القواعد يحتوي ملاحظات سلامة تمنع الاعتماد.",
    messageEn: "The rules catalog has integrity issues preventing certification.",
  },
  "ZKT-2004": {
    type: "hawl_incomplete",
    httpStatus: 422,
    message: "لم يكتمل الحول — النتيجة تقديرية ولا تُعتمد للإقرار.",
    messageEn: "Hawl (lunar year) is incomplete — result is provisional.",
  },
  "ZKT-2005": {
    type: "requires_human_review",
    httpStatus: 422,
    message: "أحد البنود تحكمه قاعدة تستلزم مراجعة شرعية بشرية.",
    messageEn: "An applied rule requires human Shariah review.",
  },
};

export const V1_ERROR_DOCS_URL = "https://nisab.app/developers#errors";

/* ------------------------------ بنية التفاصيل ------------------------------ */

export interface V1ErrorDetail {
  /** كود ثابت من كتالوج ZKT — مناسب للتفريع البرمجي */
  code: V1ErrorCode;
  /** اسم قابل للقراءة (مطابق لـ type في الكتالوج) */
  type: string;
  /** الحقل المسبِّب إن وُجد (مسار بنقاط) */
  field?: string;
  /** معرّف القاعدة الشرعية إن كان الخطأ من تحقق القواعد */
  ruleId?: string;
  /** رسالة تفصيلية تشرح سبب الفشل بالضبط */
  message: string;
  /** أسباب فرعية (مثلاً أسباب حجب القاعدة) */
  reasons?: string[];
  /** إجراء مقترح لتجاوز السبب */
  remediation?: string;
  severity: "error" | "warning";
}

export function detail(
  code: V1ErrorCode,
  overrides: Partial<Omit<V1ErrorDetail, "code" | "type">> & { message?: string } = {},
): V1ErrorDetail {
  const spec = V1_ERRORS[code];
  return {
    code,
    type: spec.type,
    message: overrides.message ?? spec.message,
    severity: overrides.severity ?? "error",
    ...(overrides.field ? { field: overrides.field } : {}),
    ...(overrides.ruleId ? { ruleId: overrides.ruleId } : {}),
    ...(overrides.reasons?.length ? { reasons: overrides.reasons } : {}),
    ...(overrides.remediation ? { remediation: overrides.remediation } : {}),
  };
}

/* ------------------------------ مغلّف الاستجابة ----------------------------- */

export interface V1ErrorPayload {
  apiVersion: "v1";
  status: "error";
  /** رمز HTTP — مُبقى للتوافق مع مستهلكي v1 الحاليين */
  code: number;
  error: {
    code: V1ErrorCode;
    type: string;
    httpStatus: number;
    message: string;
    messageEn: string;
    details: V1ErrorDetail[];
    docs: string;
  };
  /** نسخة مسطّحة من التفاصيل — توافق مع الحقل القديم `errors` */
  errors: V1ErrorDetail[];
  requestId: string;
  timestamp: string;
}

function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function v1Error(
  code: V1ErrorCode,
  opts: {
    details?: V1ErrorDetail[];
    message?: string;
    requestId?: string;
    httpStatus?: number;
  } = {},
): { status: number; payload: V1ErrorPayload } {
  const spec = V1_ERRORS[code];
  const httpStatus = opts.httpStatus ?? spec.httpStatus;
  const details = opts.details ?? [];
  return {
    status: httpStatus,
    payload: {
      apiVersion: "v1",
      status: "error",
      code: httpStatus,
      error: {
        code,
        type: spec.type,
        httpStatus,
        message: opts.message ?? spec.message,
        messageEn: spec.messageEn,
        details,
        docs: V1_ERROR_DOCS_URL,
      },
      errors: details,
      requestId: opts.requestId ?? newRequestId(),
      timestamp: new Date().toISOString(),
    },
  };
}

/** استجابة HTTP جاهزة بالمغلّف الموحّد */
export function v1ErrorResponse(
  code: V1ErrorCode,
  headers: Record<string, string>,
  opts: Parameters<typeof v1Error>[1] & { extraHeaders?: Record<string, string> } = {},
): Response {
  const { status, payload } = v1Error(code, opts);
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, ...(opts.extraHeaders ?? {}) },
  });
}

/** كتالوج الأكواد للعرض في التوثيق و`GET /api/public/v1/rules` */
export function listV1ErrorCodes() {
  return (Object.keys(V1_ERRORS) as V1ErrorCode[]).map((code) => ({
    code,
    ...V1_ERRORS[code],
  }));
}
