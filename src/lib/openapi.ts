/**
 * OpenAPI description of the public read-only API. Pure, no I/O.
 * Only fields the handlers actually return are described; the signed bulletin's payload format
 * is named by its own `schema` field rather than redefined here.
 */
const country = {
  name: "country",
  in: "query",
  required: true,
  description: "ISO 3166-1 alpha-2 country code, e.g. EG.",
  schema: { type: "string", pattern: "^[A-Za-z]{2}$" },
} as const;

const standard = {
  name: "standard",
  in: "query",
  required: false,
  description:
    "default = 85 g gold and 595 g silver. tola = 87.48 g gold and 612.36 g silver (the Hanafi South Asian pair).",
  schema: { type: "string", enum: ["default", "tola"], default: "default" },
} as const;

const errors = {
  "400": { description: "Invalid query." },
  "404": { description: "Unknown country or no exchange rate for its currency." },
  "503": { description: "Price sources temporarily unavailable." },
} as const;

const jsonBody = (description: string) => ({
  description,
  content: { "application/json": { schema: { type: "object" } } },
});

export const HISTORY_RANGES = [
  "1mo",
  "6mo",
  "1y",
  "5y",
  "10y",
  "20y",
  "30y",
  "40y",
  "50y",
  "75y",
  "100y",
  "1000y",
] as const;

export function buildOpenApi(origin: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "Nisab public API",
      version: "1",
      description:
        "Indicative nisab figures, not a fatwa. Read-only, CORS-open, cached for 15 minutes. The signed bulletin is the form to verify offline.",
    },
    servers: [{ url: origin }],
    paths: {
      "/api/public/v1/nisab": {
        get: {
          summary: "Today's nisab for a country",
          description:
            "Market, local-jeweller and official figures with their sources and the consensus status of the metal quotes.",
          parameters: [country, standard],
          responses: { "200": jsonBody("Nisab figures."), ...errors },
        },
      },
      "/api/public/v1/nisab/at": {
        get: {
          summary: "Nisab on a past date",
          parameters: [
            country,
            {
              name: "at",
              in: "query",
              required: true,
              description: "Date or timestamp, 8 to 40 characters.",
              schema: { type: "string", minLength: 8, maxLength: 40 },
            },
            standard,
          ],
          responses: { "200": jsonBody("Nisab on that date."), ...errors },
        },
      },
      "/api/public/v1/nisab/history": {
        get: {
          summary: "Nisab history",
          parameters: [
            country,
            {
              name: "range",
              in: "query",
              required: false,
              schema: { type: "string", enum: [...HISTORY_RANGES], default: "1y" },
            },
            {
              name: "date",
              in: "query",
              required: false,
              description: "A single day, YYYY-MM-DD.",
              schema: { type: "string", format: "date" },
            },
          ],
          responses: { "200": jsonBody("History points."), ...errors },
        },
      },
      "/api/public/v1/nisab/snapshot": {
        get: {
          summary: "Immutable daily raw price snapshot",
          description:
            "USD per ounce, exchange rates and source agreement. Latest when no day is given.",
          parameters: [
            {
              name: "day",
              in: "query",
              required: false,
              description: "UTC day, YYYY-MM-DD.",
              schema: { type: "string", format: "date" },
            },
          ],
          responses: { "200": jsonBody("The snapshot."), "404": { description: "No snapshot." } },
        },
      },
      "/api/public/v1/nisab/bulletin": {
        get: {
          summary: "Signed bulletin of the latest snapshot",
          description:
            "Verify the signature over the payload text exactly as returned. Answers 503 rather than an unsigned reply when signing is unavailable.",
          responses: {
            "200": jsonBody("Signed bulletin."),
            "503": { description: "Signing unavailable." },
          },
        },
      },
      "/api/public/v1/nisab/csv": {
        get: {
          summary: "One CSV row for spreadsheets",
          description: 'For example =IMPORTDATA("<origin>/api/public/v1/nisab/csv?country=EG").',
          parameters: [country],
          responses: {
            "200": {
              description: "CSV text.",
              content: { "text/csv": { schema: { type: "string" } } },
            },
            ...errors,
          },
        },
      },
    },
  } as const;
}
