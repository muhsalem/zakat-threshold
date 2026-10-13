import { fetchRawLivePrices } from "./prices.functions";
import { GOLD_NISAB_G, KARATS, SILVER_NISAB_G, TROY_OUNCE_G } from "./nisab";
import { COUNTRIES, findCountry } from "./countries";
import { ISLAMIC_CHRONOLOGY } from "./islamic-chronology";

export async function handlePublicApi(url: URL): Promise<Response | null> {
  const path = url.pathname;

  // Set up standard CORS headers
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    "Cache-Control": "public, s-maxage=1800, max-age=1800",
  };

  // Handle API v1 Nisab
  if (path === "/api/v1/nisab" || path === "/api/v1/nisab/today" || path === "/api/nisab") {
    try {
      const live = await fetchRawLivePrices();
      const countryCode = (url.searchParams.get("country") || "SA").toUpperCase();
      const countryObj = findCountry(countryCode);
      const requestedCurrency = (
        url.searchParams.get("currency") ||
        countryObj?.currency ||
        "SAR"
      ).toUpperCase();

      const rate = live.rates[requestedCurrency] ?? 1;
      const goldPerGram = (live.goldUsdOz / TROY_OUNCE_G) * rate;
      const silverPerGram = (live.silverUsdOz / TROY_OUNCE_G) * rate;

      const goldNisab = goldPerGram * GOLD_NISAB_G;
      const silverNisab = silverPerGram * SILVER_NISAB_G;
      const ratio = live.goldUsdOz / live.silverUsdOz;

      const karatsBreakdown: Record<string, number> = {};
      for (const k of KARATS) {
        karatsBreakdown[`${k.k}K`] = Number((goldPerGram * k.purity).toFixed(2));
      }

      // Check if CSV format requested (ideal for Excel / Google Sheets =IMPORTDATA)
      if (url.searchParams.get("format") === "csv" || path.endsWith("/csv")) {
        const csvContent = [
          "currency,country,gold_nisab_value,silver_nisab_value,recommended_lower,gold_gram_24k,gold_gram_21k,silver_gram,ratio,updated_at",
          `${requestedCurrency},${countryCode},${goldNisab.toFixed(2)},${silverNisab.toFixed(2)},${Math.min(goldNisab, silverNisab).toFixed(2)},${goldPerGram.toFixed(2)},${(goldPerGram * 0.875).toFixed(2)},${silverPerGram.toFixed(2)},${ratio.toFixed(2)},${live.metalsUpdatedAt}`,
        ].join("\n");

        return new Response(csvContent, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `inline; filename="nisab-${requestedCurrency}.csv"`,
          },
        });
      }

      const responsePayload = {
        status: "success",
        platform: "Nisab Open Zakat API (وقف رقمي)",
        version: "v1.0",
        data: {
          currency: requestedCurrency,
          country: countryCode,
          exchangeRateToUsd: rate,
          metals: {
            goldUsdOz: live.goldUsdOz,
            silverUsdOz: live.silverUsdOz,
            goldGram24k: Number(goldPerGram.toFixed(2)),
            silverGramPure: Number(silverPerGram.toFixed(2)),
          },
          nisab: {
            gold: {
              grams: GOLD_NISAB_G,
              carat: 24,
              value: Number(goldNisab.toFixed(2)),
              currency: requestedCurrency,
            },
            silver: {
              grams: SILVER_NISAB_G,
              value: Number(silverNisab.toFixed(2)),
              currency: requestedCurrency,
            },
            recommendedLowerNisab: Number(Math.min(goldNisab, silverNisab).toFixed(2)),
            recommendedStandard: "silver",
            noteAr:
              "يُرجح جمهور الفقهاء الأخذ بنصاب الفضة في الأوراق النقدية لأنه الأحظ للفقراء والمساكين.",
          },
          karats: karatsBreakdown,
          goldToSilverRatio: Number(ratio.toFixed(2)),
          timestamps: {
            metalsUpdatedAt: live.metalsUpdatedAt,
            ratesUpdatedAt: live.ratesUpdatedAt,
            fetchedAt: live.fetchedAt,
          },
          sources: {
            metals: live.metalsSource,
            fx: live.ratesSource,
          },
        },
      };

      return new Response(JSON.stringify(responsePayload, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Failed to fetch live prices",
          error: String(err),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  // Handle CSV endpoint directly
  if (path === "/api/v1/nisab/csv") {
    try {
      const live = await fetchRawLivePrices();
      const requestedCurrency = (url.searchParams.get("currency") || "SAR").toUpperCase();
      const rate = live.rates[requestedCurrency] ?? 1;
      const goldPerGram = (live.goldUsdOz / TROY_OUNCE_G) * rate;
      const silverPerGram = (live.silverUsdOz / TROY_OUNCE_G) * rate;
      const goldNisab = goldPerGram * GOLD_NISAB_G;
      const silverNisab = silverPerGram * SILVER_NISAB_G;

      const csvContent = [
        "property,value",
        `currency,${requestedCurrency}`,
        `gold_nisab,${goldNisab.toFixed(2)}`,
        `silver_nisab,${silverNisab.toFixed(2)}`,
        `lower_nisab,${Math.min(goldNisab, silverNisab).toFixed(2)}`,
        `gold_24k_gram,${goldPerGram.toFixed(2)}`,
        `gold_21k_gram,${(goldPerGram * 0.875).toFixed(2)}`,
        `silver_gram,${silverPerGram.toFixed(2)}`,
        `ratio,${(live.goldUsdOz / live.silverUsdOz).toFixed(2)}`,
      ].join("\n");

      return new Response(csvContent, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv; charset=utf-8",
        },
      });
    } catch {
      return new Response("error,failed", { status: 500, headers: corsHeaders });
    }
  }

  // Handle Islamic Chronology Historical Reference endpoint
  if (path === "/api/v1/nisab/chronology" || path === "/api/chronology") {
    return new Response(
      JSON.stringify(
        {
          status: "success",
          platform: "المرجع التاريخي لأنصبة الزكاة والنقدين (2 هـ - 1448 هـ)",
          totalMilestones: ISLAMIC_CHRONOLOGY.length,
          data: ISLAMIC_CHRONOLOGY,
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  }

  // Handle All Countries Live Directory for ERPs
  if (path === "/api/v1/nisab/all-countries") {
    try {
      const live = await fetchRawLivePrices();
      const countriesList = COUNTRIES.map((c) => {
        const rate = live.rates[c.currency] ?? 1;
        const goldPerGram = (live.goldUsdOz / TROY_OUNCE_G) * rate;
        const silverPerGram = (live.silverUsdOz / TROY_OUNCE_G) * rate;
        return {
          code: c.code,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
          currency: c.currency,
          goldNisab: Number((goldPerGram * GOLD_NISAB_G).toFixed(2)),
          silverNisab: Number((silverPerGram * SILVER_NISAB_G).toFixed(2)),
          goldGram24k: Number(goldPerGram.toFixed(2)),
          goldGram21k: Number((goldPerGram * 0.875).toFixed(2)),
          silverGram: Number(silverPerGram.toFixed(2)),
        };
      });

      return new Response(
        JSON.stringify(
          {
            status: "success",
            timestamp: live.metalsUpdatedAt,
            count: countriesList.length,
            countries: countriesList,
          },
          null,
          2,
        ),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
          },
        },
      );
    } catch (err) {
      return new Response(JSON.stringify({ status: "error", error: String(err) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return null;
}
