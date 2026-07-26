import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";
import { resolveRuling, type Jurisdiction, type Madhab } from "@/lib/fatwaEngine";
import { GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS, ZAKAT_RATE, ZAKAT_RATE_GREGORIAN } from "@/lib/zakat";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json; charset=utf-8",
};

export const Route = createFileRoute("/api/public/v1/zakat-calc")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const rl = await rateLimit(request, { key: "zakat-calc-v1", limit: 60, windowMs: 60_000 });
        if (!rl.ok) return rateLimitResponse(rl.retryAfter, CORS);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(
            JSON.stringify({
              status: "error",
              code: 400,
              error: "invalid_json_payload",
              message: "Invalid JSON format provided.",
            }),
            { status: 400, headers: CORS }
          );
        }

        const b = (body ?? {}) as Record<string, any>;
        const currency = String(b.currency || "USD").toUpperCase();
        const calendar = String(b.calendar || "hijri").toLowerCase() === "gregorian" ? "gregorian" : "hijri";
        const rate = calendar === "gregorian" ? ZAKAT_RATE_GREGORIAN : ZAKAT_RATE;

        // أسعار المعادن
        const goldPriceGram24 = Number(b.goldPricePerGram24 || 75);
        const silverPriceGramPure = Number(b.silverPricePerGramPure || 0.9);

        // حساب الأنصبة
        const goldNisabValue = GOLD_NISAB_GRAMS * goldPriceGram24;
        const silverNisabValue = SILVER_NISAB_GRAMS * silverPriceGramPure;
        const nisabBasis = String(b.nisabBasis || "silver").toLowerCase() === "gold" ? "gold" : "silver";
        const effectiveNisab = nisabBasis === "gold" ? goldNisabValue : silverNisabValue;

        // الأصول
        const cashAndBank = Math.max(0, Number(b.cashAndBank || 0));
        const tradeInventory = Math.max(0, Number(b.tradeInventory || 0));
        const tradeReceivables = Math.max(0, Number(b.tradeReceivables || 0));
        const stocksTrading = Math.max(0, Number(b.stocksTrading || 0));
        const stocksLongTermZakatable = Math.max(0, Number(b.stocksLongTermZakatable || 0));
        const goldGrams24 = Math.max(0, Number(b.goldGrams24 || 0));
        const silverGramsPure = Math.max(0, Number(b.silverGramsPure || 0));
        const cryptoAssets = Math.max(0, Number(b.cryptoAssets || 0));

        // حساب قيم المعادن
        const goldValue = goldGrams24 * goldPriceGram24;
        const silverValue = silverGramsPure * silverPriceGramPure;

        // إجمالي الأصول الزكوية
        const totalZakatableAssets =
          cashAndBank +
          tradeInventory +
          tradeReceivables +
          stocksTrading +
          stocksLongTermZakatable +
          goldValue +
          silverValue +
          cryptoAssets;

        // الخصوم والديون الحالة
        const shortTermLiabilities = Math.max(0, Number(b.shortTermLiabilities || 0));

        // صافي الوعاء الزكوي (AAOIFI 35)
        const netZakatBase = Math.max(0, totalZakatableAssets - shortTermLiabilities);
        const reachesNisab = netZakatBase >= effectiveNisab;
        const zakatDue = reachesNisab ? +(netZakatBase * rate).toFixed(2) : 0;

        // جلب مرجع الفتوى
        const jurisdiction = typeof b.jurisdiction === "string" ? (b.jurisdiction as Jurisdiction) : undefined;
        const madhab = typeof b.madhab === "string" ? (b.madhab as Madhab) : undefined;
        const ruling = resolveRuling({ topic: "zakat.corporate.base", jurisdiction, madhab });

        return new Response(
          JSON.stringify({
            status: "success",
            compliance: "AAOIFI Standard 35 & FAS 9 Compliant",
            data: {
              currency,
              calendar,
              ratePercent: +(rate * 100).toFixed(3),
              nisab: {
                basis: nisabBasis,
                goldNisabValue: +goldNisabValue.toFixed(2),
                silverNisabValue: +silverNisabValue.toFixed(2),
                effectiveNisab: +effectiveNisab.toFixed(2),
              },
              breakdown: {
                cashAndBank,
                tradeInventory,
                tradeReceivables,
                stocksTrading,
                stocksLongTermZakatable,
                goldValue: +goldValue.toFixed(2),
                silverValue: +silverValue.toFixed(2),
                cryptoAssets,
                totalZakatableAssets: +totalZakatableAssets.toFixed(2),
                shortTermLiabilities,
                netZakatBase: +netZakatBase.toFixed(2),
              },
              assessment: {
                reachesNisab,
                zakatDue,
              },
              fatwaRef: ruling
                ? {
                    id: ruling.id,
                    authority: ruling.authority,
                    basis: ruling.basis,
                    summary: ruling.evidence ?? ruling.notes ?? null,
                  }
                : null,
            },
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: CORS }
        );
      },
    },
  },
});
