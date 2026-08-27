import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/siteUrl";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
};

// OpenAPI 3.1 specification — auto-served for enterprise / ERP integrations.
// Consumed by Postman, Swagger UI, Insomnia, and code generators.
const SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Zakat Calculator Public API",
    version: "1.0.0",
    description:
      "المرجع البرمجي الرسمي لحاسبة الزكاة — نقاط نهاية عامة للحساب، النصاب، وأسعار المعادن التاريخية. متوافق مع AAOIFI Shariah Standard No. 35.",
    contact: { name: "Zakat Calculator", url: "https://zakat.lovable.app" },
    license: { name: "Proprietary" },
    "x-shariah-standards": ["AAOIFI-35", "AAOIFI-59", "IFA-OIC"],
  },
  // مُخدِّم واحد يُشتق من VITE_SITE_URL. كان هنا مُخدِّمان مثبَّتان على
  // نطاقَي معاينة (أساسي وdev)، فيُعلَن للمستهلكين عنوانٌ غير عنوان الإنتاج.
  servers: [
    {
      url: SITE_URL,
      description: "Zakat API",
    },
  ],
  paths: {
    "/api/public/calc": {
      post: {
        summary: "Calculate Zakat",
        description:
          "احتساب زكاة المال بناءً على صافي الأصول والنصاب. يدعم التقويم الهجري (2.5%) والميلادي (2.577% وفق الندوة السابعة).",
        tags: ["Calculation"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CalcInput" },
              example: { assets: 100000, liabilities: 5000, nisab: 42500, calendar: "hijri" },
            },
          },
        },
        responses: {
          "200": {
            description: "Zakat calculated",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/CalcResult" } },
            },
          },
          "400": { description: "Invalid input" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
    "/api/public/nisab": {
      get: {
        summary: "Get current Nisab",
        description: "قيمة النصاب الحالية بالذهب (85 جم) والفضة (595 جم).",
        tags: ["Reference Data"],
        responses: {
          "200": {
            description: "Current nisab values",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Nisab" } },
            },
          },
        },
      },
    },
    "/api/public/prices/history": {
      get: {
        summary: "Historical metal prices",
        description: "أسعار الذهب والفضة التاريخية منذ 1975 حتى اليوم.",
        tags: ["Reference Data"],
        parameters: [
          { name: "metal", in: "query", required: true, schema: { enum: ["gold", "silver"] } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 5000, default: 500 },
          },
        ],
        responses: {
          "200": {
            description: "Historical prices",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/PriceHistory" } },
            },
          },
        },
      },
    },
    "/api/public/erp/journal": {
      get: {
        summary: "Sample ERP journal entry",
        description:
          "يرجع قيداً محاسبياً تجريبيًا بالصيغة المطلوبة (?format=quickbooks|xero|odoo|netsuite|sap|csv|xbrl|generic).",
        tags: ["ERP"],
        parameters: [
          {
            name: "format",
            in: "query",
            schema: {
              enum: ["generic", "quickbooks", "xero", "odoo", "netsuite", "sap", "csv", "xbrl"],
              default: "generic",
            },
          },
        ],
        responses: { "200": { description: "Sample journal entry" } },
      },
      post: {
        summary: "Build ERP journal entry from a zakat calculation",
        description:
          "يحوّل نتيجة حساب الزكاة إلى قيد محاسبي مزدوج (Dr Zakat Expense / Cr Zakat Payable) بالصيغة المختارة، مع إمكانية التنزيل كمرفق (?download=1).",
        tags: ["ERP"],
        parameters: [
          {
            name: "format",
            in: "query",
            schema: {
              enum: ["generic", "quickbooks", "xero", "odoo", "netsuite", "sap", "csv", "xbrl"],
              default: "generic",
            },
          },
          { name: "download", in: "query", schema: { type: "boolean" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ErpJournalInput" } },
          },
        },
        responses: {
          "200": { description: "Journal entry rendered in requested format" },
          "422": { description: "Missing or invalid field" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
    "/api/public/health": {
      get: {
        summary: "Service health check",
        description: "حالة التشغيل، وقت الإقلاع، وفحوص فرعية سريعة (بلا بيانات حساسة).",
        tags: ["System"],
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/HealthStatus" } },
            },
          },
        },
      },
    },
    "/api/public/geo": {
      get: {
        summary: "Detect visitor country/currency",
        description: "يقرأ رأس Cloudflare `CF-IPCountry` ويُرجع الدولة والعملة والفئة السعرية.",
        tags: ["System"],
        responses: {
          "200": {
            description: "Detected geo info",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/GeoInfo" } },
            },
          },
        },
      },
    },
    "/api/public/v1/zakat-calc": {
      post: {
        summary: "Calculate Zakat (v1 — versioned, rule-catalog-verified)",
        description:
          "نواة الحساب المعتمدة v1: تحقق zod صارم، تحقق من كتالوج القواعد الشرعية المفعّلة لكل بند، بصمة محتوى SHA-256 قابلة للتحقق لاحقاً عبر /verify. يختلف عن /api/public/calc (v0 المبسّط) بغلاف الخطأ الموحَّد (أكواد ZKT-xxxx) وبربط كل بند بقاعدة شرعية صريحة.",
        tags: ["Calculation v1"],
        security: [{ ApiKeyBearer: [] }, { ApiKeyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ZakatCalcV1Input" } },
          },
        },
        responses: {
          "200": {
            description: "Certified or preliminary result — see rules.status",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ZakatCalcV1Result" } },
            },
          },
          "401": {
            description:
              "Missing/invalid/revoked API key, or key lacks required scope (ZKT-1020..1023)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/V1ErrorEnvelope" } },
            },
          },
          "422": {
            description: "Validation failed — see error.details (ZKT-1010)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/V1ErrorEnvelope" } },
            },
          },
          "429": {
            description: "Rate limit exceeded (ZKT-1040)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/V1ErrorEnvelope" } },
            },
          },
        },
      },
    },
    "/api/public/v1/verify": {
      post: {
        summary: "Re-derive and verify a previous v1 result's content hash",
        description:
          "يعيد حساب نفس المدخلات (body.input) ويقارن بصمة SHA-256 الناتجة مع body.contentHash المُقدَّم — يثبت أن نتيجة سابقة لم تُعدَّل.",
        tags: ["Calculation v1"],
        security: [{ ApiKeyBearer: [] }, { ApiKeyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/V1VerifyInput" } },
          },
        },
        responses: {
          "200": {
            description: "Verification result (matched: true/false)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/V1VerifyResult" } },
            },
          },
          "401": {
            description:
              "Missing/invalid/revoked API key, or key lacks required scope (ZKT-1020..1023)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/V1ErrorEnvelope" } },
            },
          },
          "422": {
            description: "Validation failed (ZKT-1010 / ZKT-1030)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/V1ErrorEnvelope" } },
            },
          },
        },
      },
    },
    "/api/public/v1/rules": {
      get: {
        summary: "List the active Sharia rules catalog",
        description:
          "يعرض كل قواعد الفتوى المفعّلة التي تحكم بنود /v1/zakat-calc — رقم القاعدة، المصدر، حالة التفعيل، وإصدار الكتالوج (RULES_CATALOG_VERSION).",
        tags: ["Calculation v1"],
        responses: {
          "200": {
            description: "Active rules catalog",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/RulesCatalog" } },
            },
          },
        },
      },
    },
    "/api/public/erp/webhook": {
      post: {
        summary: "iPaaS webhook receiver (HMAC-signed)",
        description:
          "يستقبل أحداث Zapier/Make/n8n بعد التحقق من HMAC-SHA256 على `${timestamp}.${body}` مع نافذة صلاحية 5 دقائق لمنع Replay.",
        tags: ["ERP"],
        parameters: [
          { name: "X-Signature", in: "header", required: true, schema: { type: "string" } },
          {
            name: "X-Signature-Timestamp",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "202": { description: "Accepted" },
          "401": { description: "Invalid signature or stale timestamp" },
          "503": { description: "Webhook secret not configured" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyBearer: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "nsb_live_...",
        description:
          "مفتاح API يُنشأ من /developers، يبدأ بـnsb_live_. مطلوب لـv1/zakat-calc وv1/verify فقط — v1/rules عام بلا مفتاح.",
      },
      ApiKeyHeader: {
        type: "apiKey",
        in: "header",
        name: "X-Api-Key",
        description: "بديل عن Authorization: Bearer — نفس المفتاح، ترويسة مختلفة.",
      },
    },
    schemas: {
      CalcInput: {
        type: "object",
        required: ["assets"],
        properties: {
          assets: { type: "number", description: "إجمالي الأصول الزكوية", minimum: 0 },
          liabilities: {
            type: "number",
            description: "الديون قصيرة الأجل",
            minimum: 0,
            default: 0,
          },
          nisab: { type: "number", description: "قيمة النصاب بالعملة المحلية", minimum: 0 },
          rate: { type: "number", description: "معدل الزكاة (اختياري)", minimum: 0, maximum: 1 },
          calendar: { enum: ["hijri", "gregorian"], default: "hijri" },
        },
      },
      CalcResult: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          net_assets: { type: "number" },
          eligible: { type: "boolean" },
          zakat_due: { type: "number" },
          standard: { type: "string", example: "AAOIFI 35" },
          note: { type: "string" },
          generated_at: { type: "string", format: "date-time" },
        },
      },
      Nisab: {
        type: "object",
        properties: {
          gold: {
            type: "object",
            properties: {
              grams: { type: "number" },
              price_usd: { type: "number" },
              value_usd: { type: "number" },
            },
          },
          silver: {
            type: "object",
            properties: {
              grams: { type: "number" },
              price_usd: { type: "number" },
              value_usd: { type: "number" },
            },
          },
        },
      },
      PriceHistory: {
        type: "object",
        properties: {
          metal: { type: "string" },
          count: { type: "integer" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                price_date: { type: "string", format: "date" },
                price_usd_per_gram: { type: "number" },
                source: { type: "string" },
                reliability: { enum: ["direct", "derived", "estimated"] },
              },
            },
          },
        },
      },
      HealthStatus: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          service: { type: "string" },
          version: { type: "string" },
          uptime_ms: { type: "integer" },
          time: { type: "string", format: "date-time" },
          runtime: { type: "string" },
          checks: { type: "object", additionalProperties: { type: "string" } },
        },
      },
      GeoInfo: {
        type: "object",
        properties: {
          code: { type: "string", nullable: true, description: "ISO 3166-1 alpha-2" },
          tier: { type: "string" },
          currency: { type: "string" },
          name: { type: "string" },
          nameAr: { type: "string" },
          flag: { type: "string" },
          locale: { type: "string" },
        },
      },
      ZakatCalcV1Input: {
        type: "object",
        required: ["goldPricePerGram24", "silverPricePerGramPure"],
        description: "strict schema — أي حقل غير معرَّف هنا يُرفَض (ZKT-1010).",
        properties: {
          currency: { type: "string", pattern: "^[A-Za-z]{3}$", default: "USD" },
          calendar: { enum: ["hijri", "gregorian"], default: "hijri" },
          nisabBasis: { enum: ["gold", "silver"], default: "silver" },
          hawlComplete: { type: "boolean", default: true },
          goldPricePerGram24: { type: "number", exclusiveMinimum: 0 },
          silverPricePerGramPure: { type: "number", exclusiveMinimum: 0 },
          cashAndBank: { type: "number", minimum: 0, default: 0 },
          tradeInventory: { type: "number", minimum: 0, default: 0 },
          tradeReceivables: { type: "number", minimum: 0, default: 0 },
          stocksTrading: { type: "number", minimum: 0, default: 0 },
          stocksLongTermZakatable: { type: "number", minimum: 0, default: 0 },
          goldGrams24: { type: "number", minimum: 0, default: 0 },
          silverGramsPure: { type: "number", minimum: 0, default: 0 },
          cryptoAssets: { type: "number", minimum: 0, default: 0 },
          shortTermLiabilities: { type: "number", minimum: 0, default: 0 },
          priceProvider: { type: "string", default: "client-supplied" },
          pricesCapturedAt: { type: "string", format: "date-time" },
        },
      },
      ZakatCalcV1Result: {
        type: "object",
        properties: {
          apiVersion: { const: "v1" },
          status: { const: "success" },
          compliance: { type: "string", example: "AAOIFI Standard 35 & FAS 9" },
          data: {
            type: "object",
            description: "تفصيل الوعاء والزكاة المحسوبة — انظر /developers لمخطط كامل.",
            additionalProperties: true,
          },
          rules: {
            type: "object",
            properties: {
              certified: {
                type: "boolean",
                description: "false يعني نتيجة مبدئية — راجع rules.failures",
              },
              catalogVersion: { type: "string" },
              requiresHumanReview: { type: "boolean" },
              failures: { type: "array", items: { $ref: "#/components/schemas/V1ErrorDetail" } },
            },
            additionalProperties: true,
          },
          certificate: {
            type: "object",
            properties: {
              contentHash: { type: "string", description: "SHA-256 — استخدمه لاحقاً مع /verify" },
              issuedAt: { type: "string", format: "date-time" },
            },
            additionalProperties: true,
          },
          requestId: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      V1ErrorDetail: {
        type: "object",
        properties: {
          code: { type: "string", example: "ZKT-1010" },
          type: { type: "string" },
          message: { type: "string" },
          severity: { enum: ["error", "warning"] },
          field: { type: "string" },
          ruleId: { type: "string" },
          reasons: { type: "array", items: { type: "string" } },
          remediation: { type: "string" },
        },
      },
      V1ErrorEnvelope: {
        type: "object",
        properties: {
          apiVersion: { const: "v1" },
          status: { const: "error" },
          code: { type: "integer", description: "رمز HTTP" },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "ZKT-1010" },
              type: { type: "string" },
              httpStatus: { type: "integer" },
              message: { type: "string" },
              messageEn: { type: "string" },
              details: { type: "array", items: { $ref: "#/components/schemas/V1ErrorDetail" } },
              docs: { type: "string", format: "uri" },
            },
          },
          requestId: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      V1VerifyInput: {
        type: "object",
        required: ["input", "contentHash"],
        properties: {
          input: { $ref: "#/components/schemas/ZakatCalcV1Input" },
          contentHash: { type: "string", description: "بصمة SHA-256 من استجابة سابقة" },
          issuedAt: { type: "string", format: "date-time" },
        },
      },
      V1VerifyResult: {
        type: "object",
        properties: {
          apiVersion: { const: "v1" },
          status: { const: "success" },
          matched: { type: "boolean" },
          recomputedHash: { type: "string" },
        },
      },
      RulesCatalog: {
        type: "object",
        properties: {
          apiVersion: { const: "v1" },
          catalogVersion: { type: "string" },
          rules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ruleId: { type: "string" },
                name: { type: "string" },
                assetType: { type: "string" },
                reference: { type: "string" },
                requiresHumanReview: { type: "boolean" },
              },
              additionalProperties: true,
            },
          },
          errorCodes: {
            type: "array",
            items: { type: "object", additionalProperties: true },
            description: "كتالوج أكواد ZKT-xxxx كاملاً — من listV1ErrorCodes()",
          },
        },
      },
      ErpJournalInput: {
        type: "object",
        required: ["entity_name", "currency", "zakat_due", "period_start", "period_end"],
        properties: {
          entity_name: { type: "string" },
          entity_id: { type: "string" },
          reference: { type: "string" },
          currency: { type: "string", example: "SAR" },
          zakat_due: { type: "number", minimum: 0 },
          base_amount: { type: "number", minimum: 0 },
          rate: { type: "number", example: 0.025 },
          period_start: { type: "string", format: "date" },
          period_end: { type: "string", format: "date" },
          jurisdiction: { type: "string", example: "SA" },
          fatwa_authority: { type: "string", example: "AAOIFI-35" },
          memo: { type: "string" },
        },
      },
    },
  },
  tags: [
    { name: "Calculation", description: "حسابات الزكاة (v0 مبسّط)" },
    {
      name: "Calculation v1",
      description:
        "واجهة v1 المعتمَدة: تحقق zod صارم، كتالوج قواعد شرعية، شهادة SHA-256 قابلة للتحقق",
    },
    { name: "Reference Data", description: "بيانات مرجعية (نصاب، أسعار)" },
    { name: "ERP", description: "تكامل ERP وiPaaS" },
    { name: "System", description: "الحالة والتشخيص" },
  ],
  "x-jurisdictions": ["SA", "AE", "EG", "KW", "MY", "PK", "GB", "US", "ID"],
  "x-madhabs": ["hanafi", "maliki", "shafii", "hanbali"],
};

export const Route = createFileRoute("/api/public/openapi")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => new Response(JSON.stringify(SPEC, null, 2), { headers: CORS }),
    },
  },
});
