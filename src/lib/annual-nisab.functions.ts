import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { COUNTRIES } from "./countries";
import { annualRequestSchema, historicalDue, historicalValuation, personalCalculationSchema, yearOf, yearWindow } from "./annual-nisab";

export const getAnnualNisab = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => annualRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const { publicDb } = await import("./public-api.server");
    const db = publicDb();
    const currency = COUNTRIES.find((c) => c.code === data.country)?.currency;
    if (!currency) throw new Error("Invalid country");
    const today = new Date().toISOString().slice(0, 10);
    const year = data.year ?? yearOf(today, data.calendar);
    const window = yearWindow(year, data.calendar);
    const [rows, first] = await Promise.all([
      db.from("nisab_history").select("id,day,country,currency,gold_gram,silver_gram,gold_nisab,silver_nisab,source")
        .eq("country", data.country).eq("currency", currency).gte("day", window.start).lt("day", window.end).lte("day", today).order("day").limit(400),
      db.from("nisab_history").select("day").eq("country", data.country).eq("currency", currency).order("day").limit(1),
    ]);
    if (rows.error || first.error) throw new Error("Could not load historical prices");
    return { rows: rows.data ?? [], firstDay: first.data?.[0]?.day ?? null, year, today, currency };
  });

export const saveHistoricalCalculation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => personalCalculationSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("nisab_history")
      .select("id,day,country,currency,gold_gram,silver_gram,gold_nisab,silver_nisab,source").eq("id", data.historyId).single();
    if (error || !row || row.day > new Date().toISOString().slice(0, 10)) throw new Error("Historical day unavailable");
    const valuation = historicalValuation(row, data.metal, data.silverWeight);
    if (!valuation) throw new Error("Historical metal price unavailable");
    const { due, rate } = historicalDue(data.netWealth, valuation.threshold, data.basis);
    const { data: saved, error: saveError } = await context.supabase.from("personal_zakat_calculations").insert({
      user_id: context.userId, history_id: row.id, valuation_day: row.day, country: row.country, currency: row.currency,
      metal: data.metal, weight_grams: valuation.weight, price_gram: valuation.gram, nisab_threshold: valuation.threshold,
      net_wealth: data.netWealth, year_basis: data.basis, zakat_rate: rate, zakat_due: due, price_source: row.source ?? "",
    }).select("id").single();
    if (saveError || !saved) throw new Error("Could not save personal calculation");
    return saved;
  });

export const getHistoricalCalculations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("personal_zakat_calculations")
      .select("id,valuation_day,country,currency,metal,weight_grams,price_gram,nisab_threshold,net_wealth,year_basis,zakat_rate,zakat_due,price_source,created_at")
      .eq("user_id", context.userId).order("valuation_day", { ascending: false }).limit(100);
    if (error) throw new Error("Could not load personal calculations");
    return data ?? [];
  });