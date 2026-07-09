import { createFileRoute } from "@tanstack/react-router";

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
  servers: [
    {
      url: "https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app",
      description: "Production",
    },
    {
      url: "https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce-dev.lovable.app",
      description: "Preview",
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
    { name: "Calculation", description: "حسابات الزكاة" },
    { name: "Reference Data", description: "بيانات مرجعية (نصاب، أسعار)" },
    { name: "ERP", description: "تكامل ERP وiPaaS" },
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
